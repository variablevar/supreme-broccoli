import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import {
  ERC20_TRANSFER_TOPIC,
  topicToAddress,
  topicToUint,
  formatUnits,
  USDT_ETHEREUM,
} from '@/lib/web3/evm';

// Prefer the operator's Ankr Premium RPC if ANKR_ETH_RPC_URL is set.
// Falls back to public Cloudflare + Llama RPCs otherwise.
const ANKR = process.env.ANKR_ETH_RPC_URL;
const PUBLIC_RPCS = [
  ...(ANKR ? [ANKR] : []),
  'https://cloudflare-eth.com',
  'https://eth.llamarpc.com',
];

const REQUIRED_CONFIRMATIONS = 12;

interface TxReceipt {
  status: '0x1' | '0x0';
  blockNumber: string;
  confirmations: number;
  logs: Array<{ address: string; topics: string[]; data: string }>;
}

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  let lastError: unknown = null;
  for (const url of PUBLIC_RPCS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (!r.ok) { lastError = new Error(`${url} HTTP ${r.status}`); continue; }
      const j = (await r.json()) as { result?: unknown; error?: { message: string } };
      if (j.error) { lastError = new Error(`${url}: ${j.error.message}`); continue; }
      return j.result;
    } catch (err) { lastError = err; }
  }
  throw lastError ?? new Error('all RPCs failed');
}

async function fetchReceipt(txHash: string): Promise<TxReceipt | null> {
  const r = await rpc('eth_getTransactionReceipt', [txHash]);
  return (r as TxReceipt | null) ?? null;
}

async function fetchBlockNumber(): Promise<number> {
  const r = await rpc('eth_blockNumber', []);
  if (typeof r === 'string') return parseInt(r, 16);
  return 0;
}

/**
 * GET /api/payouts/verify
 *
 * Walk every payout_dispatches row with network='ERC20' or
 * 'TRC20' and an external_tx_hash, look up the on-chain receipt
 * for Ethereum (TRC20 is out of scope for this iteration),
 * verify an ERC-20 Transfer event landed at the expected
 * destination with the expected amount, and stamp confirmed_at
 * once ≥ 12 confirmations have elapsed.
 */
export async function GET(req: Request) {
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  const customer = jar.get('imnoshi_customer_session')?.value;
  const admin = jar.get('imnoshi_admin_session')?.value;
  const bearer = req.headers.get('authorization');
  if (!customer && !admin && !bearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: payouts, error } = await supabase
    .from('payout_dispatches')
    .select('id, user_id, network, destination, amount_usdt, external_tx_hash, confirmed_at, executed_at')
    .in('network', ['ERC20'])
    .not('external_tx_hash', 'is', null)
    .limit(50);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{
    id: string;
    txHash: string;
    status: 'pending' | 'confirmed' | 'failed' | 'mismatch';
    details: string;
    confirmations?: number;
  }> = [];

  let headBlock = 0;
  try {
    headBlock = await fetchBlockNumber();
  } catch (err) {
    return NextResponse.json({
      headBlock: 0,
      rpcError: err instanceof Error ? err.message : 'rpc_unavailable',
      results: (payouts ?? []).map((p) => ({
        id: p.id,
        txHash: p.external_tx_hash ?? '',
        status: 'pending' as const,
        details: 'rpc_unavailable',
      })),
    });
  }

  for (const p of payouts ?? []) {
    const txHash = p.external_tx_hash;
    if (!txHash) continue;
    try {
      const rcpt = await fetchReceipt(txHash);
      if (!rcpt) {
        results.push({ id: p.id, txHash, status: 'pending', details: 'tx not found yet' });
        continue;
      }
      if (rcpt.status !== '0x1') {
        results.push({ id: p.id, txHash, status: 'failed', details: 'tx reverted on-chain', confirmations: 0 });
        continue;
      }
      const confirmations = Math.max(0, headBlock - parseInt(rcpt.blockNumber, 16) + 1);

      let matched: { valueRaw: bigint; to: string } | null = null;
      for (const log of rcpt.logs) {
        if (log.address.toLowerCase() !== USDT_ETHEREUM.contract.toLowerCase()) continue;
        if (log.topics[0]?.toLowerCase() !== ERC20_TRANSFER_TOPIC) continue;
        const to = topicToAddress(log.topics[2] ?? '');
        if (to !== p.destination.toLowerCase()) continue;
        matched = { valueRaw: topicToUint(log.data), to };
        break;
      }
      if (!matched) {
        results.push({ id: p.id, txHash, status: 'mismatch', details: 'no matching ERC-20 Transfer to destination', confirmations });
        continue;
      }
      const expectedRaw = BigInt(Math.round(Number(p.amount_usdt) * 10 ** USDT_ETHEREUM.decimals));
      if (matched.valueRaw < expectedRaw) {
        results.push({
          id: p.id,
          txHash,
          status: 'mismatch',
          details: `transferred ${formatUnits(matched.valueRaw, USDT_ETHEREUM.decimals)} < expected ${formatUnits(expectedRaw, USDT_ETHEREUM.decimals)}`,
          confirmations,
        });
        continue;
      }
      if (confirmations < REQUIRED_CONFIRMATIONS) {
        results.push({
          id: p.id,
          txHash,
          status: 'pending',
          details: `${confirmations}/${REQUIRED_CONFIRMATIONS} confirmations`,
          confirmations,
        });
        continue;
      }
      if (!p.confirmed_at) {
        await supabase
          .from('payout_dispatches')
          .update({ confirmed_at: new Date().toISOString() })
          .eq('id', p.id);
      }
      results.push({
        id: p.id,
        txHash,
        status: 'confirmed',
        details: `confirmed at ${confirmations} confirmations; sent ${formatUnits(matched.valueRaw, USDT_ETHEREUM.decimals)} USDT`,
        confirmations,
      });
    } catch (err) {
      results.push({
        id: p.id,
        txHash,
        status: 'pending',
        details: err instanceof Error ? err.message : 'rpc error',
      });
    }
  }

  return NextResponse.json({ headBlock, results });
}

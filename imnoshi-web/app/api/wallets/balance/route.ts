import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase';
import {
  encodeBalanceOf,
  formatUnits,
  normalizeAddress,
  USDT_ETHEREUM,
} from '@/lib/web3/evm';

interface CacheEntry {
  expiresAt: number;
  payload: {
    address: string;
    nativeEth: string | null;
    usdt: string | null;
    fetchedAt: string;
  };
}

const CACHE_TTL_MS = 30 * 1000;
const cache = new Map<string, CacheEntry>();

// Public RPCs (no API key needed). We probe a few in order so a single
// provider hiccup doesn't break the dashboard.
// Prefer the operator's Ankr Premium RPC if ANKR_ETH_RPC_URL is set.
// Falls back to public Cloudflare + Llama RPCs otherwise.
const ANKR = process.env.ANKR_ETH_RPC_URL;
const PUBLIC_RPCS = [
  ...(ANKR ? [ANKR] : []),
  'https://cloudflare-eth.com',
  'https://eth.llamarpc.com',
];

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  let lastError: unknown = null;
  for (const url of PUBLIC_RPCS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (!r.ok) {
        lastError = new Error(`${url} HTTP ${r.status}`);
        continue;
      }
      const j = (await r.json()) as { result?: unknown; error?: { message: string } };
      if (j.error) {
        lastError = new Error(`${url}: ${j.error.message}`);
        continue;
      }
      return j.result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('all RPCs failed');
}

function addrCacheKey(addr: string): string {
  return crypto.createHash('sha256').update(addr).digest('hex');
}

function addressFromCookies(): string | null {
  // We can't await next/headers at top-level outside a request, so
  // this is a sync-ish helper. Actually it IS async-friendly:
  // import inside the request handler.
  return null;
}

/**
 * GET /api/wallets/balance
 *
 * Reads the current user's connected Ethereum address from
 * public.wallets (symbol='ETH'), then queries public RPCs for
 * native ETH and ERC-20 USDT balances.
 *
 * Cached 30 s per address to keep us under free-tier rate limits.
 */
export async function GET() {
  // Customer auth is cookie-based (imnoshi_customer_session). See
  // lib/customerAuth.ts for the encoding. We do the read here
  // rather than importing the helper to avoid a circular
  // dep with the lib that exposes cookies().
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  const raw = jar.get('imnoshi_customer_session')?.value;
  if (!raw) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userEmail: string | null = null;
  try {
    const sess = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8')
    ) as { email?: string; exp?: number };
    if (sess.email && sess.exp && sess.exp > Date.now()) {
      userEmail = sess.email;
    }
  } catch {
    // fallthrough
  }
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('email', userEmail.toLowerCase())
    .maybeSingle();
  if (!userRow) {
    return NextResponse.json({ error: 'User not provisioned' }, { status: 404 });
  }

  const { data: wallet } = await supabase
    .from('wallets')
    .select('address, chain')
    .eq('user_id', userRow.id)
    .eq('symbol', 'ETH')
    .maybeSingle();
  if (!wallet?.address) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }

  const address = normalizeAddress(wallet.address);
  if (!address) {
    return NextResponse.json({ error: 'Stored address invalid' }, { status: 500 });
  }

  const key = addrCacheKey(address);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ connected: true, ...cached.payload });
  }

  let nativeEth: string | null = null;
  let usdt: string | null = null;
  try {
    const [ethBalRaw, usdtBalRaw] = await Promise.all([
      rpc('eth_getBalance', [address, 'latest']),
      rpc('eth_call', [{ to: USDT_ETHEREUM.contract, data: encodeBalanceOf(address) }, 'latest']),
    ]);
    if (typeof ethBalRaw === 'string') nativeEth = formatUnits(BigInt(ethBalRaw), 18);
    if (typeof usdtBalRaw === 'string') usdt = formatUnits(BigInt(usdtBalRaw), USDT_ETHEREUM.decimals);
  } catch (err) {
    if (cached) return NextResponse.json({ connected: true, ...cached.payload, stale: true });
    return NextResponse.json({
      connected: true,
      address,
      nativeEth: null,
      usdt: null,
      error: err instanceof Error ? err.message : 'rpc_unavailable',
      fetchedAt: new Date().toISOString(),
    });
  }

  const payload = {
    address,
    nativeEth,
    usdt,
    fetchedAt: new Date().toISOString(),
  };
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, payload });
  return NextResponse.json({ connected: true, ...payload });
}

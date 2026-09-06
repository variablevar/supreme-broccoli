// On-chain balance lookups via public explorers/RPC endpoints (read-only).

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  return res.json();
}

async function getEvmMainnetBalance(address: string): Promise<number | null> {
  const json = (await getJson('https://cloudflare-eth.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }),
  })) as { result?: string } | null;
  if (!json?.result) return null;
  return parseInt(json.result, 16) / 1e18;
}

async function getSolBalance(address: string): Promise<number | null> {
  const json = (await getJson('https://api.mainnet-beta.solana.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
  })) as { result?: { value?: number } } | null;
  const lamports = json?.result?.value;
  return typeof lamports === 'number' ? lamports / 1e9 : null;
}

// mempool.space-compatible API shape (Bitcoin + Litecoin via Litecoin Space).
async function getUtxoBalance(baseUrl: string, address: string): Promise<number | null> {
  const json = (await getJson(`${baseUrl}/api/address/${address}`)) as {
    chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
  } | null;
  const stats = json?.chain_stats;
  if (!stats) return null;
  return ((stats.funded_txo_sum ?? 0) - (stats.spent_txo_sum ?? 0)) / 1e8;
}

async function getDogeBalance(address: string): Promise<number | null> {
  const json = (await getJson(
    `https://api.blockcypher.com/v1/doge/main/addrs/${address}/balance`
  )) as { balance?: number } | null;
  return typeof json?.balance === 'number' ? json.balance / 1e8 : null;
}

async function getTrxBalance(address: string): Promise<number | null> {
  const json = (await getJson(`https://api.trongrid.io/v1/accounts/${address}`)) as {
    data?: { balance?: number }[];
  } | null;
  const sun = json?.data?.[0]?.balance;
  return typeof sun === 'number' ? sun / 1e6 : null;
}

/**
 * Fetch the real on-chain balance for an address.
 * Returns null when the chain does not support public balance lookups
 * (Monero) or the lookup fails.
 */
export async function getChainBalance(symbol: string, address: string): Promise<number | null> {
  try {
    switch (symbol) {
      case 'BTC':
        return await getUtxoBalance('https://blockstream.info', address);
      case 'ETH':
        return await getEvmMainnetBalance(address);
      case 'SOL':
        return await getSolBalance(address);
      case 'LTC':
        return await getUtxoBalance('https://litecoinspace.org', address);
      case 'DOGE':
        return await getDogeBalance(address);
      case 'TRX':
        return await getTrxBalance(address);
      case 'XMR':
        return null; // Monero balances are not publicly viewable by design
      default:
        return null;
    }
  } catch {
    return null;
  }
}

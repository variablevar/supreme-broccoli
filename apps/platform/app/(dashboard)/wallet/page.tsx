'use client';
import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { getChainBalance } from '@/lib/chain-balance';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CreateWallet } from '@/components/dashboard/wallet/CreateWallet';
import { ConnectWallet } from '@/components/dashboard/wallet/ConnectWallet';
import { Copy, Eye, EyeOff, Pencil, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const PRICE_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  TRX: 'tron',
  XMR: 'monero',
};

export default function WalletPage() {
  const { user, wallets, balance } = useDashboardStore();
  const [balances, setBalances] = useState<Record<string, number | null>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [revealedSeeds, setRevealedSeeds] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draftAddress, setDraftAddress] = useState('');
  const [liveBalance, setLiveBalance] = useState<{
    address: string | null; nativeEth: string | null; usdt: string | null; error?: string;
  }>({ address: null, nativeEth: null, usdt: null });
  useEffect(() => {
    let cancelled = false;
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/wallets/balance", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setLiveBalance(j);
      } catch {}
    };
    fetchBalance();
    const id = setInterval(fetchBalance, 30 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Fetch live on-chain balances for each wallet address.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        wallets.map(async (w) => [w.address, await getChainBalance(w.symbol, w.address)] as const)
      );
      if (!cancelled) setBalances(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [wallets]);

  // Live USD prices for the wallet chains.
  useEffect(() => {
    const ids = Array.from(
      new Set(wallets.map((w) => PRICE_IDS[w.symbol]).filter(Boolean))
    ) as string[];
    if (ids.length === 0) return;
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`)
      .then((r) =>
        r.ok ? (r.json() as Promise<Record<string, { usd?: number }>>) : ({} as Record<string, { usd?: number }>)
      )
      .then((data) => {
        const mapped: Record<string, number> = {};
        for (const [symbol, id] of Object.entries(PRICE_IDS)) {
          const usd = data[id]?.usd;
          if (usd) mapped[symbol] = usd;
        }
        setPrices(mapped);
      })
      .catch(() => {});
  }, [wallets]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const remove = async (address: string, id?: string) => {
    useDashboardStore.getState().removeWallet(address);
    await fetch('/api/wallets', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, address }),
    }).catch(() => {});
    toast.success('Wallet deleted');
  };

  const saveAddress = async (wallet: typeof wallets[number]) => {
    const address = draftAddress.trim();
    if (!address) return;
    if (wallet.id) {
      const res = await fetch('/api/wallets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: wallet.id,
          symbol: wallet.symbol,
          chain: wallet.chain,
          address,
        }),
      });
      if (!res.ok) {
        toast.error('Could not update wallet');
        return;
      }
    }
    useDashboardStore.getState().removeWallet(wallet.address);
    useDashboardStore.getState().addWallet({ ...wallet, address });
    setEditing(null);
    toast.success('Wallet updated');
  };

  return (
    <div className="space-y-8">
      <ConnectWallet initialAddress={liveBalance.address} initialChain="Ethereum" />
      <GlassCard hover={false}>
        <h3 className="font-space font-semibold text-foreground text-xl mb-3">Live balance (Ethereum mainnet)</h3>
        {!liveBalance.address ? (
          <p className="text-sm text-muted-foreground">Connect a wallet above to see your live USDT and ETH balance, updated every 30 s.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">USDT</p>
              <p className="font-space text-3xl font-bold text-foreground mt-1">{liveBalance.usdt ?? "—"} <span className="text-base font-normal text-muted-foreground">USDT</span></p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">ETH</p>
              <p className="font-space text-3xl font-bold text-foreground mt-1">{liveBalance.nativeEth ?? "—"} <span className="text-base font-normal text-muted-foreground">ETH</span></p>
            </div>
            <div className="md:col-span-2 text-xs text-muted-foreground font-mono break-all">{liveBalance.address}{liveBalance.error ? <span className="text-destructive"> — {liveBalance.error}</span> : null}</div>
          </div>
        )}
      </GlassCard>

      <GlassCard hover={false}>
        <h3 className="font-space font-semibold text-foreground text-xl mb-3">Platform balance</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Includes mining rewards, claim rewards, and admin adjustments.
          Independent of the on-chain wallet balance above; the platform owes you this amount and you can request a withdrawal from /withdrawals.
        </p>
        <p className="font-space text-4xl font-bold text-foreground">
          {balance.toLocaleString()} <span className="text-base font-normal text-muted-foreground">USDT</span>
        </p>
      </GlassCard>
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">Wallet</h1>
        <p className="text-muted-foreground">View, copy, edit and delete wallet addresses connected to your UID.</p>
      </div>

      <GlassCard>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Account UID</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-foreground">{user.uid || '—'}</code>
              {user.uid && (
                <button
                  onClick={() => copy(user.uid, 'UID')}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {wallets.length === 0 && (
        <div>
          <h2 className="font-space text-xl font-semibold text-foreground mb-4">Create or import</h2>
          <CreateWallet />
        </div>
      )}

      <div>
        <h2 className="font-space text-xl font-semibold text-foreground mb-4">Your wallets</h2>
        {wallets.length === 0 ? (
          <GlassCard>
            <p className="text-muted-foreground text-sm">
              No wallets yet. Create one above to get your ETH and SOL addresses.
            </p>
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {wallets.map((wallet) => {
              const balance = balances[wallet.address];
              const price = prices[wallet.symbol];
              const symbol = wallet.symbol;
              const isEditing = editing === wallet.address;
              return (
                <GlassCard key={wallet.address} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {symbol.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{wallet.providerName}</p>
                        <Badge variant="secondary" className="text-xs">{wallet.chain}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(wallet.address);
                          setDraftAddress(wallet.address);
                        }}
                        className="text-muted-foreground hover:text-primary"
                        aria-label="Edit wallet"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(wallet.address, wallet.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete wallet"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Address</p>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} className="font-mono text-xs" />
                        <button onClick={() => saveAddress(wallet)} className="rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-foreground break-all leading-relaxed">
                          {wallet.address}
                        </code>
                        <button
                          onClick={() => copy(wallet.address, 'Address')}
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">On-chain balance</p>
                      <p className="text-xl font-bold font-space text-foreground">
                        {balance == null ? '—' : balance.toFixed(6)}{' '}
                        <span className="text-sm font-normal">{symbol}</span>
                      </p>
                    </div>
                    {balance != null && price != null && (
                      <p className="text-sm text-muted-foreground">
                        ≈ ${(balance * price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  {wallet.symbol === 'XMR' && (
                    <p className="text-xs text-muted-foreground">
                      Monero balances are private by design — restore the seed phrase in a Monero
                      wallet to view funds.
                    </p>
                  )}

                  {wallet.mnemonic && (
                    <div className="pt-2 border-t border-border">
                      <button
                        onClick={() =>
                          setRevealedSeeds((prev) => ({
                            ...prev,
                            [wallet.address]: !prev[wallet.address],
                          }))
                        }
                        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {revealedSeeds[wallet.address] ? <EyeOff size={14} /> : <Eye size={14} />}
                        {revealedSeeds[wallet.address] ? 'Hide seed phrase' : 'Reveal seed phrase'}
                      </button>
                      {revealedSeeds[wallet.address] && (
                        <p className="mt-2 font-mono text-xs text-foreground glass rounded-lg p-3 break-words leading-relaxed">
                          {wallet.mnemonic}
                        </p>
                      )}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

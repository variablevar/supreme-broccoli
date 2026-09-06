'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  isLikelyChecksummed,
  normalizeAddress,
} from '@/lib/web3/evm';
import { Wallet as WalletIcon } from 'lucide-react';

interface Props {
  /** Current saved ETH address (if any). */
  initialAddress?: string | null;
  /** Current saved chain label. */
  initialChain?: string;
}

export function ConnectWallet({ initialAddress = null, initialChain = 'Ethereum' }: Props) {
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState('');
  const [saved, setSaved] = useState<{ address: string; chain: string } | null>(
    initialAddress ? { address: initialAddress, chain: initialChain } : null
  );

  const save = async (raw: string) => {
    const norm = normalizeAddress(raw);
    if (!norm) {
      toast.error('That does not look like a valid Ethereum address.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/wallets/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: norm, chain: 'Ethereum' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Could not save wallet');
      }
      setSaved({ address: norm, chain: 'Ethereum' });
      setAddress('');
      toast.success(
        isLikelyChecksummed(raw)
          ? 'Wallet connected (checksum verified).'
          : 'Wallet connected. Tip: use the checksummed form to be safe.'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save wallet');
    } finally {
      setBusy(false);
    }
  };

  const onConnectMetaMask = async () => {
    setBusy(true);
    try {
      const { connectInjectedWallet } = await import('@/lib/web3/evm');
      const addr = await connectInjectedWallet();
      await save(addr);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'MetaMask connect failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-space flex items-center gap-2">
          <WalletIcon size={18} className="text-primary" />
          Connect wallet
        </CardTitle>
        {saved ? (
          <span className="text-xs text-muted-foreground">
            Watching <span className="font-mono">{saved.address.slice(0, 6)}…{saved.address.slice(-4)}</span> on {saved.chain}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Paste your Ethereum mainnet address (e.g. from MetaMask) to watch live
          USDT and ETH balances, and to receive payouts from IMNOSHI. The app
          reads your address; it never sends transactions from it.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onConnectMetaMask} disabled={busy}>
            {busy ? 'Connecting…' : 'Connect MetaMask'}
          </Button>
          <span className="text-xs text-muted-foreground self-center">or paste an address below</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr">Ethereum address</Label>
          <div className="flex gap-2">
            <Input
              id="addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x…"
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              disabled={busy || address.length === 0}
              onClick={() => save(address)}
            >
              Save
            </Button>
          </div>
        </div>

        {saved ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">Connected address:</span>{' '}
              <code className="font-mono">{saved.address}</code>
            </p>
            <p className="mt-1">
              We watch this address on Ethereum mainnet via public RPCs. To receive
              payouts, fund this address with USDT (TRC-20 USDT is on TRON -- use
              Ethereum mainnet ERC-20 USDT here).
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

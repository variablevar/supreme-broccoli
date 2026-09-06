'use client';
import { useState } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/stores/useDashboardStore';
import {
  createMnemonic,
  deriveWallets,
  isValidMnemonic,
  type DerivedWalletSet,
} from '@/lib/walletgen';
import { Copy, Download, Plus, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export function CreateWallet() {
  const { user, addWallet } = useDashboardStore();
  const [draft, setDraft] = useState<DerivedWalletSet | null>(null);
  const [mode, setMode] = useState<'idle' | 'create' | 'import'>('idle');
  const [importText, setImportText] = useState('');
  const [saving, setSaving] = useState(false);

  const addAllAddresses = async (set: DerivedWalletSet): Promise<boolean> => {
    // Persist public addresses to the database first (one set per account).
    const res = await fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: set.addresses.map((a) => ({
          symbol: a.symbol,
          chain: a.chain,
          address: a.address,
        })),
      }),
    });
    if (res.status === 409) {
      toast.error('This account already has a wallet');
      return false;
    }
    if (!res.ok) {
      toast.error('Failed to save wallet — try again');
      return false;
    }

    const now = new Date().toISOString();
    for (const addr of set.addresses) {
      addWallet({
        providerId: `created-${addr.symbol}-${addr.address}`,
        providerName: 'Created wallet',
        symbol: addr.symbol,
        chain: addr.chain,
        address: addr.address,
        connectedAt: now,
        mnemonic: set.mnemonic,
      });
    }
    // Link the ETH address to the account profile if none is set.
    if (!user.walletAddress) {
      const evm = set.addresses.find((a) => a.symbol === 'ETH');
      if (evm) {
        fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: evm.address }),
        }).catch(() => {});
      }
    }
    return true;
  };

  const handleCreate = () => {
    try {
      setDraft(deriveWallets(createMnemonic()));
      setMode('create');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Wallet generation failed');
    }
  };

  const handleImport = async () => {
    const mnemonic = importText.trim().toLowerCase();
    if (!isValidMnemonic(mnemonic)) {
      toast.error('Invalid seed phrase — check the 12/24 words and try again');
      return;
    }
    setSaving(true);
    try {
      const ok = await addAllAddresses(deriveWallets(mnemonic));
      if (ok) {
        toast.success('Wallet imported — addresses added below');
        setImportText('');
        setMode('idle');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const ok = await addAllAddresses(draft);
      if (ok) {
        toast.success('Wallet created — addresses added below');
        setDraft(null);
        setMode('idle');
      }
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (mode === 'idle' && !draft) {
    return (
      <GlassCard className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Plus size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm">Create or import a wallet</p>
            <p className="text-xs text-muted-foreground">
              One seed phrase → BTC, ETH, SOL, LTC, DOGE, TRX & XMR addresses
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode('import')}>
            <Download size={14} className="mr-1.5" />
            Import
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus size={14} className="mr-1.5" />
            Create
          </Button>
        </div>
      </GlassCard>
    );
  }

  if (mode === 'import') {
    return (
      <GlassCard className="space-y-4">
        <h3 className="font-space font-semibold text-foreground">Import from seed phrase</h3>
        <p className="text-sm text-muted-foreground">
          Paste your 12 or 24 word recovery phrase. It is processed locally in your browser and
          never sent to our servers.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="word1 word2 word3 …"
          rows={3}
          className="w-full rounded-lg bg-background border border-input text-foreground font-mono text-sm p-3 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex gap-3">
          <Button onClick={handleImport} disabled={!importText.trim() || saving}>
            {saving ? 'Importing…' : 'Import wallet'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setImportText('');
              setMode('idle');
            }}
          >
            Cancel
          </Button>
        </div>
      </GlassCard>
    );
  }

  // create mode — backup screen
  return (
    <GlassCard className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
          <ShieldAlert size={18} />
        </div>
        <div>
          <h3 className="font-space font-semibold text-foreground">Back up your seed phrase</h3>
          <p className="text-sm text-muted-foreground">
            Write these 12 words down offline. Anyone with them controls these wallets. They are
            never sent to our servers.
          </p>
        </div>
      </div>

      {draft && (
        <>
          <div className="glass rounded-xl p-4">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {draft.mnemonic.split(' ').map((word, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                  <span className="font-mono text-foreground">{word}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {draft.addresses.map((addr) => (
              <div key={addr.symbol} className="glass rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {addr.chain} ({addr.symbol})
                </p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs text-foreground break-all">{addr.address}</code>
                  <button
                    onClick={() => copy(addr.address, `${addr.symbol} address`)}
                    className="shrink-0 text-muted-foreground hover:text-primary"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => copy(draft.mnemonic, 'Seed phrase')}>
              <Copy size={16} className="mr-2" />
              Copy seed phrase
            </Button>
            <Button onClick={handleConfirmCreate} disabled={saving}>
              {saving ? 'Creating…' : "I've saved it — create wallet"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(null);
                setMode('idle');
              }}
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </GlassCard>
  );
}

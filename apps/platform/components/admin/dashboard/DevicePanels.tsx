'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cog, PowerOff, RefreshCw, Send } from 'lucide-react';

const CURRENCIES = ['BTC', 'ETH', 'SOL', 'DOGE', 'LTC', 'XMR', 'PEARL'] as const;
type Currency = (typeof CURRENCIES)[number];

/**
 * Generate a pairing code that a customer redeems on /devices/pair.
 */
export function DevicePairingPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [result, setResult] = useState<{ code: string; expiresMinutes: number } | null>(null);

  async function generate() {
    if (!email.trim() || !deviceName.trim()) {
      toast.error('Customer email and device name are required');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/devices/pairing-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail: email.trim(), deviceName: deviceName.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Could not generate code');
      }
      const data = await res.json();
      setResult({ code: data.code, expiresMinutes: data.expiresMinutes });
      toast.success('Pairing code generated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="font-space">Pair a monitor device</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generates a 6-character code. The customer enters it on
          <span className="mx-1 font-mono">/devices/pair</span>
          from their signed-in dashboard. Once the device is online it starts
          posting telemetry and pulling display state from
          <span className="mx-1 font-mono">/api/devices/state</span>
          every 15 s.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="email">Customer email</Label>
            <Input id="email" type="email" placeholder="customer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="name">Device name</Label>
            <Input id="name" placeholder="Monitor Node 06" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
          </div>
        </div>

        <Button onClick={generate} disabled={busy}>
          {busy ? 'Generating…' : 'Generate pairing code'}
        </Button>

        {result ? (
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-wider text-primary">Code</p>
            <p className="mt-1 font-mono text-3xl tracking-widest text-foreground">{result.code}</p>
            <p className="mt-1 text-xs text-muted-foreground">Expires in {result.expiresMinutes} minutes.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Per-device command panel. Phase 2 surfaces a "Display settings" popover
 * with the new server-driven commands in addition to the Phase-1 ping /
 * push-config / revoke buttons.
 */
export function DeviceCommandPanel({ deviceId, deviceName }: { deviceId: string; deviceName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  // Display-override state.
  const [currency, setCurrency] = useState<Currency>('BTC');
  const [miningDisplay, setMiningDisplay] = useState<'hashrate' | 'apr' | 'both'>('hashrate');
  const [refreshMs, setRefreshMs] = useState('15000');
  const [currencyShuffle, setCurrencyShuffle] = useState(true);
  const [pairedPageText, setPairedPageText] = useState('Enter this code at /devices/pair');

  const send = async (command: string, extras: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`/admin/api/devices/${deviceId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, ...extras }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Command failed');
      }
      toast.success(`Queued ${command} for ${deviceName}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Command failed');
    } finally {
      setBusy(false);
    }
  };

  const sendDisplay = (command: string, extras: Record<string, unknown>) => {
    void send(command, extras);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-right">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => send('force_telemetry_ping')}>
          <Send size={14} className="mr-1" /> Ping
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => send('reset_claim')}>
          <PowerOff size={14} className="mr-1" /> Revoke
        </Button>
        <Button size="sm" disabled={busy} onClick={() => setOpen((v) => !v)}>
          <Cog size={14} className="mr-1" /> Display
        </Button>
      </div>

      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-xl border border-border bg-card p-4 text-left shadow-lg">
          <p className="text-sm font-medium text-foreground">Display overrides</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pushed to the device on its next /api/devices/state poll (≤ 15 s).
          </p>

          <div className="mt-3">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="mt-2" disabled={busy} onClick={() => sendDisplay('set_currency', { currency })}>
              Apply
            </Button>
          </div>

          <div className="mt-4">
            <Label>Mining display</Label>
            <Select value={miningDisplay} onValueChange={(v) => setMiningDisplay(v as typeof miningDisplay)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hashrate">Hashrate (MH/s)</SelectItem>
                <SelectItem value="apr">APR (%)</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="mt-2" disabled={busy} onClick={() => sendDisplay('set_mining_display', { miningDisplay })}>
              Apply
            </Button>
          </div>

          <div className="mt-4">
            <Label>Refresh interval (ms)</Label>
            <Input type="number" min="2000" max="60000" value={refreshMs} onChange={(e) => setRefreshMs(e.target.value)} className="mt-1" />
            <Button size="sm" className="mt-2" disabled={busy}
              onClick={() => sendDisplay('set_refresh_ms', { refreshMs: Number(refreshMs) })}>
              Apply
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              id="shuffle"
              type="checkbox"
              checked={currencyShuffle}
              onChange={(e) => setCurrencyShuffle(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="shuffle">Currency auto-shuffle</Label>
            <Button size="sm" variant="ghost" className="ml-auto"
              onClick={() => sendDisplay('set_currency_shuffle', { currencyShuffle })}>
              <RefreshCw size={14} />
            </Button>
          </div>

          <div className="mt-4">
            <Label>Pairing page text</Label>
            <Input value={pairedPageText} onChange={(e) => setPairedPageText(e.target.value)} className="mt-1" maxLength={160} />
            <Button size="sm" className="mt-2" disabled={busy}
              onClick={() => sendDisplay('set_paired_page_text', { pairedPageText })}>
              Apply
            </Button>
          </div>

          <Button size="sm" variant="ghost" className="mt-4 w-full" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      ) : null}
    </div>
  );
}

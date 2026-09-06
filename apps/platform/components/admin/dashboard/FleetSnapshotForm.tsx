'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Push a new fleet_stats snapshot that updates the live ticker on
 * imnoshi-web. Full-admin only.
 */
export function FleetSnapshotForm() {
  const router = useRouter();
  const [totalGpus, setTotalGpus] = useState('');
  const [activeMiners, setActiveMiners] = useState('');
  const [totalHashrate, setTotalHashrate] = useState('');
  const [dailyRewards, setDailyRewards] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/fleet/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalGpus: Number(totalGpus || 0),
          activeMiners: Number(activeMiners || 0),
          totalHashrate: Number(totalHashrate || 0),
          dailyRewards: Number(dailyRewards || 0),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Could not post snapshot');
      }
      toast.success('Snapshot posted');
      setTotalGpus(''); setActiveMiners(''); setTotalHashrate(''); setDailyRewards('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post snapshot');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-space">Push new fleet stats</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="gpus">Total GPUs</Label>
            <Input id="gpus" value={totalGpus} onChange={(e) => setTotalGpus(e.target.value)} type="number" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="miners">Active Miners</Label>
            <Input id="miners" value={activeMiners} onChange={(e) => setActiveMiners(e.target.value)} type="number" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="hashrate">Hashrate (PH/s)</Label>
            <Input id="hashrate" value={totalHashrate} onChange={(e) => setTotalHashrate(e.target.value)} type="number" step="0.01" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="rewards">Daily USDT</Label>
            <Input id="rewards" value={dailyRewards} onChange={(e) => setDailyRewards(e.target.value)} type="number" step="0.01" className="mt-2" />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post snapshot'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

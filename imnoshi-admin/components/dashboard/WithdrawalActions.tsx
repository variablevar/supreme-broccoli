'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  withdrawalId: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  amount: number;
}

type Mode = 'idle' | 'completing';

/**
 * Per-row actions for the admin withdrawals queue.
 *  - Pending  -> Approve | Reject (with reason)
 *  - Processing -> Mark Completed (records external payout)
 *  - Completed/Rejected -> readonly
 */
export function WithdrawalActions({ withdrawalId, status, amount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [txHash, setTxHash] = useState('');
  const [network, setNetwork] = useState<'TRC20' | 'ERC20' | 'BEP20' | 'SOL' | 'BANK'>('TRC20');
  const [destination, setDestination] = useState('');

  async function decide(decision: 'approve' | 'mark_processing' | 'reject') {
    setBusy(true);
    try {
      let body: Record<string, unknown> = { withdrawalId, decision };
      if (decision === 'reject') {
        const reason = window.prompt('Reject reason (shown to customer)?') ?? '';
        if (!reason.trim()) return;
        body = { ...body, rejectionReason: reason.trim() };
      }
      const res = await fetch('/api/withdrawals/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Action failed');
      }
      toast.success('Withdrawal updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!txHash.trim() || !destination.trim()) {
      toast.error('External tx hash and destination required');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/withdrawals/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId,
          network,
          destination: destination.trim(),
          amountUsdt: amount,
          externalTxHash: txHash.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Action failed');
      }
      toast.success('Payout recorded');
      setMode('idle');
      setTxHash('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'pending') {
    return (
      <div className="flex justify-end gap-2">
        <Button size="sm" disabled={busy} onClick={() => decide('approve')}>
          Approve
        </Button>
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide('reject')}>
          Reject
        </Button>
      </div>
    );
  }

  if (status === 'processing') {
    if (mode === 'idle') {
      return (
        <Button size="sm" disabled={busy} onClick={() => setMode('completing')}>
          Mark Paid
        </Button>
      );
    }
    return (
      <div className="flex flex-col gap-2 items-end">
        <div className="flex gap-2">
          <Select value={network} onValueChange={(v) => setNetwork(v as typeof network)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['TRC20','ERC20','BEP20','SOL','BANK'] as const).map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-48"
            placeholder="0xabc…"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Input className="w-64" placeholder="External tx hash" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
          <Button size="sm" disabled={busy} onClick={complete}>Confirm</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setMode('idle')}>Cancel</Button>
        </div>
        <Label className="text-xs text-muted-foreground">
          Records the payout in our audit log + writes a row to payout_dispatches. The actual transfer must be made from your ops treasury.
        </Label>
      </div>
    );
  }

  return <span className="text-xs text-muted-foreground">—</span>;
}

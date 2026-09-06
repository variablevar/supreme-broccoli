'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserOption {
  id: string;
  email: string;
  uid: string;
}

/**
 * Apply a one-time +/- USDT entry to the customer balance ledger.
 * Used for corrections, manual reward grants, or promotional credits.
 */
export function BalanceAdjustmentForm({ users }: { users: UserOption[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string>(users[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'admin_credit' | 'admin_debit' | 'reward_manual' | 'correction'>('admin_credit');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !amount) return;
    setBusy(true);
    try {
      const res = await fetch('/api/balance/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amountUsdt: Number(amount),
          kind,
          note,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Adjustment failed');
      }
      toast.success('Balance adjusted');
      setAmount('');
      setNote('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Adjustment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-space">Adjust a customer balance</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Customer</Label>
            <Select value={userId} onValueChange={(v) => setUserId(v)}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.email} — {u.uid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="amount">Amount (USDT)</Label>
            <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2" type="number" step="0.01" />
          </div>
          <div>
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_credit">Credit</SelectItem>
                <SelectItem value="admin_debit">Debit</SelectItem>
                <SelectItem value="reward_manual">Reward</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="note">Note</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-2" placeholder="Reference / reason" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={busy || !userId || !amount} className="w-full">
              {busy ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

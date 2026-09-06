'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassCard } from '@/components/shared/GlassCard';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type { PayoutDestination } from '@/types';
import { toast } from 'sonner';

const networks = ['TRC20', 'ERC20', 'BEP20', 'SOL'] as const;

const schema = z.object({
  type: z.enum(['crypto', 'revolut']),
  label: z.string().min(1),
});

export function PayoutDestinationManager() {
  const { payoutDestinations, upsertPayoutDestination, removePayoutDestination } = useDashboardStore();
  const [editing, setEditing] = useState<PayoutDestination | null>(null);
  const [type, setType] = useState<'crypto' | 'revolut'>('crypto');
  const [network, setNetwork] = useState<(typeof networks)[number]>('TRC20');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      type,
      label: String(form.get('label') ?? ''),
    });
    if (!parsed.success) {
      toast.error('Add a label for this payout destination');
      return;
    }

    const destination: PayoutDestination = {
      id: editing?.id ?? crypto.randomUUID(),
      type,
      label: parsed.data.label,
      network: type === 'crypto' ? network : undefined,
      address: type === 'crypto' ? String(form.get('address') ?? '') : undefined,
      revolutName: type === 'revolut' ? String(form.get('revolutName') ?? '') : undefined,
      revolutTag: type === 'revolut' ? String(form.get('revolutTag') ?? '') : undefined,
      iban: type === 'revolut' ? String(form.get('iban') ?? '') : undefined,
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      const res = await fetch('/api/payout-destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(destination),
      });
      const saved = res.ok ? await res.json() : destination;
      upsertPayoutDestination(saved);
      toast.success('Payout destination saved');
      setEditing(null);
      event.currentTarget.reset();
    } finally {
      setSaving(false);
    }
  }

  async function remove(destination: PayoutDestination) {
    removePayoutDestination(destination.id);
    await fetch('/api/payout-destinations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: destination.id }),
    }).catch(() => {});
    toast.success('Payout destination deleted');
  }

  function edit(destination: PayoutDestination) {
    setEditing(destination);
    setType(destination.type);
    setNetwork(destination.network ?? 'TRC20');
  }

  return (
    <GlassCard className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-space text-xl font-semibold text-foreground">Payout Destinations</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add Revolut details or USDT wallet addresses.</p>
        </div>
        <Plus size={18} className="text-primary" />
      </div>

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={(value) => setType(value as 'crypto' | 'revolut')}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="crypto">USDT crypto wallet</SelectItem>
              <SelectItem value="revolut">Revolut bank</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="label">Label</Label>
          <Input id="label" name="label" key={editing?.id ?? 'new-label'} defaultValue={editing?.label} className="mt-2" placeholder="Main USDT wallet" />
        </div>

        {type === 'crypto' ? (
          <>
            <div>
              <Label>Network</Label>
              <Select value={network} onValueChange={(value) => setNetwork(value as (typeof networks)[number])}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {networks.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="address">Wallet address</Label>
              <Input id="address" name="address" key={`${editing?.id ?? 'new'}-address`} defaultValue={editing?.address} className="mt-2 font-mono" />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="revolutName">Account name</Label>
              <Input id="revolutName" name="revolutName" key={`${editing?.id ?? 'new'}-name`} defaultValue={editing?.revolutName} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="revolutTag">Revolut tag</Label>
              <Input id="revolutTag" name="revolutTag" key={`${editing?.id ?? 'new'}-tag`} defaultValue={editing?.revolutTag} className="mt-2" placeholder="@username" />
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="iban">IBAN or account reference</Label>
              <Input id="iban" name="iban" key={`${editing?.id ?? 'new'}-iban`} defaultValue={editing?.iban} className="mt-2 font-mono" />
            </div>
          </>
        )}

        <div className="lg:col-span-2 flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Destination' : 'Add Destination'}</Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {payoutDestinations.map((destination) => (
          <div key={destination.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-4">
            <div>
              <p className="font-medium text-foreground">{destination.label}</p>
              <p className="text-xs text-muted-foreground">
                {destination.type === 'crypto'
                  ? `${destination.network ?? 'USDT'} ${destination.address ?? ''}`
                  : `${destination.revolutName ?? 'Revolut'} ${destination.revolutTag ?? ''}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="icon" onClick={() => edit(destination)} aria-label="Edit payout destination">
                <Pencil size={16} />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => remove(destination)} aria-label="Delete payout destination">
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

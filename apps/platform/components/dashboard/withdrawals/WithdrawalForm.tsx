'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { toast } from 'sonner';

const schema = z.object({
  amount: z.coerce.number().min(100, 'Minimum withdrawal is 100 USDT'),
  method: z.enum(['crypto', 'bank']),
  destinationId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function WithdrawalForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { balance, withdrawals, payoutDestinations, updateBalance } = useDashboardStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 100, method: 'crypto', destinationId: 'none' },
  });

  const nextEligible = withdrawals.nextEligibleAt ? new Date(withdrawals.nextEligibleAt) : null;
  const blockedByCycle = nextEligible ? nextEligible.getTime() > Date.now() : false;

  async function onSubmit(data: FormData) {
    if (data.amount > balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (data.amount < withdrawals.minimum) {
      toast.error(`Minimum withdrawal is ${withdrawals.minimum} USDT`);
      return;
    }
    if (blockedByCycle) {
      toast.error('Withdrawals are available once every 7 days');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, destinationId: data.destinationId === 'none' ? undefined : data.destinationId }),
      });
      if (!res.ok) throw new Error('Withdrawal request failed');
      updateBalance(-data.amount);
      toast.success('Withdrawal request submitted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <GlassCard>
      <h3 className="font-space font-semibold text-foreground text-xl mb-6">Request Withdrawal</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Label htmlFor="amount" className="text-foreground/70">Amount (USDT)</Label>
          <Input
            id="amount"
            type="number"
            {...register('amount', { valueAsNumber: true })}
            className="mt-1 bg-background border-input text-foreground"
          />
          {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
        </div>

        <div>
          <Label className="text-foreground/70">Method</Label>
          <Select
            value={watch('method')}
            onValueChange={(v) => setValue('method', v as 'crypto' | 'bank')}
          >
            <SelectTrigger className="mt-1 bg-background border-input text-foreground">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="crypto">Crypto Wallet</SelectItem>
              <SelectItem value="bank">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
          {errors.method && <p className="text-destructive text-sm mt-1">{errors.method.message}</p>}
        </div>

        <div>
          <Label className="text-foreground/70">Destination</Label>
          <Select
            value={watch('destinationId')}
            onValueChange={(v) => setValue('destinationId', v)}
          >
            <SelectTrigger className="mt-1 bg-background border-input text-foreground">
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Choose later</SelectItem>
              {payoutDestinations.map((destination) => (
                <SelectItem key={destination.id} value={destination.id}>
                  {destination.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="glass rounded-xl p-4">
          <p className="text-foreground/40 text-xs uppercase tracking-wider mb-1">Withdrawal rules</p>
          <p className="text-2xl font-bold font-space text-foreground">100 USDT minimum</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {blockedByCycle && nextEligible
              ? `Next eligible: ${nextEligible.toLocaleString()}`
              : 'Available once every 7 days'}
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || blockedByCycle}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-6"
        >
          {isSubmitting ? 'Submitting...' : 'Request Withdrawal'}
        </Button>
      </form>
    </GlassCard>
  );
}

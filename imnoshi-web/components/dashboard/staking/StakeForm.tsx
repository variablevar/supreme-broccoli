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
import { calculateAPY, calculateMultiplier, LOCK_PERIODS } from '@/lib/constants';
import { toast } from 'sonner';

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  lockPeriod: z.coerce.number().refine((v) => LOCK_PERIODS.includes(v as 1 | 3 | 6 | 12), {
    message: 'Invalid lock period',
  }),
});

type FormData = z.infer<typeof schema>;

export function StakeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { balance, updateBalance, setStakedAmount } = useDashboardStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 1000, lockPeriod: 3 },
  });

  const amount = watch('amount');
  const lockPeriod = watch('lockPeriod');
  const apy = calculateAPY(lockPeriod);
  const multiplier = calculateMultiplier(lockPeriod);

  async function onSubmit(data: FormData) {
    if (data.amount > balance) {
      toast.error('Insufficient balance');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/staking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create stake');
      updateBalance(-data.amount);
      setStakedAmount(data.amount);
      toast.success(`Staked $${data.amount.toLocaleString()} for ${data.lockPeriod} months`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Stake failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <GlassCard>
      <h3 className="font-space font-semibold text-foreground text-xl mb-6">Stake Funds</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Label htmlFor="amount" className="text-foreground/70">Amount (USD)</Label>
          <Input
            id="amount"
            type="number"
            {...register('amount', { valueAsNumber: true })}
            className="mt-1 bg-background border-input text-foreground"
          />
          {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
        </div>

        <div>
          <Label className="text-foreground/70">Lock Period</Label>
          <Select
            value={String(lockPeriod)}
            onValueChange={(v) => setValue('lockPeriod', Number(v))}
          >
            <SelectTrigger className="mt-1 bg-background border-input text-foreground">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {LOCK_PERIODS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} month{m > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.lockPeriod && <p className="text-destructive text-sm mt-1">{errors.lockPeriod.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-foreground/40 text-xs uppercase tracking-wider mb-1">APY</p>
            <p className="text-2xl font-bold font-space text-foreground">{apy}%</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-foreground/40 text-xs uppercase tracking-wider mb-1">Multiplier</p>
            <p className="text-2xl font-bold font-space text-foreground">{multiplier.toFixed(2)}x</p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold py-6"
        >
          {isSubmitting ? 'Staking...' : 'Confirm Stake'}
        </Button>
      </form>
    </GlassCard>
  );
}

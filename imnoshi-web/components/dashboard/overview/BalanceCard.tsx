'use client';
import { GlassCard } from '@/components/shared/GlassCard';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { TrendingUp, PiggyBank } from 'lucide-react';

export function BalanceCard() {
  const { balance, stakedAmount } = useDashboardStore();

  return (
    <GlassCard className="h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <TrendingUp size={20} />
        </div>
        <h3 className="font-space font-semibold text-foreground">Balance</h3>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-foreground/40 text-sm mb-1">Available</p>
          <p className="text-3xl font-bold font-space text-foreground">${balance.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-foreground/40 text-sm mb-1">Staked</p>
          <div className="flex items-center gap-2">
            <PiggyBank size={16} className="text-primary" />
            <p className="text-3xl font-bold font-space text-foreground">${stakedAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${Math.min(100, (stakedAmount / (balance + stakedAmount + 1)) * 100)}%` }}
        />
      </div>
    </GlassCard>
  );
}

'use client';
import { GlassCard } from '@/components/shared/GlassCard';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useI18n } from '@/hooks/useI18n';
import { TrendingUp, Wallet } from 'lucide-react';

export function BalanceCard() {
  const { balance, todayEarnings, totalEarnings } = useDashboardStore();
  const { t } = useI18n();

  return (
    <GlassCard className="h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <TrendingUp size={20} />
        </div>
        <h3 className="font-space font-semibold text-foreground">{t('totalBalance')}</h3>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-foreground/40 text-sm mb-1">Available</p>
          <p className="text-2xl font-bold font-space text-foreground">{balance.toLocaleString()} USDT</p>
        </div>
        <div>
          <p className="text-foreground/40 text-sm mb-1">{t('todayEarnings')}</p>
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-primary" />
            <p className="text-2xl font-bold font-space text-foreground">{todayEarnings.toLocaleString()} USDT</p>
          </div>
        </div>
        <div>
          <p className="text-foreground/40 text-sm mb-1">{t('totalEarnings')}</p>
          <p className="text-2xl font-bold font-space text-foreground">{totalEarnings.toLocaleString()} USDT</p>
        </div>
      </div>

      <div className="mt-6 h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${Math.min(100, (todayEarnings / Math.max(totalEarnings, 1)) * 100)}%` }}
        />
      </div>
    </GlassCard>
  );
}

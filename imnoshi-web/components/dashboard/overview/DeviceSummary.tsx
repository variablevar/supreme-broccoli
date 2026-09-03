'use client';

import { Cpu, Radio, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useI18n } from '@/hooks/useI18n';
import { useDashboardStore } from '@/stores/useDashboardStore';

export function DeviceSummary() {
  const { devices } = useDashboardStore();
  const { t } = useI18n();
  const active = devices.filter((device) => device.status === 'online' || device.status === 'syncing');
  const today = devices.reduce((sum, device) => sum + device.todayUsdt, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <GlassCard hover={false}>
        <div className="flex items-center gap-3">
          <Cpu size={20} className="text-primary" />
          <p className="text-sm text-muted-foreground">{t('connectedDevices')}</p>
        </div>
        <p className="mt-4 font-space text-3xl font-bold">{devices.length}</p>
      </GlassCard>
      <GlassCard hover={false}>
        <div className="flex items-center gap-3">
          <Radio size={20} className="text-success" />
          <p className="text-sm text-muted-foreground">{t('activeWork')}</p>
        </div>
        <p className="mt-4 font-space text-3xl font-bold">{active.length}</p>
      </GlassCard>
      <GlassCard hover={false}>
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-primary" />
          <p className="text-sm text-muted-foreground">{t('todayEarnings')}</p>
        </div>
        <p className="mt-4 font-space text-3xl font-bold">{today.toLocaleString()} USDT</p>
      </GlassCard>
    </div>
  );
}

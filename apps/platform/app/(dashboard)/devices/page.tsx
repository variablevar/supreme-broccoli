'use client';

import { Cpu, Database, Radio, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/shared/GlassCard';
import { useI18n } from '@/hooks/useI18n';
import { useDashboardStore } from '@/stores/useDashboardStore';

export default function DevicesPage() {
  const { devices } = useDashboardStore();
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">{t('devices')}</h1>
        <p className="text-muted-foreground">{t('deviceTelemetry')}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {devices.map((device) => (
          <GlassCard key={device.id} hover={false} className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Cpu size={20} />
                </div>
                <div>
                  <h2 className="font-space text-xl font-semibold">{device.name}</h2>
                  <p className="font-mono text-xs text-muted-foreground">{device.uid}</p>
                </div>
              </div>
              <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>{device.status}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">GPU</p>
                <p className="mt-1 text-sm font-medium">{device.gpuModel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="mt-1 text-sm font-medium">{device.modelName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last seen</p>
                <p className="mt-1 text-sm font-medium">{new Date(device.lastSeen).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                [Radio, 'Uptime', `${device.uptimePercent}%`],
                [Database, 'Hashrate', `${device.hashRate} MH/s`],
                [TrendingUp, 'Today', `${device.todayUsdt.toLocaleString()} USDT`],
              ].map(([Icon, label, value]) => (
                <div key={label as string} className="rounded-lg border border-border bg-background/50 p-4">
                  <Icon size={16} className="text-primary" />
                  <p className="mt-3 text-xs text-muted-foreground">{label as string}</p>
                  <p className="mt-1 font-space text-lg font-semibold">{value as string}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

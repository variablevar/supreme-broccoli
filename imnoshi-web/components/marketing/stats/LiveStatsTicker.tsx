'use client';
import { useGpuStats } from '@/hooks/useGpuStats';
import { CountUpNumber } from '@/components/shared/CountUpNumber';

export function LiveStatsTicker() {
  const stats = useGpuStats();

  const items = [
    { label: 'Active GPUs', value: stats.totalGpus, prefix: '', suffix: '' },
    { label: 'Active Miners', value: stats.activeMiners, prefix: '', suffix: '' },
    { label: 'Total Hashrate', value: stats.totalHashrate, prefix: '', suffix: ' PH/s', decimals: 2 },
    { label: 'Daily USDT', value: stats.dailyRewards, prefix: '', suffix: ' USDT', decimals: 0 },
  ];

  return (
    <section id="stats" className="relative py-12 border-y border-border/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold font-space text-foreground mb-1">
                <CountUpNumber
                  end={item.value}
                  prefix={item.prefix}
                  suffix={item.suffix}
                  decimals={item.decimals}
                  duration={2}
                />
              </div>
              <div className="text-xs text-foreground/40 uppercase tracking-wider">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

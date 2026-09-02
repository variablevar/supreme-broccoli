'use client';
import { GlassCard } from '@/components/shared/GlassCard';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { Activity, Cpu, Server } from 'lucide-react';

export function EngineStatusGauges() {
  const { engineStatus } = useDashboardStore();

  const engines = [
    { key: 'engine1', label: 'GPU Mining', icon: Cpu, data: engineStatus.engine1 },
    { key: 'engine2', label: 'Quant LLM', icon: Activity, data: engineStatus.engine2 },
    { key: 'engine3', label: 'Quant Server', icon: Server, data: engineStatus.engine3 },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {engines.map((engine) => {
        const Icon = engine.icon;
        return (
          <GlassCard key={engine.key} className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>
                <span className="font-space font-semibold text-foreground">{engine.label}</span>
              </div>
              <span className="text-xs uppercase tracking-wider text-foreground/40">{engine.data.status}</span>
            </div>
            <div className="mt-auto">
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold font-space text-foreground">{engine.data.load}%</span>
                <span className="text-sm text-foreground/50">Load</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${engine.data.load}%` }}
                />
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

'use client';
import { GlassCard } from '@/components/shared/GlassCard';
import { useAccountData } from '@/hooks/useAccountData';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartPoint {
  month: string;
  base: number;
  boosted: number;
}

export function StakingChart() {
  const { stakes, loading } = useAccountData();
  const active = stakes.filter((s) => s.status === 'active');

  // Project cumulative value month-by-month from the real active stakes.
  const data: ChartPoint[] = [];
  if (active.length > 0) {
    for (let m = 0; m <= 12; m++) {
      let base = 0;
      let boosted = 0;
      for (const stake of active) {
        const amount = Number(stake.amount);
        const apy = Number(stake.apy);
        const multiplier = Number(stake.reward_multiplier);
        const projected = amount * (1 + (apy / 100) * (m / 12));
        base += projected;
        boosted += projected * multiplier;
      }
      data.push({
        month: `M${m}`,
        base: Math.round(base),
        boosted: Math.round(boosted),
      });
    }
  }

  return (
    <GlassCard className="h-full">
      <h3 className="font-space font-semibold text-foreground text-xl mb-6">Projected Yield</h3>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No active stakes. Your yield projection will appear here after your first stake.
        </p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: 'currentColor' }} stroke="currentColor" opacity={0.4} />
              <YAxis className="text-xs" tick={{ fill: 'currentColor' }} stroke="currentColor" opacity={0.4} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Area
                type="monotone"
                dataKey="base"
                name="Base yield"
                stroke="hsl(var(--muted-foreground))"
                fill="hsl(var(--muted-foreground))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="boosted"
                name="With multiplier"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}

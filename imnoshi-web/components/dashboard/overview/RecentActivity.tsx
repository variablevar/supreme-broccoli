'use client';
import { GlassCard } from '@/components/shared/GlassCard';
import { useAccountData } from '@/hooks/useAccountData';
import { Clock, Gift, ArrowDownLeft } from 'lucide-react';

interface ActivityItem {
  icon: typeof Gift;
  label: string;
  value: string;
  time: string;
  timestamp: number;
}

export function RecentActivity() {
  const { rewards, withdrawals, loading } = useAccountData();

  const items: ActivityItem[] = [
    ...rewards.map((r) => ({
      icon: Gift,
      label: `Earning (${r.source.replace('_', ' ')})`,
      value: `+${Number(r.amount).toLocaleString()} USDT`,
      time: new Date(r.created_at).toLocaleString(),
      timestamp: new Date(r.created_at).getTime(),
    })),
    ...withdrawals.map((w) => ({
      icon: ArrowDownLeft,
      label: `Withdrawal (${w.method}) — ${w.status}`,
      value: `-${Number(w.amount).toLocaleString()} USDT`,
      time: new Date(w.created_at).toLocaleString(),
      timestamp: new Date(w.created_at).getTime(),
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  return (
    <GlassCard className="h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Clock size={20} />
        </div>
        <h3 className="font-space font-semibold text-foreground">Recent Activity</h3>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No activity yet. Your earnings and withdrawals will appear here.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((activity, i) => {
            const Icon = activity.icon;
            return (
              <li key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary text-foreground/70">
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">{activity.label}</p>
                    <p className="text-foreground/40 text-xs">{activity.time}</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-mono ${
                    activity.value.startsWith('+')
                      ? 'text-success'
                      : activity.value.startsWith('-')
                      ? 'text-destructive'
                      : 'text-foreground/70'
                  }`}
                >
                  {activity.value}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}

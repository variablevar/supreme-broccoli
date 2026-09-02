'use client';
import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useAccountData } from '@/hooks/useAccountData';
import { Timer } from 'lucide-react';

const POLL_MS = 24 * 60 * 60 * 1000;

function getTimeRemaining(targetMs: number) {
  const diff = targetMs - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function PollCountdown() {
  const { rewards, stakes, loading } = useAccountData();
  const activeStakes = stakes.filter((s) => s.status === 'active');

  // Next poll = 24h after the last credited poll reward, or 24h after the
  // earliest active stake if none has been credited yet.
  const lastCredit = rewards
    .filter((r) => r.source === 'staking_bonus')
    .map((r) => new Date(r.created_at).getTime())
    .sort((a, b) => b - a)[0];
  const earliestStake = activeStakes.length
    ? Math.min(...activeStakes.map((s) => new Date(s.started_at).getTime()))
    : null;
  const base = lastCredit ?? earliestStake;
  const nextPollMs = base != null ? base + POLL_MS : null;

  const [time, setTime] = useState(() =>
    nextPollMs != null ? getTimeRemaining(nextPollMs) : null
  );

  useEffect(() => {
    if (nextPollMs == null) return;
    setTime(getTimeRemaining(nextPollMs));
    const interval = setInterval(() => setTime(getTimeRemaining(nextPollMs)), 1000);
    return () => clearInterval(interval);
  }, [nextPollMs]);

  return (
    <GlassCard className="h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Timer size={20} />
        </div>
        <h3 className="font-space font-semibold text-foreground">Algorithm Poll</h3>
      </div>

      <p className="text-foreground/60 text-sm mb-6">
        24-hour poll mining. The system finds the best output as a reward poll and stays active
        until timeout.
      </p>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : nextPollMs == null ? (
        <p className="text-muted-foreground text-sm">
          No active stake — the reward poll starts once you stake.
        </p>
      ) : time && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Hours', value: time.hours },
            { label: 'Minutes', value: time.minutes },
            { label: 'Seconds', value: time.seconds },
          ].map((unit) => (
            <div key={unit.label} className="glass rounded-xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold font-space text-foreground">
                {String(unit.value).padStart(2, '0')}
              </div>
              <div className="text-xs text-foreground/40 uppercase tracking-wider">{unit.label}</div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

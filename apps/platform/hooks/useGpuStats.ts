'use client';
import { useEffect, useState } from 'react';

interface GpuStats {
  totalGpus: number;
  activeMiners: number;
  totalHashrate: number;
  dailyRewards: number;
}

const ZERO: GpuStats = { totalGpus: 0, activeMiners: 0, totalHashrate: 0, dailyRewards: 0 };

export function useGpuStats(pollInterval = 30000) {
  const [stats, setStats] = useState<GpuStats>(ZERO);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch('/api/fleet');
        if (!res.ok) return;
        const row = await res.json();
        if (mounted && row) {
          setStats({
            totalGpus: Number(row.total_gpus) || 0,
            activeMiners: Number(row.active_miners) || 0,
            totalHashrate: Number(row.total_hashrate) || 0,
            dailyRewards: Number(row.daily_rewards) || 0,
          });
        }
      } catch {
        // keep last known values on transient failures
      }
    }

    load();
    const interval = setInterval(load, pollInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pollInterval]);

  return stats;
}

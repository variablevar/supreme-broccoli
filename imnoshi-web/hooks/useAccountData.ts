'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Reward, Stake, Withdrawal } from '@/types';

interface AccountData {
  rewards: Reward[];
  withdrawals: Withdrawal[];
  stakes: Stake[];
  loading: boolean;
  refetch: () => void;
}

export function useAccountData(): AccountData {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/rewards').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/withdrawals').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/staking').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([rw, wd, st]) => {
        setRewards(rw);
        setWithdrawals(wd);
        setStakes(st);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rewards, withdrawals, stakes, loading, refetch };
}

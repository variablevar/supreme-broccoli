'use client';
import { useCallback, useEffect, useState } from 'react';
import type { MonitorDevice, PayoutDestination, Reward, Withdrawal } from '@/types';

interface AccountData {
  rewards: Reward[];
  withdrawals: Withdrawal[];
  devices: MonitorDevice[];
  payoutDestinations: PayoutDestination[];
  loading: boolean;
  refetch: () => void;
}

export function useAccountData(): AccountData {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [devices, setDevices] = useState<MonitorDevice[]>([]);
  const [payoutDestinations, setPayoutDestinations] = useState<PayoutDestination[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/rewards').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/withdrawals').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/devices').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/payout-destinations').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([rw, wd, dv, pd]) => {
        setRewards(rw);
        setWithdrawals(wd);
        setDevices(dv);
        setPayoutDestinations(pd);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rewards, withdrawals, devices, payoutDestinations, loading, refetch };
}

'use client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type { MonitorDevice, PayoutDestination, Reward, Withdrawal } from '@/types';

export function WalletBootstrap() {
  const { isLoaded, isSignedIn } = useAuth();
  const syncFromServer = useDashboardStore((s) => s.syncFromServer);
  const setWallets = useDashboardStore((s) => s.setWallets);
  const setDevices = useDashboardStore((s) => s.setDevices);
  const upsertPayoutDestination = useDashboardStore((s) => s.upsertPayoutDestination);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    // Pull the real account state from the database.
    (async () => {
      try {
        const [userRes, rewardsRes, withdrawalsRes, walletsRes, devicesRes, destinationsRes, balanceRes] = await Promise.all([
          fetch('/api/user'),
          fetch('/api/rewards'),
          fetch('/api/withdrawals'),
          fetch('/api/wallets'),
          fetch('/api/devices'),
          fetch('/api/payout-destinations'),
          fetch('/api/account/balance'),
        ]);
        if (!userRes.ok) return;

        const profile = await userRes.json();
        const rewards: Reward[] = rewardsRes.ok ? await rewardsRes.json() : [];
        const withdrawals: Withdrawal[] = withdrawalsRes.ok ? await withdrawalsRes.json() : [];
        const dbWallets: { id?: string; symbol: string; chain: string; address: string; created_at: string }[] =
          walletsRes.ok ? await walletsRes.json() : [];
        const devices: MonitorDevice[] = devicesRes.ok ? await devicesRes.json() : [];
        const destinations: PayoutDestination[] = destinationsRes.ok ? await destinationsRes.json() : [];
        const ledgerBalance = balanceRes.ok ? ((await balanceRes.json()).balance as number) ?? 0 : 0;

        // Hydrate the wallet list from the database (single source of truth).
        setWallets(
          dbWallets.map((w) => ({
            providerId: `db-${w.symbol}-${w.address}`,
            id: w.id,
            providerName: 'Created wallet',
            symbol: w.symbol,
            chain: w.chain,
            address: w.address,
            connectedAt: w.created_at,
          }))
        );
        setDevices(devices);
        destinations.forEach(upsertPayoutDestination);

        const pending = rewards
          .filter((r) => r.status === 'pending')
          .reduce((s, r) => s + Number(r.amount), 0);
        const claimed = rewards
          .filter((r) => r.status === 'claimed')
          .reduce((s, r) => s + Number(r.amount), 0);
        const lastClaim =
          rewards
            .filter((r) => r.claimed_at)
            .map((r) => r.claimed_at as string)
            .sort()
            .pop() ?? '';
        const withdrawn = withdrawals
          .filter((w) => w.status !== 'rejected')
          .reduce((s, w) => s + Number(w.amount), 0);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const rewardTodayEarnings = rewards
          .filter((r) => new Date(r.created_at) >= todayStart)
          .reduce((s, r) => s + Number(r.amount), 0);
        const rewardTotalEarnings = rewards.reduce((s, r) => s + Number(r.amount), 0);
        const deviceTodayEarnings = devices.reduce((s, device) => s + Number(device.todayUsdt), 0);
        const deviceTotalEarnings = devices.reduce((s, device) => s + Number(device.totalUsdt), 0);
        const todayEarnings = rewardTodayEarnings || deviceTodayEarnings;
        const totalEarnings = rewardTotalEarnings || deviceTotalEarnings;
        const balance = balanceRes.ok ? Math.max(0, ledgerBalance) : Math.max(0, claimed - withdrawn);
        const lastWithdrawal = withdrawals
          .filter((w) => w.status !== 'rejected')
          .map((w) => new Date(w.created_at).getTime())
          .sort((a, b) => b - a)[0];
        const nextEligibleAt = lastWithdrawal
          ? new Date(lastWithdrawal + 7 * 24 * 60 * 60 * 1000).toISOString()
          : '';

        syncFromServer({
          uid: profile.uid,
          email: profile.email,
          vipStatus: profile.vipStatus,
          language: profile.language,
          theme: profile.theme,
          balance,
          todayEarnings,
          totalEarnings,
          rewardsPending: pending,
          rewardsClaimed: claimed,
          lastClaim,
          nextEligibleAt,
        });
      } catch {
        // offline or transient failure — keep persisted state
      }
    })();
  }, [isLoaded, isSignedIn, syncFromServer, setWallets, setDevices, upsertPayoutDestination]);

  return null;
}

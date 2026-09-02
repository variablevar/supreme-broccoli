'use client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type { Reward, Stake, Withdrawal } from '@/types';

export function WalletBootstrap() {
  const { isLoaded, isSignedIn } = useAuth();
  const syncFromServer = useDashboardStore((s) => s.syncFromServer);
  const setWallets = useDashboardStore((s) => s.setWallets);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    // Pull the real account state from the database.
    (async () => {
      try {
        const [userRes, rewardsRes, withdrawalsRes, stakesRes, walletsRes] = await Promise.all([
          fetch('/api/user'),
          fetch('/api/rewards'),
          fetch('/api/withdrawals'),
          fetch('/api/staking'),
          fetch('/api/wallets'),
        ]);
        if (!userRes.ok) return;

        const profile = await userRes.json();
        const rewards: Reward[] = rewardsRes.ok ? await rewardsRes.json() : [];
        const withdrawals: Withdrawal[] = withdrawalsRes.ok ? await withdrawalsRes.json() : [];
        const stakes: Stake[] = stakesRes.ok ? await stakesRes.json() : [];
        const dbWallets: { symbol: string; chain: string; address: string; created_at: string }[] =
          walletsRes.ok ? await walletsRes.json() : [];

        // Hydrate the wallet list from the database (single source of truth).
        setWallets(
          dbWallets.map((w) => ({
            providerId: `db-${w.symbol}-${w.address}`,
            providerName: 'Created wallet',
            symbol: w.symbol,
            chain: w.chain,
            address: w.address,
            connectedAt: w.created_at,
          }))
        );

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
        const staked = stakes
          .filter((s) => s.status === 'active')
          .reduce((s, x) => s + Number(x.amount), 0);
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const withdrawalsUsed = withdrawals.filter(
          (w) => new Date(w.created_at) >= monthStart && w.status !== 'rejected'
        ).length;

        // Available balance = claimed rewards minus withdrawals and active stakes.
        const balance = Math.max(0, claimed - withdrawn - staked);

        syncFromServer({
          uid: profile.uid,
          email: profile.email,
          vipStatus: profile.vipStatus,
          balance,
          stakedAmount: staked,
          rewardsPending: pending,
          rewardsClaimed: claimed,
          lastClaim,
          withdrawalsUsed,
        });
      } catch {
        // offline or transient failure — keep persisted state
      }
    })();
  }, [isLoaded, isSignedIn, syncFromServer, setWallets]);

  return null;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DashboardState, EngineStatus } from '@/types';

const DEFAULT_ENGINE_STATUS: EngineStatus = {
  engine1: { load: 0, status: 'idle' },
  engine2: { load: 0, status: 'idle' },
  engine3: { load: 0, status: 'active' },
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      user: { uid: '', email: '', vipStatus: false },
      balance: 0,
      stakedAmount: 0,
      engineStatus: DEFAULT_ENGINE_STATUS,
      rewards: { pending: 0, claimed: 0, lastClaim: '' },
      withdrawals: { monthlyLimit: 1, used: 0, nextReset: '' },
      wallets: [],

      setUser: (user) => set({ user }),
      updateBalance: (amount) => set((state) => ({ balance: state.balance + amount })),
      setStakedAmount: (amount) => set((state) => ({ stakedAmount: state.stakedAmount + amount })),
      updateEngineStatus: (status) => set({ engineStatus: status }),
      claimReward: () => {
        const { rewards, balance } = get();
        set({
          balance: balance + rewards.pending,
          rewards: {
            ...rewards,
            pending: 0,
            claimed: rewards.claimed + rewards.pending,
            lastClaim: new Date().toISOString(),
          },
        });
      },
      addWallet: (wallet) =>
        set((state) => ({
          wallets: [
            ...state.wallets.filter((w) => w.address !== wallet.address),
            wallet,
          ],
          user: {
            ...state.user,
            walletAddress: state.user.walletAddress || wallet.address,
          },
        })),
      removeWallet: (address) =>
        set((state) => {
          const wallets = state.wallets.filter((w) => w.address !== address);
          return {
            wallets,
            user: {
              ...state.user,
              walletAddress:
                state.user.walletAddress === address
                  ? wallets[0]?.address
                  : state.user.walletAddress,
            },
          };
        }),
      setWallets: (wallets) =>
        set((state) => {
          // Merge DB rows with locally held mnemonics (mnemonics never leave
          // the device they were created on).
          const localSeeds = new Map(
            state.wallets.filter((w) => w.mnemonic).map((w) => [w.address, w.mnemonic])
          );
          return {
            wallets: wallets.map((w) => ({
              ...w,
              mnemonic: localSeeds.get(w.address),
            })),
          };
        }),
      syncFromServer: (data) =>
        set((state) => ({
          user: { ...state.user, uid: data.uid, email: data.email, vipStatus: data.vipStatus },
          balance: data.balance,
          stakedAmount: data.stakedAmount,
          rewards: {
            pending: data.rewardsPending,
            claimed: data.rewardsClaimed,
            lastClaim: data.lastClaim,
          },
          withdrawals: {
            ...state.withdrawals,
            used: data.withdrawalsUsed,
            monthlyLimit: data.vipStatus ? 2 : 1,
          },
        })),
    }),
    {
      name: 'gt-quant-dashboard',
      version: 3,
      migrate: (persisted) => {
        // v0/v1 -> v2: dropped generated wallets, seed phrases and fake balances.
        // v2 -> v3: wallet entries are now symbol-driven (BTC, ETH, ...) instead
        // of kind-driven (evm/solana); map any existing entries across.
        const state = persisted as Partial<DashboardState>;
        const oldWallets =
          (persisted as { wallets?: Array<Record<string, unknown>> } | undefined)?.wallets ?? [];
        return {
          ...state,
          engineStatus: DEFAULT_ENGINE_STATUS,
          wallets: oldWallets.map((w) => {
            const { kind, ...rest } = w;
            return {
              ...rest,
              symbol: (rest.symbol as string) ?? (kind === 'solana' ? 'SOL' : 'ETH'),
            };
          }),
        };
      },
    }
  )
);

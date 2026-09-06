import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DashboardState, EngineStatus, MonitorDevice } from '@/types';

const DEFAULT_ENGINE_STATUS: EngineStatus = {
  engine1: { load: 64, status: 'mining' },
  engine2: { load: 51, status: 'training' },
  engine3: { load: 38, status: 'active' },
};

const DEFAULT_DEVICES: MonitorDevice[] = [
  {
    id: 'demo-node-01',
    uid: 'IMN-DEMO-0001',
    name: 'Monitor Node 01',
    status: 'online',
    gpuModel: 'Dedicated RTX GPU Lane',
    modelName: 'IMNOSHI Quant LLM',
    uptimePercent: 99.2,
    hashRate: 148.4,
    aiLoad: 51,
    tradingLoad: 38,
    todayUsdt: 18.42,
    totalUsdt: 1284.8,
    lastSeen: new Date().toISOString(),
  },
];

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      user: { uid: '', email: '', vipStatus: false, language: 'en-GB', theme: 'dark' },
      balance: 0,
      todayEarnings: 0,
      totalEarnings: 0,
      engineStatus: DEFAULT_ENGINE_STATUS,
      rewards: { pending: 0, claimed: 0, lastClaim: '' },
      withdrawals: { minimum: 100, cooldownDays: 7, nextEligibleAt: '' },
      wallets: [],
      devices: DEFAULT_DEVICES,
      payoutDestinations: [],
      language: 'en-GB',
      theme: 'dark',

      setUser: (user) => set({ user }),
      updateBalance: (amount) => set((state) => ({ balance: state.balance + amount })),
      setEarnings: (data) => set(data),
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
      setDevices: (devices) => set({ devices: devices.length ? devices : DEFAULT_DEVICES }),
      upsertPayoutDestination: (destination) =>
        set((state) => ({
          payoutDestinations: [
            destination,
            ...state.payoutDestinations.filter((item) => item.id !== destination.id),
          ],
        })),
      removePayoutDestination: (id) =>
        set((state) => ({
          payoutDestinations: state.payoutDestinations.filter((item) => item.id !== id),
        })),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      syncFromServer: (data) =>
        set((state) => ({
          user: {
            ...state.user,
            uid: data.uid,
            email: data.email,
            vipStatus: data.vipStatus,
            language: data.language,
            theme: data.theme,
          },
          language: data.language,
          theme: data.theme,
          balance: data.balance,
          todayEarnings: data.todayEarnings,
          totalEarnings: data.totalEarnings,
          rewards: {
            pending: data.rewardsPending,
            claimed: data.rewardsClaimed,
            lastClaim: data.lastClaim,
          },
          withdrawals: {
            ...state.withdrawals,
            nextEligibleAt: data.nextEligibleAt,
          },
        })),
    }),
    {
      name: 'gt-quant-dashboard',
      version: 4,
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
          devices: state.devices?.length ? state.devices : DEFAULT_DEVICES,
          todayEarnings: state.todayEarnings ?? 0,
          totalEarnings: state.totalEarnings ?? 0,
          withdrawals: {
            minimum: 100,
            cooldownDays: 7,
            nextEligibleAt: state.withdrawals?.nextEligibleAt ?? '',
          },
          payoutDestinations: state.payoutDestinations ?? [],
          language: state.language ?? state.user?.language ?? 'en-GB',
          theme: state.theme ?? state.user?.theme ?? 'dark',
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

export interface User {
  uid: string;
  email: string;
  walletAddress?: string;
  vipStatus: boolean;
}

export interface ConnectedWallet {
  providerId: string;
  providerName: string;
  symbol: string; // BTC, ETH, SOL, LTC, DOGE, TRX, XMR
  chain: string; // Bitcoin, Ethereum, ...
  address: string;
  connectedAt: string;
  mnemonic?: string; // only for wallets created in-app — never leaves the browser
}

export interface EngineStatus {
  engine1: { load: number; status: 'mining' | 'renting' | 'idle' };
  engine2: { load: number; status: 'training' | 'trading' | 'idle' };
  engine3: { load: number; status: 'active' | 'maintenance' };
}

export interface DashboardState {
  user: User;
  balance: number;
  stakedAmount: number;
  engineStatus: EngineStatus;
  rewards: { pending: number; claimed: number; lastClaim: string };
  withdrawals: { monthlyLimit: number; used: number; nextReset: string };
  wallets: ConnectedWallet[];

  setUser: (user: User) => void;
  updateBalance: (amount: number) => void;
  setStakedAmount: (amount: number) => void;
  updateEngineStatus: (status: EngineStatus) => void;
  claimReward: () => void;
  addWallet: (wallet: ConnectedWallet) => void;
  removeWallet: (address: string) => void;
  setWallets: (wallets: ConnectedWallet[]) => void;
  syncFromServer: (data: {
    uid: string;
    email: string;
    vipStatus: boolean;
    balance: number;
    stakedAmount: number;
    rewardsPending: number;
    rewardsClaimed: number;
    lastClaim: string;
    withdrawalsUsed: number;
  }) => void;
}

export interface StakePayload {
  amount: number;
  lockPeriod: 1 | 3 | 6 | 12;
}

export interface Stake {
  id: string;
  amount: number;
  lock_period_months: number;
  apy: number;
  started_at: string;
  ends_at: string;
  status: 'active' | 'completed' | 'cancelled';
  reward_multiplier: number;
}

export interface WithdrawalPayload {
  amount: number;
  method: 'crypto' | 'bank';
}

export interface Reward {
  id: string;
  amount: number;
  source: 'mining' | 'renting' | 'trading' | 'staking_bonus';
  status: 'pending' | 'claimed';
  created_at: string;
  claimed_at?: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  method: 'crypto' | 'bank';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  vip_withdrawal: boolean;
  created_at: string;
  processed_at?: string;
}

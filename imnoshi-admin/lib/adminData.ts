import { createAdminClient } from '@/lib/supabase';

export type AdminUser = {
  id: string;
  uid: string;
  email: string;
  wallet_address: string | null;
  vip_status: boolean | null;
  created_at: string | null;
};

type UserRef = { email: string; uid: string; wallet_address: string | null };

export type AdminWithdrawal = {
  id: string;
  amount: string | number;
  method: 'crypto' | 'bank';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  vip_withdrawal: boolean | null;
  created_at: string | null;
  processed_at: string | null;
  /** The customer-selected payout destination for THIS withdrawal, if any.
   *  Pulled from public.payout_destinations via destination_id. */
  destination_id: string | null;
  destination_label: string | null;
  destination_network: 'TRC20' | 'ERC20' | 'BEP20' | 'SOL' | null;
  destination_address: string | null;
  /** Fallback: the user's primary wallet address from public.users. */
  wallet_address: string | null;
  users: UserRef | null;
};

export type AdminReward = {
  id: string;
  amount: string | number;
  source: 'mining' | 'llm' | 'exchange' | 'trading';
  status: 'pending' | 'claimed';
  created_at: string | null;
  claimed_at: string | null;
  users: UserRef | null;
};

export type FleetStat = {
  id: number;
  total_gpus: number | null;
  active_miners: number | null;
  total_hashrate: string | number | null;
  daily_rewards: string | number | null;
  updated_at: string | null;
};

export type AdminOverview = {
  users: AdminUser[];
  withdrawals: AdminWithdrawal[];
  rewards: AdminReward[];
  fleetStats: FleetStat[];
};

function raise(table: string, error: { message: string } | null) {
  if (error) throw new Error(`${table}: ${error.message}`);
}

function normalizeUserRef(value: UserRef | UserRef[] | null): UserRef | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = createAdminClient();

  const [usersRes, withdrawalsRes, rewardsRes, fleetRes] = await Promise.all([
    supabase.from('users').select('id, uid, email, wallet_address, vip_status, created_at').order('created_at', { ascending: false }),
    supabase
      .from('withdrawals')
      .select(
        'id, amount, method, status, vip_withdrawal, created_at, processed_at, ' +
          'destination_id, destination_label, ' +
          'payout_destination:payout_destinations!destination_id(label, network, address), ' +
          'users(email, uid, wallet_address)'
      )
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('rewards')
      .select('id, amount, source, status, created_at, claimed_at, users(email, uid)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('fleet_stats').select('*').order('updated_at', { ascending: false }).limit(20),
  ]);

  raise('users', usersRes.error);
  raise('withdrawals', withdrawalsRes.error);
  raise('rewards', rewardsRes.error);
  raise('fleet_stats', fleetRes.error);

  return {
    users: (usersRes.data ?? []) as AdminUser[],
    withdrawals: (withdrawalsRes.data ?? []).map((withdrawal) => {
      // Supabase returns payout_destinations as an array (or null).
      // Take the first match -- a withdrawal points at one destination.
      const destArr = Array.isArray(withdrawal.payout_destinations)
        ? withdrawal.payout_destinations
        : withdrawal.payout_destinations
          ? [withdrawal.payout_destinations]
          : [];
      const dest = destArr[0] ?? null;
      return {
        ...withdrawal,
        destination_network: (dest?.network as AdminWithdrawal['destination_network']) ?? null,
        destination_address: dest?.address ?? null,
        // destination_id and destination_label already live on the
        // withdrawal row, no flattening needed for those.
        wallet_address: withdrawal.users?.wallet_address ?? null,
        users: normalizeUserRef(withdrawal.users),
      };
    }) as AdminWithdrawal[],
    rewards: (rewardsRes.data ?? []).map((reward) => ({
      ...reward,
      users: normalizeUserRef(reward.users),
    })) as AdminReward[],
    fleetStats: (fleetRes.data ?? []) as FleetStat[],
  };
}

export function money(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export function compactNumber(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString();
}

export function dateTime(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

import type { createAdminClient } from '@/lib/supabase';

type DbClient = ReturnType<typeof createAdminClient>;

// One poll period = 24h. Backpay is capped so a long-inactive account doesn't
// receive an unbounded lump sum on next login.
const POLL_MS = 24 * 60 * 60 * 1000;
const MAX_BACKPAY_PERIODS = 30;

/**
 * Lazy reward-poll settlement. Every 24h period in which the user had an
 * active stake produces one pending reward row:
 *
 *   daily reward = stake amount × (APY / 100) / 365 × reward multiplier
 *
 * Rewards stay 'pending' until the user claims them via POST /api/rewards.
 * Runs on read (GET /api/rewards), so no cron is required.
 */
export async function settleRewardPolls(supabase: DbClient, dbUserId: string): Promise<void> {
  const { data: stakes, error: stakesError } = await supabase
    .from('stakes')
    .select('amount, apy, reward_multiplier, started_at')
    .eq('user_id', dbUserId)
    .eq('status', 'active');

  if (stakesError || !stakes || stakes.length === 0) return;

  const dailyYield = stakes.reduce(
    (sum, s) => sum + (Number(s.amount) * Number(s.apy)) / 100 / 365 * Number(s.reward_multiplier),
    0
  );
  if (dailyYield <= 0) return;

  // Last time this user was credited any poll reward.
  const { data: lastReward } = await supabase
    .from('rewards')
    .select('created_at')
    .eq('user_id', dbUserId)
    .eq('source', 'staking_bonus')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const earliestStake = Math.min(...stakes.map((s) => new Date(s.started_at).getTime()));
  const creditedFrom = lastReward
    ? new Date(lastReward.created_at).getTime()
    : earliestStake;

  const now = Date.now();
  let periods = Math.floor((now - creditedFrom) / POLL_MS);
  if (periods <= 0) return;
  periods = Math.min(periods, MAX_BACKPAY_PERIODS);

  const rows = Array.from({ length: periods }, (_, i) => ({
    user_id: dbUserId,
    amount: Number(dailyYield.toFixed(8)),
    source: 'staking_bonus' as const,
    status: 'pending' as const,
    created_at: new Date(creditedFrom + (i + 1) * POLL_MS).toISOString(),
  }));

  await supabase.from('rewards').insert(rows);
}

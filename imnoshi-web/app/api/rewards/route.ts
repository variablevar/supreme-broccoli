import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';
import { clerkIdToUuid } from '@/lib/userId';
import { settleRewardPolls } from '@/lib/rewardsEngine';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const dbUserId = clerkIdToUuid(userId);

  // Settle any elapsed 24h reward polls before returning the list.
  try {
    await settleRewardPolls(supabase, dbUserId);
  } catch (err) {
    console.error('Reward poll settlement failed:', err);
  }

  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST = claim all pending rewards for the authenticated user.
export async function POST() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('rewards')
    .update({ status: 'claimed', claimed_at: new Date().toISOString() })
    .eq('user_id', clerkIdToUuid(userId))
    .eq('status', 'pending')
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const claimedTotal = (data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  return NextResponse.json({ claimed: claimedTotal, count: data?.length ?? 0 });
}

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { requireCustomer } from '@/lib/customerAuth';

export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('user_id', guard.session.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST = claim all pending rewards for the authenticated user.
export async function POST() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('rewards')
    .update({ status: 'claimed', claimed_at: new Date().toISOString() })
    .eq('user_id', guard.session.userId)
    .eq('status', 'pending')
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const claimedTotal = (data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  return NextResponse.json({ claimed: claimedTotal, count: data?.length ?? 0 });
}

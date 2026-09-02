import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser, clerkIdToUuid } from '@/lib/userId';
import { z } from 'zod';

const schema = z.object({
  amount: z.number().positive(),
  method: z.enum(['crypto', 'bank']),
});

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const dbUser = await ensureDbUser(supabase, userId);

    // --- Monthly withdrawal limit: 1 for standard, 2 for VIP (per spec) ---
    const monthlyLimit = dbUser.vip_status ? 2 : 1;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('withdrawals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', dbUser.id)
      .neq('status', 'rejected')
      .gte('created_at', monthStart.toISOString());

    if ((count ?? 0) >= monthlyLimit) {
      return NextResponse.json(
        { error: `Monthly withdrawal limit reached (${monthlyLimit} per month)` },
        { status: 429 }
      );
    }

    // --- Server-side balance check ---
    // available = claimed rewards - non-rejected withdrawals - active stakes
    const [rewardsRes, withdrawalsRes, stakesRes] = await Promise.all([
      supabase.from('rewards').select('amount, status').eq('user_id', dbUser.id),
      supabase.from('withdrawals').select('amount, status').eq('user_id', dbUser.id),
      supabase.from('stakes').select('amount').eq('user_id', dbUser.id).eq('status', 'active'),
    ]);

    const claimed = (rewardsRes.data ?? [])
      .filter((r) => r.status === 'claimed')
      .reduce((s, r) => s + Number(r.amount), 0);
    const withdrawn = (withdrawalsRes.data ?? [])
      .filter((w) => w.status !== 'rejected')
      .reduce((s, w) => s + Number(w.amount), 0);
    const staked = (stakesRes.data ?? []).reduce((s, x) => s + Number(x.amount), 0);
    const available = Math.max(0, claimed - withdrawn - staked);

    if (parsed.data.amount > available) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${available.toFixed(2)}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: dbUser.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        vip_withdrawal: dbUser.vip_status ?? false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', clerkIdToUuid(userId))
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

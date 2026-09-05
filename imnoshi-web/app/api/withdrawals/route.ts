import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser } from '@/lib/userId';
import { requireCustomer } from '@/lib/customerAuth';
import { z } from 'zod';

const schema = z.object({
  amount: z.number().min(100),
  method: z.enum(['crypto', 'bank']),
  destinationId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const dbUser = await ensureDbUser(supabase, guard.session.email);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count } = await supabase
      .from('withdrawals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', dbUser.id)
      .neq('status', 'rejected')
      .gte('created_at', sevenDaysAgo.toISOString());

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Withdrawals are available once every 7 days' },
        { status: 429 }
      );
    }

    // --- Server-side balance check ---
    const [rewardsRes, withdrawalsRes] = await Promise.all([
      supabase.from('rewards').select('amount, status').eq('user_id', dbUser.id),
      supabase.from('withdrawals').select('amount, status').eq('user_id', dbUser.id),
    ]);

    const claimed = (rewardsRes.data ?? [])
      .filter((r) => r.status === 'claimed')
      .reduce((s, r) => s + Number(r.amount), 0);
    const withdrawn = (withdrawalsRes.data ?? [])
      .filter((w) => w.status !== 'rejected')
      .reduce((s, w) => s + Number(w.amount), 0);
    const available = Math.max(0, claimed - withdrawn);

    if (parsed.data.amount > available) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${available.toFixed(2)}` },
        { status: 400 }
      );
    }

    let destinationLabel = parsed.data.method === 'crypto' ? 'Crypto wallet' : 'Revolut bank';
    if (parsed.data.destinationId) {
      const { data: destination } = await supabase
        .from('payout_destinations')
        .select('label')
        .eq('id', parsed.data.destinationId)
        .eq('user_id', dbUser.id)
        .maybeSingle();
      destinationLabel = destination?.label ?? destinationLabel;
    }

    const { data, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: dbUser.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        vip_withdrawal: dbUser.vip_status ?? false,
        destination_id: parsed.data.destinationId ?? null,
        destination_label: destinationLabel,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', guard.session.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

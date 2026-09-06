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
    // Single source of truth: customer_balance_v sums every entry in
    // balance_ledger (rewards + admin_credit + admin_debit +
    // payout_recorded + correction). Withdrawals only enter the
    // ledger once the admin records the external payout, so the
    // view's `balance` already nets out everything except the
    // currently-pending request.
    const [balanceRes] = await Promise.all([
      supabase
        .from('customer_balance_v')
        .select('balance')
        .eq('user_id', dbUser.id)
        .maybeSingle(),
    ]);
    if (balanceRes.error) {
      return NextResponse.json({ error: balanceRes.error.message }, { status: 500 });
    }
    const available = Math.max(0, Number(balanceRes.data?.balance ?? 0));

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

    // Some early deployments of the schema lacked destination_id /
    // destination_label. Probe once per request: if those columns
    // don't exist yet, omit them from the payload. (Production
    // deployments that have applied 20260907110000_add_withdrawals_destination.sql
    // will skip the omission on the first hit.)
    const colsRes = await supabase.from('withdrawals').select('destination_id').limit(0);
    const hasDestinationCols = !colsRes.error;

    const baseInsert: Record<string, unknown> = {
      user_id: dbUser.id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      vip_withdrawal: dbUser.vip_status ?? false,
    };
    if (hasDestinationCols) {
      baseInsert.destination_id = parsed.data.destinationId ?? null;
      baseInsert.destination_label = destinationLabel;
    }

    const { data, error } = await supabase
      .from('withdrawals')
      .insert(baseInsert)
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

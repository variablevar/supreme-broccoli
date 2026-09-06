import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { audit, getAdminContext, requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

const schema = z.object({
  userId: z.string().uuid(),
  amountUsdt: z.number(),
  kind: z.enum(['admin_credit', 'admin_debit', 'reward_manual', 'correction']),
  note: z.string().min(1).max(280),
});

/**
 * Apply a manual +/- USDT adjustment to a customer. Full-admin only.
 * Inserts a single ledger row (the customer's balance is computed
 * from the ledger everywhere else).
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ctx = await getAdminContext();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  // Resolve the actual stored amount. Debits must be negative in the
  // ledger regardless of which sign the operator typed; we normalise
  // here so callers can pass either form.
  let amount = parsed.data.amountUsdt;
  if (parsed.data.kind === 'admin_debit' && amount > 0) amount = -amount;
  if (parsed.data.kind === 'admin_credit' && amount < 0) amount = Math.abs(amount);
  if (amount === 0) {
    return NextResponse.json({ error: 'Amount must be non-zero' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('balance_ledger')
    .insert({
      user_id: parsed.data.userId,
      amount_usdt: amount,
      kind: parsed.data.kind,
      note: parsed.data.note,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit(ctx, 'balance.adjust', {
    targetTable: 'balance_ledger',
    targetId: data.id,
    details: { ...parsed.data, signed_amount: amount },
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });
  return NextResponse.json(data);
}

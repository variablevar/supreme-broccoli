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
  if (parsed.data.kind === 'admin_debit' && parsed.data.amountUsdt > 0) {
    // Debits should be stored negative to keep the sign convention.
    parsed.data.amountUsdt = -parsed.data.amountUsdt;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('balance_ledger')
    .insert({
      user_id: parsed.data.userId,
      amount_usdt: parsed.data.amountUsdt,
      kind: parsed.data.kind,
      note: parsed.data.note,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit(ctx, 'balance.adjust', {
    targetTable: 'balance_ledger',
    targetId: data.id,
    details: { ...parsed.data, signed_amount: parsed.data.amountUsdt },
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });
  return NextResponse.json(data);
}

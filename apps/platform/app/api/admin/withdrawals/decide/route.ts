import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { audit, getAdminContext, requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

const schema = z.object({
  withdrawalId: z.string().uuid(),
  decision: z.enum(['approve', 'reject', 'mark_processing']),
  rejectionReason: z.string().max(280).optional(),
});

/**
 * Approve, reject, or move a withdrawal into 'processing'. Full-admins
 * only. Records reviewer on the withdrawal and writes an audit log
 * entry. Balance movement is deferred to /admin/api/withdrawals/complete
 * once the operator records the external payout.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ctx = await getAdminContext();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { withdrawalId, decision, rejectionReason } = parsed.data;

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (decision === 'approve') {
    const { data, error } = await supabase
      .from('withdrawals')
      .update({
        status: 'processing',
        processed_at: now,
        reviewed_at: now,
        reviewed_by_email: ctx?.email,
      })
      .eq('id', withdrawalId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit(ctx, 'withdrawal.approve', {
      targetTable: 'withdrawals',
      targetId: withdrawalId,
      ip: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });
    return NextResponse.json(data);
  }

  if (decision === 'mark_processing') {
    const { data, error } = await supabase
      .from('withdrawals')
      .update({ status: 'processing', reviewed_at: now, reviewed_by_email: ctx?.email })
      .eq('id', withdrawalId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit(ctx, 'withdrawal.processing', {
      targetTable: 'withdrawals',
      targetId: withdrawalId,
      ip: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });
    return NextResponse.json(data);
  }

  // reject
  if (!rejectionReason) {
    return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
  }
  // Refund the amount to the user's balance by appending a ledger row.
  const { data: withdrawal, error: wErr } = await supabase
    .from('withdrawals')
    .select('user_id, amount, status')
    .eq('id', withdrawalId)
    .single();
  if (wErr || !withdrawal) {
    return NextResponse.json({ error: wErr?.message ?? 'Not found' }, { status: 404 });
  }
  if (withdrawal.status !== 'pending') {
    return NextResponse.json(
      { error: `Cannot reject a withdrawal in '${withdrawal.status}' status` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('withdrawals')
    .update({
      status: 'rejected',
      processed_at: now,
      reviewed_at: now,
      reviewed_by_email: ctx?.email,
      rejection_reason: rejectionReason,
    })
    .eq('id', withdrawalId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Refund ledger row.
  await supabase.from('balance_ledger').insert({
    user_id: withdrawal.user_id,
    amount_usdt: Number(withdrawal.amount),
    kind: 'withdrawal_rejected_refund',
    reference_id: withdrawalId,
    note: `Rejected: ${rejectionReason}`,
  });

  await audit(ctx, 'withdrawal.reject', {
    targetTable: 'withdrawals',
    targetId: withdrawalId,
    details: { reason: rejectionReason },
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });
  return NextResponse.json(data);
}

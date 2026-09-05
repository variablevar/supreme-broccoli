import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { audit, getAdminContext, requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

const schema = z.object({
  withdrawalId: z.string().uuid(),
  network: z.enum(['TRC20', 'ERC20', 'BEP20', 'SOL', 'BANK']),
  destination: z.string().min(1).max(200),
  amountUsdt: z.number().positive(),
  externalTxHash: z.string().min(8).max(200),
});

/**
 * Mark a withdrawal as 'completed' and record the actual external
 * payout. Full-admin only. The amount is appended to balance_ledger
 * as 'payout_recorded' for audit, and a row is written to
 * payout_dispatches.
 *
 * IMPORTANT: This endpoint records a transfer that has ALREADY been
 * executed by the operator off-chain. The actual on-chain / banking
 * transfer must be performed by your ops treasury / payment partner.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ctx = await getAdminContext();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { withdrawalId, network, destination, amountUsdt, externalTxHash } = parsed.data;

  const supabase = createAdminClient();

  const { data: withdrawal, error: wErr } = await supabase
    .from('withdrawals')
    .select('user_id, amount, status')
    .eq('id', withdrawalId)
    .single();
  if (wErr || !withdrawal) {
    return NextResponse.json({ error: wErr?.message ?? 'Not found' }, { status: 404 });
  }
  if (!['processing', 'pending'].includes(withdrawal.status)) {
    return NextResponse.json(
      { error: `Cannot complete withdrawal in '${withdrawal.status}' status` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  const { data: payout, error: pErr } = await supabase
    .from('payout_dispatches')
    .insert({
      withdrawal_id: withdrawalId,
      user_id: withdrawal.user_id,
      network,
      destination,
      amount_usdt: amountUsdt,
      external_tx_hash: externalTxHash,
      operator_email: ctx?.email,
      executed_at: now,
      confirmed_at: now,
    })
    .select()
    .single();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const { data: updated, error: uErr } = await supabase
    .from('withdrawals')
    .update({
      status: 'completed',
      processed_at: now,
      reviewed_at: now,
      reviewed_by_email: ctx?.email,
    })
    .eq('id', withdrawalId)
    .select()
    .single();
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  await supabase.from('balance_ledger').insert({
    user_id: withdrawal.user_id,
    amount_usdt: -Number(withdrawal.amount),
    kind: 'payout_recorded',
    reference_id: payout.id,
    note: `Payout ${externalTxHash} (${network})`,
  });

  await audit(ctx, 'withdrawal.complete', {
    targetTable: 'withdrawals',
    targetId: withdrawalId,
    details: { network, destination, externalTxHash, amountUsdt },
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });

  return NextResponse.json({ withdrawal: updated, payout });
}

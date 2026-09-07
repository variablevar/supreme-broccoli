import { NextResponse } from 'next/server';
import { requireAdmin, getAdminContext } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import { paymentInput } from '@/modules/accounts/validation';
import { dbError, invalid } from '@/modules/http/errors';
export async function POST(req: Request) {
  const denied = await requireAdmin(); if (denied) return denied;
  const actor = await getAdminContext(); if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = paymentInput.safeParse(await req.json().catch(() => null)); if (!parsed.success) return invalid();
  const v = parsed.data;
  const { data, error } = await createAdminClient().rpc('record_payment', { p_id: v.withdrawalId, p_tx_hash: v.txHash, p_actor: actor.email });
  return error ? dbError(error) : NextResponse.json(data);
}

import { NextResponse } from 'next/server';
import { requireAdmin, getAdminContext } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import { adjustmentInput } from '@/modules/accounts/validation';
import { dbError, invalid } from '@/modules/http/errors';
export async function POST(req: Request) {
  const denied = await requireAdmin(); if (denied) return denied;
  const actor = await getAdminContext(); if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = adjustmentInput.safeParse(await req.json().catch(() => null)); if (!parsed.success) return invalid();
  const v = parsed.data;
  const { data, error } = await createAdminClient().rpc('adjust_balance', { p_user_id: v.userId, p_amount: v.amount, p_reason: v.reason, p_key: v.requestKey, p_actor: actor.email });
  return error ? dbError(error) : NextResponse.json(data);
}

import { NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/customerAuth';
import { createAdminClient } from '@/lib/supabase';
import { withdrawalInput } from '@/modules/accounts/validation';
import { dbError, invalid } from '@/modules/http/errors';
export async function POST(req: Request) {
  const guard = await requireCustomer(); if (!guard.ok) return guard.response;
  const parsed = withdrawalInput.safeParse(await req.json().catch(() => null)); if (!parsed.success) return invalid();
  const { data, error } = await createAdminClient().rpc('request_withdrawal', { p_user_id: guard.session.userId, p_amount: parsed.data.amount, p_key: parsed.data.requestKey });
  return error ? dbError(error) : NextResponse.json(data);
}
export async function GET() {
  const guard = await requireCustomer(); if (!guard.ok) return guard.response;
  const { data, error } = await createAdminClient().from('withdrawals').select('*').eq('user_id', guard.session.userId).order('created_at', { ascending: false }).limit(100);
  return error ? dbError(error) : NextResponse.json(data);
}

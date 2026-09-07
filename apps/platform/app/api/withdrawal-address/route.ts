import { NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/customerAuth';
import { createAdminClient } from '@/lib/supabase';
import { addressInput } from '@/modules/accounts/validation';
import { dbError, invalid } from '@/modules/http/errors';
export async function PUT(req: Request) {
  const guard = await requireCustomer(); if (!guard.ok) return guard.response;
  const parsed = addressInput.safeParse(await req.json().catch(() => null)); if (!parsed.success) return invalid();
  const { data, error } = await createAdminClient().from('withdrawal_addresses').upsert({ user_id: guard.session.userId, ...parsed.data, updated_at: new Date().toISOString() }).select('address,network,updated_at').single();
  return error ? dbError(error) : NextResponse.json(data);
}

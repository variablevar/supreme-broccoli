import { NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/customerAuth';
import { createAdminClient } from '@/lib/supabase';
import { pairingInput } from '@/modules/devices/validation';
import { allowAttempt } from '@/modules/auth/rate-limit';
import { dbError, invalid } from '@/modules/http/errors';
export async function POST(req:Request) {
  const guard=await requireCustomer(); if(!guard.ok) return guard.response;
  if(!await allowAttempt('pair:'+guard.session.userId,5)) return NextResponse.json({error:'Too many attempts. Try again later.'},{status:429});
  const parsed=pairingInput.safeParse(await req.json().catch(()=>null));if(!parsed.success)return invalid();
  const {data,error}=await createAdminClient().rpc('claim_device',{p_code:parsed.data.code,p_user_id:guard.session.userId});
  return error?dbError(error):NextResponse.json(data);
}

import { NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/customerAuth';
import { createAdminClient } from '@/lib/supabase';
import { dbError } from '@/modules/http/errors';
export async function GET() {
  const guard=await requireCustomer(); if(!guard.ok) return guard.response;
  const {data,error}=await createAdminClient().rpc('customer_account',{p_user_id:guard.session.userId});
  return error ? dbError(error) : data ? NextResponse.json(data) : NextResponse.json({error:'Account not found'},{status:404});
}

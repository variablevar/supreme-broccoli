import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import { dbError } from '@/modules/http/errors';
export async function GET() {
  const denied=await requireAdmin(); if(denied) return denied;
  const {data,error}=await createAdminClient().rpc('admin_overview');
  return error ? dbError(error) : NextResponse.json(data);
}

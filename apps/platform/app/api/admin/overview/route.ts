import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import { dbError } from '@/modules/http/errors';
export async function GET() {
  const denied=await requireAdmin(); if(denied) return denied;
  const supabase=createAdminClient();
  const [{data,error},{data:contactInquiries,error:contactError}]=await Promise.all([
    supabase.rpc('admin_overview'),
    supabase.from('contact_inquiries').select('id,name,email,subject,message,status,created_at,updated_at').order('created_at',{ascending:false}).limit(200),
  ]);
  if(error)return dbError(error);if(contactError)return dbError(contactError);
  return NextResponse.json({...data,contact_inquiries:contactInquiries??[]});
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, getAdminContext } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import { dbError, invalid } from '@/modules/http/errors';
const schema=z.object({decision:z.enum(['approved','rejected']),reason:z.string().trim().max(300).optional()}).strict();
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}) {
  const denied=await requireAdmin();if(denied)return denied;
  const actor=await getAdminContext();if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
  const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return invalid();
  const {id}=await params;const {data,error}=await createAdminClient().rpc('decide_registration_application',{p_id:id,p_decision:parsed.data.decision,p_actor:actor.email,p_reason:parsed.data.reason||null});
  return error?dbError(error):NextResponse.json(data);
}

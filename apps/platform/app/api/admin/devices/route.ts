import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAdmin,getAdminContext } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import { newToken,tokenHash } from '@/modules/auth/tokens';
import { provisionInput } from '@/modules/devices/validation';
import { dbError,invalid } from '@/modules/http/errors';
export async function POST(req:Request) {
  const denied=await requireAdmin();if(denied)return denied;
  const actor=await getAdminContext();if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
  const parsed=provisionInput.safeParse(await req.json().catch(()=>null));if(!parsed.success)return invalid();
  const secret=newToken(),uid='IMO-'+randomUUID().slice(0,8).toUpperCase();
  const {data,error}=await createAdminClient().rpc('provision_device',{p_uid:uid,p_name:parsed.data.name,p_hash:tokenHash(secret),p_actor:actor.email});
  return error?dbError(error):NextResponse.json({id:data,uid,secret},{status:201});
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin,getAdminContext } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import { dbError,invalid } from '@/modules/http/errors';
export async function POST(_req:Request,ctx:{params:Promise<{id:string}>}) {
  const denied=await requireAdmin();if(denied)return denied;
  const actor=await getAdminContext();if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
  const {id}=await ctx.params;if(!z.string().uuid().safeParse(id).success)return invalid();
  const {error}=await createAdminClient().rpc('revoke_device',{p_id:id,p_actor:actor.email});
  return error?dbError(error):NextResponse.json({ok:true});
}

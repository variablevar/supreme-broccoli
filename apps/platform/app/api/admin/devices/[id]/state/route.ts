import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin,getAdminContext } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import { publishInput } from '@/modules/devices/validation';
import { dbError,invalid } from '@/modules/http/errors';
export async function PUT(req:Request,ctx:{params:Promise<{id:string}>}) {
  const denied=await requireAdmin();if(denied)return denied;
  const actor=await getAdminContext();if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
  const {id}=await ctx.params;if(!z.string().uuid().safeParse(id).success)return invalid();
  const parsed=publishInput.safeParse(await req.json().catch(()=>null));if(!parsed.success)return invalid();
  const {data,error}=await createAdminClient().rpc('publish_device',{p_device_id:id,p_content:parsed.data.content,p_expected_version:parsed.data.expectedVersion,p_actor:actor.email});
  return error?dbError(error):NextResponse.json(data);
}

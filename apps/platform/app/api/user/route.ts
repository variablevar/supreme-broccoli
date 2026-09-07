import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { requireCustomer } from '@/lib/customerAuth';
import { dbError,invalid } from '@/modules/http/errors';
const schema=z.object({language:z.enum(['bn','ar','ur','pk','hi','en-US','en-GB','de','ja','zh','nl','es','fr']).optional(),theme:z.enum(['dark','light','system']).optional()}).strict().refine(v=>v.language||v.theme);
export async function GET(){const guard=await requireCustomer();if(!guard.ok)return guard.response;const {data,error}=await createAdminClient().from('users').select('id,uid,email,language_preference,theme_preference').eq('id',guard.session.userId).single();return error?dbError(error):NextResponse.json(data);}
export async function POST(req:Request){const guard=await requireCustomer();if(!guard.ok)return guard.response;const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return invalid();const v=parsed.data;const {error}=await createAdminClient().from('users').update({...v.language?{language_preference:v.language}:{},...v.theme?{theme_preference:v.theme}:{},updated_at:new Date().toISOString()}).eq('id',guard.session.userId);return error?dbError(error):NextResponse.json({ok:true});}

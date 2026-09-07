import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { requireDevice } from '@/modules/devices/auth';
import { createAdminClient } from '@/lib/supabase';
import { allowAttempt } from '@/modules/auth/rate-limit';
import { dbError } from '@/modules/http/errors';
export async function POST(req:Request) {
  const guard=await requireDevice(req);if(!guard.ok)return guard.response;
  if(!await allowAttempt('device-pair:'+guard.device.id,6,60))return NextResponse.json({error:'Slow down'},{status:429});
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(let i=0;i<5;i++) {
    const code=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');
    const {data,error}=await createAdminClient().rpc('issue_pairing',{p_device_id:guard.device.id,p_code:code});
    if(!error)return NextResponse.json(data);
    if(error.code!=='23505')return dbError(error);
  }
  return NextResponse.json({error:'Could not issue pairing code. Retry.'},{status:503});
}

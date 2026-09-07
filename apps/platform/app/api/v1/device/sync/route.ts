import { NextResponse } from 'next/server';
import { requireDevice } from '@/modules/devices/auth';
import { syncInput } from '@/modules/devices/validation';
import { createAdminClient } from '@/lib/supabase';
import { allowAttempt } from '@/modules/auth/rate-limit';
import { dbError,invalid } from '@/modules/http/errors';
export async function POST(req:Request) {
  const guard=await requireDevice(req);if(!guard.ok)return guard.response;
  if(!await allowAttempt('sync:'+guard.device.id,12,60)) return NextResponse.json({error:'Slow down'},{status:429});
  const parsed=syncInput.safeParse(await req.json().catch(()=>null));if(!parsed.success)return invalid();
  const v=parsed.data;
  const {data,error}=await createAdminClient().rpc('sync_device',{p_device_id:guard.device.id,p_firmware:v.firmware,p_uptime:v.uptimeSeconds,p_rssi:v.wifiRssi,p_applied:v.appliedVersion});
  return error?dbError(error):NextResponse.json(data);
}

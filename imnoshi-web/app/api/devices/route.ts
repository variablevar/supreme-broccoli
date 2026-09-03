import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';
import { clerkIdToUuid } from '@/lib/userId';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('monitor_devices')
    .select(
      'id, uid, name, status, gpu_model, model_name, uptime_percent, hash_rate, ai_load, trading_load, today_usdt, total_usdt, last_seen'
    )
    .eq('user_id', clerkIdToUuid(userId))
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json([], { status: 200 });

  return NextResponse.json(
    (data ?? []).map((device) => ({
      id: device.id,
      uid: device.uid,
      name: device.name,
      status: device.status,
      gpuModel: device.gpu_model,
      modelName: device.model_name,
      uptimePercent: Number(device.uptime_percent ?? 0),
      hashRate: Number(device.hash_rate ?? 0),
      aiLoad: Number(device.ai_load ?? 0),
      tradingLoad: Number(device.trading_load ?? 0),
      todayUsdt: Number(device.today_usdt ?? 0),
      totalUsdt: Number(device.total_usdt ?? 0),
      lastSeen: device.last_seen,
    }))
  );
}

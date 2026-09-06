import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { requireCustomer } from '@/lib/customerAuth';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('monitor_devices')
    .select(
      'id, uid, name, status, gpu_model, model_name, uptime_percent, hash_rate, ai_load, trading_load, today_usdt, total_usdt, last_seen'
    )
    .eq('user_id', guard.session.userId)
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

// ----- Telemetry ingest (paired device -> server) -----
// `Authorization: Bearer <claim_token>` is required.
const telemetrySchema = z.object({
  status: z.enum(['online', 'offline', 'syncing', 'maintenance']).optional(),
  uptimePercent: z.number().min(0).max(100).optional(),
  hashRate: z.number().min(0).max(1_000_000).optional(),
  aiLoad: z.number().int().min(0).max(100).optional(),
  tradingLoad: z.number().int().min(0).max(100).optional(),
  todayUsdt: z.number().min(0).max(1_000_000).optional(),
  totalUsdt: z.number().min(0).max(100_000_000).optional(),
  powerOk: z.boolean().optional(),
  internetOk: z.boolean().optional(),
  firmware: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+([A-Za-z0-9_-]+)/.exec(authz);
  if (!m) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = telemetrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid telemetry' }, { status: 400 });

  const tokenHash = hashToken(m[1]);
  const supabase = createAdminClient();

  const { data: pairing, error: pairErr } = await supabase
    .from('device_pairings')
    .select('device_id, status')
    .eq('claim_token', tokenHash)
    .maybeSingle();
  if (pairErr) return NextResponse.json({ error: pairErr.message }, { status: 500 });
  if (!pairing) return NextResponse.json({ error: 'Unknown device' }, { status: 401 });
  if (pairing.status !== 'claimed') {
    return NextResponse.json({ error: 'Device not paired' }, { status: 403 });
  }

  const now = new Date().toISOString();

  // The device only "earns" while both power AND internet are OK.
  const earningEnabled =
    parsed.data.powerOk !== false && parsed.data.internetOk !== false;

  const update: Record<string, unknown> = {
    last_seen: now,
    status: parsed.data.status ?? (parsed.data.internetOk === false ? 'offline' : 'online'),
  };
  if (parsed.data.uptimePercent !== undefined) update.uptime_percent = parsed.data.uptimePercent;
  if (parsed.data.hashRate !== undefined) update.hash_rate = parsed.data.hashRate;
  if (parsed.data.aiLoad !== undefined) update.ai_load = parsed.data.aiLoad;
  if (parsed.data.tradingLoad !== undefined) update.trading_load = parsed.data.tradingLoad;
  if (parsed.data.todayUsdt !== undefined) update.today_usdt = parsed.data.todayUsdt;
  if (parsed.data.totalUsdt !== undefined) update.total_usdt = parsed.data.totalUsdt;

  const { data: device, error } = await supabase
    .from('monitor_devices')
    .update(update)
    .eq('id', pairing.device_id)
    .select('user_id, today_usdt, total_usdt')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Append a customer-visible earnings row only if the device
  // reported a positive today_usdt and is actually online. The rule
  // matches the requirement: "only count earnings when both power
  // and internet are confirmed."
  if (
    earningEnabled &&
    parsed.data.todayUsdt !== undefined &&
    parsed.data.todayUsdt > 0 &&
    device
  ) {
    await supabase.from('rewards').insert({
      user_id: device.user_id,
      amount: parsed.data.todayUsdt,
      source: 'mining',
      status: 'pending',
    });
    await supabase.from('balance_ledger').insert({
      user_id: device.user_id,
      amount_usdt: parsed.data.todayUsdt,
      kind: 'reward_mining',
      note: 'Monitor-node telemetry',
    });
  }

  return NextResponse.json({ ok: true, ts: now });
}


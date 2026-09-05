import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import crypto from 'crypto';

// The ESP32 polls this every minute (configurable). Authenticated by
// the same bearer token it received via the QR pairing flow. We
// compare SHA-256(plain_token) against device_pairings.claim_token.
//
// Also enforces a per-IP daily request cap to limit attack surface.

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getClientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

const DAILY_LIMIT = 60 * 24; // 1 / minute * 24 hours

export async function GET(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+([A-Za-z0-9_-]+)/.exec(authz);
  if (!m) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  // Per-IP rate counter (best-effort; if it fails we just allow).
  const ip = getClientIp(req);
  const today = new Date().toISOString().slice(0, 10);
  const scope = `telemetry:${ip}`;
  try {
    await supabase.rpc('increment_rate_counter', { p_date: today, p_scope: scope });
  } catch {
    // RPC may not be defined -- ignore.
  }
  const { data: countRow } = await supabase
    .from('rate_counters')
    .select('count')
    .eq('bucket_date', today)
    .eq('scope', scope)
    .maybeSingle();
  const count = countRow?.count ?? 0;
  if (typeof count === 'number' && count > DAILY_LIMIT) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Pick up and consume any commands queued by admin.
  const { data: commands } = await supabase
    .from('device_commands')
    .select('id, command, payload')
    .eq('device_id', pairing.device_id)
    .is('consumed_at', null)
    .order('created_at', { ascending: true })
    .limit(20);

  if (commands && commands.length > 0) {
    await supabase
      .from('device_commands')
      .update({
        consumed_at: new Date().toISOString(),
        consumed_status: 'delivered',
      })
      .in('id', commands.map((c) => c.id));
  }

  // Look up current device config so the firmware can refresh display.
  const { data: device } = await supabase
    .from('monitor_devices')
    .select('uid, name, status, gpu_model, model_name')
    .eq('id', pairing.device_id)
    .single();

  return NextResponse.json({
    device: device ?? null,
    commands: (commands ?? []).map((c) => ({
      id: c.id,
      command: c.command,
      payload: c.payload,
    })),
    serverTime: new Date().toISOString(),
    heartbeatSeconds: 60,
  });
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const schema = z.object({
  currentPage: z.number().int().min(0).max(15).optional(),
  brightnessPct: z.number().int().min(0).max(100).optional(),
  freeHeap: z.number().int().nonnegative().optional(),
  wifiRssi: z.number().int().min(-120).max(0).optional(),
  uptimeSeconds: z.number().int().nonnegative().optional(),
  firmware: z.string().max(60).optional(),
});

/**
 * Bearer-token authenticated. The device posts its own runtime state
 * (current page index, brightness, free heap, RSSI, uptime) so the
 * admin dashboard can show "device X is on page 2 at 73% brightness".
 *
 * UPSERTs into public.device_runtime_state keyed by device_id.
 */
export async function POST(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+([A-Za-z0-9_-]+)/.exec(authz);
  if (!m) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const tokenHash = hashToken(m[1]);
  const supabase = createAdminClient();

  const { data: pairing, error: pairErr } = await supabase
    .from('device_pairings')
    .select('device_id, status')
    .eq('claim_token', tokenHash)
    .maybeSingle();
  if (pairErr) return NextResponse.json({ error: pairErr.message }, { status: 500 });
  if (!pairing || pairing.status !== 'claimed') {
    return NextResponse.json({ error: 'Device not paired' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('device_runtime_state')
    .upsert(
      {
        device_id: pairing.device_id,
        current_page: parsed.data.currentPage ?? null,
        brightness_pct: parsed.data.brightnessPct ?? null,
        free_heap: parsed.data.freeHeap ?? null,
        wifi_rssi: parsed.data.wifiRssi ?? null,
        uptime_seconds: parsed.data.uptimeSeconds ?? null,
        firmware: parsed.data.firmware ?? null,
        last_seen: now,
      },
      { onConflict: 'device_id' }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ts: now });
}

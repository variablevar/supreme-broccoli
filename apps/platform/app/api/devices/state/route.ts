import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Bearer-token authenticated.
 *
 * Returns the full DeviceMetrics shape that the firmware renders. Fields
 * are populated from:
 *   monitor_devices        -> uid, status, hardware metrics, last_seen
 *   users / wallets        -> connected USDT (TRC20) wallet + protocol
 *   device_state_overrides -> per-device display overrides set by admin
 *   device_pairings        -> the claim token is only used here to
 *                              identify which device; we never echo it
 *                              back to the firmware
 *
 * Network / power / mining values are server-derived. Today they're
 * realistic-looking default numbers that vary a little per request;
 * once you wire up your actual telemetry path you can replace those
 * formulas with the live ones. The device sends raw counters through
 * POST /api/devices/config; this endpoint does the math.
 */
export async function GET(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+([A-Za-z0-9_-]+)/.exec(authz);
  if (!m) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tokenHash = hashToken(m[1]);
  const supabase = createAdminClient();

  const { data: pairing, error: pairErr } = await supabase
    .from('device_pairings')
    .select('device_id, user_id, status')
    .eq('claim_token', tokenHash)
    .maybeSingle();
  if (pairErr) return NextResponse.json({ error: pairErr.message }, { status: 500 });
  if (!pairing) return NextResponse.json({ error: 'Unknown device' }, { status: 401 });
  if (pairing.status !== 'claimed') {
    return NextResponse.json({ error: 'Device not paired' }, { status: 403 });
  }

  const [{ data: device, error: devErr }, { data: userRow }, { data: walletRow }, { data: overridesRow }] = await Promise.all([
    supabase
      .from('monitor_devices')
      .select('id, uid, name, status, gpu_model, model_name, uptime_percent, hash_rate, ai_load, trading_load, today_usdt, total_usdt, last_seen')
      .eq('id', pairing.device_id)
      .single(),
    supabase.from('users').select('id, uid, email').eq('id', pairing.user_id).maybeSingle(),
    supabase
      .from('wallets')
      .select('symbol, chain, address')
      .eq('user_id', pairing.user_id)
      .eq('symbol', 'ETH')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('device_state_overrides').select('*').eq('device_id', pairing.device_id).maybeSingle(),
  ]);

  if (devErr) return NextResponse.json({ error: devErr.message }, { status: 500 });
  if (!device) return NextResponse.json({ error: 'Device row missing' }, { status: 404 });

  const overrides = (overridesRow ?? {}) as {
    currency?: string | null;
    mining_display?: string | null;
    refresh_ms?: number | null;
    currency_shuffle?: boolean | null;
    paired_page_text?: string | null;
  };

  // Simple deterministic-ish network + power numbers so the firmware's
  // display can show believable values. Replace with real telemetry
  // once you wire up POST /api/devices/config end-to-end.
  const seed = crypto.createHash('sha256').update(device.id).digest();
  const downloadMbps = 40 + (seed[0] / 255) * 80;
  const uploadMbps = 8 + (seed[1] / 255) * 25;
  const watts = 35 + (seed[2] / 255) * 30;
  const energyTodayWh = watts * (device.uptime_percent ?? 0) * 0.24;

  const currencies = ['BTC', 'ETH', 'SOL', 'DOGE', 'LTC', 'XMR', 'PEARL'] as const;
  const activeCurrency = (overrides.currency as (typeof currencies)[number] | undefined)
    ?? currencies[device.id.charCodeAt(0) % currencies.length];

  const lastSeen = device.last_seen ? new Date(device.last_seen).getTime() : 0;
  const online = lastSeen > Date.now() - 90 * 1000;

  return NextResponse.json({
    uid: device.uid,
    userName: (userRow as { email?: string } | null)?.email ?? 'Unknown user',
    online,
    status: device.status,
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - lastSeen) / 1000)),
    network: {
      downloadMbps: Number(downloadMbps.toFixed(1)),
      uploadMbps: Number(uploadMbps.toFixed(1)),
    },
    power: {
      watts: Number(watts.toFixed(1)),
      energyTodayWh: Number(energyTodayWh.toFixed(0)),
    },
    mining: {
      currency: activeCurrency,
      isStaking: activeCurrency === 'ETH' || activeCurrency === 'SOL' || activeCurrency === 'PEARL',
      rate: Number((40 + (seed[3] / 255) * 60).toFixed(1)),
      dailyUsdt: Number(Number(device.today_usdt ?? 0).toFixed(2)),
    },
    wallet: {
      protocol: (walletRow as { chain?: string } | null)?.chain ?? 'Ethereum',
      address: (walletRow as { address?: string } | null)?.address ?? 'Not connected',
      balanceUsdt: Number(Number(device.total_usdt ?? 0).toFixed(2)),
    },
    dailyRevenueUsdt: Number(Number(device.today_usdt ?? 0).toFixed(2)),
    overrides: {
      currency: overrides.currency ?? null,
      miningDisplay: overrides.mining_display ?? null,
      refreshMs: overrides.refresh_ms ?? null,
      currencyShuffle: overrides.currency_shuffle ?? null,
      pairedPageText: overrides.paired_page_text ?? null,
    },
    serverTime: new Date().toISOString(),
  });
}

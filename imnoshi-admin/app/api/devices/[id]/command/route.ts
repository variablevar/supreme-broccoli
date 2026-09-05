import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { audit, getAdminContext, requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

const schema = z.object({
  command: z.enum([
    // Phase 1 commands.
    'push_config',
    'reset_claim',
    'set_status',
    'force_telemetry_ping',
    // Phase 2: server-driven display overrides. These write to
    // device_state_overrides so the next /api/devices/state response
    // returns the new values.
    'set_currency',
    'set_mining_display',
    'set_refresh_ms',
    'set_currency_shuffle',
    'set_paired_page_text',
  ]),
  // Optional payload per command.
  config: z.record(z.unknown()).optional(),
  status: z.enum(['online', 'offline', 'syncing', 'maintenance']).optional(),
  currency: z.enum(['BTC', 'ETH', 'SOL', 'DOGE', 'LTC', 'XMR', 'PEARL']).optional(),
  miningDisplay: z.enum(['hashrate', 'apr', 'both']).optional(),
  refreshMs: z.number().int().min(2000).max(60000).optional(),
  currencyShuffle: z.boolean().optional(),
  pairedPageText: z.string().max(160).optional(),
});

/**
 * Push a command to a device. Full-admin only.
 *
 * Implementation: the firmware does NOT hold a persistent websocket
 * back to the admin (that would complicate WiFi reliability behind
 * NAT). The device polls /api/devices/poll every minute and consumes
 * any commands queued for its claim token. So this route:
 *
 *   - For Phase-1 ops commands, writes a row into device_commands and
 *     audit.
 *   - For Phase-2 display overrides, UPDATES device_state_overrides so
 *     the next /api/devices/state response reflects them, and ALSO
 *     appends a device_commands row so the device wakes up
 *     immediately rather than waiting for the next 15 s state poll.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const denied = await requireAdmin();
  if (denied) return denied;
  const ctx = await getAdminContext();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const supabase = createAdminClient();

  // Look up the device's current claim token so the firmware can
  // authenticate to the poll endpoint with it.
  const { data: pairing, error: pairErr } = await supabase
    .from('device_pairings')
    .select('claim_token')
    .eq('device_id', id)
    .order('claimed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pairErr) return NextResponse.json({ error: pairErr.message }, { status: 500 });
  if (!pairing) {
    return NextResponse.json(
      { error: 'Device has never been paired' },
      { status: 409 }
    );
  }

  // Phase-2 display overrides: update the override row.
  if (
    ['set_currency', 'set_mining_display', 'set_refresh_ms',
     'set_currency_shuffle', 'set_paired_page_text'].includes(parsed.data.command)
  ) {
    const patch: Record<string, unknown> = {
      device_id: id,
      updated_by_email: ctx?.email,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.command === 'set_currency' && parsed.data.currency) {
      patch.currency = parsed.data.currency;
    } else if (parsed.data.command === 'set_mining_display' && parsed.data.miningDisplay) {
      patch.mining_display = parsed.data.miningDisplay;
    } else if (parsed.data.command === 'set_refresh_ms' && parsed.data.refreshMs) {
      patch.refresh_ms = parsed.data.refreshMs;
    } else if (parsed.data.command === 'set_currency_shuffle' && parsed.data.currencyShuffle !== undefined) {
      patch.currency_shuffle = parsed.data.currencyShuffle;
    } else if (parsed.data.command === 'set_paired_page_text' && parsed.data.pairedPageText) {
      patch.paired_page_text = parsed.data.pairedPageText;
    }
    const { error: ovErr } = await supabase
      .from('device_state_overrides')
      .upsert(patch, { onConflict: 'device_id' });
    if (ovErr) return NextResponse.json({ error: ovErr.message }, { status: 500 });
  }

  // Always queue a device_commands row so the device wakes within the
  // next minute. This is how Phase-2 commands propagate too -- the
  // command payload tells the firmware to re-fetch /api/devices/state.
  const { data, error } = await supabase
    .from('device_commands')
    .insert({
      device_id: id,
      command: parsed.data.command,
      payload: {
        config: parsed.data.config ?? null,
        status: parsed.data.status ?? null,
        currency: parsed.data.currency ?? null,
        miningDisplay: parsed.data.miningDisplay ?? null,
        refreshMs: parsed.data.refreshMs ?? null,
        currencyShuffle: parsed.data.currencyShuffle ?? null,
        pairedPageText: parsed.data.pairedPageText ?? null,
      },
      created_by_email: ctx?.email,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit(ctx, `device.${parsed.data.command}`, {
    targetTable: 'device_commands',
    targetId: data.id,
    details: { device_id: id, payload: data.payload },
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });
  return NextResponse.json(data);
}

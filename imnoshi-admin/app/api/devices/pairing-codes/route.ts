import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase';
import { audit, getAdminContext, requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

const schema = z.object({
  customerEmail: z.string().email(),
  deviceName: z.string().min(2).max(80),
});

// Pairing codes expire after this many minutes.
const CODE_TTL_MIN = 15;

function generateCode(): string {
  // 6 chars, A-Z and 2-9 (no confusing 0/O/1/I).
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a single-use pairing code tied to a customer. The customer
 * redeems the code on /devices/pair, the web app writes
 * device_pairings with status='claimed' and a brand-new claim token;
 * the device then polls /api/devices/poll and persists the claim token.
 *
 * Token hygiene: claim tokens we hand out to devices are stored only
 * as a SHA-256. The plain token is shown to the admin exactly once
 * in the response (and never again).
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ctx = await getAdminContext();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const supabase = createAdminClient();

  // Look up the customer's Clerk user ID by email. If the customer
  // hasn't signed in yet, this returns 404.
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, uid, email')
    .eq('email', parsed.data.customerEmail.toLowerCase())
    .maybeSingle();
  if (userErr || !user) {
    return NextResponse.json(
      { error: 'Customer must register / sign in once before pairing a device' },
      { status: 404 }
    );
  }

  // Issue a brand-new claim token. Stored as a hash on the device.
  const claimToken = crypto.randomBytes(24).toString('base64url');

  // Generate a code, retry on collision.
  let code = generateCode();
  for (let i = 0; i < 5; i += 1) {
    const { data: existing } = await supabase
      .from('device_pairings')
      .select('code')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
    code = generateCode();
  }

  // First create a placeholder monitor_devices row so the device has
  // something to bind to when it claims.
  const { data: device, error: devErr } = await supabase
    .from('monitor_devices')
    .insert({
      uid: `IMN-NEW-${Date.now().toString(36).toUpperCase()}`,
      user_id: user.id,
      name: parsed.data.deviceName,
      status: 'offline',
      gpu_model: 'Dedicated GPU Lane',
      model_name: 'IMNOSHI Quant LLM',
    })
    .select('id')
    .single();
  if (devErr || !device) {
    return NextResponse.json({ error: devErr?.message ?? 'Could not provision device' }, { status: 500 });
  }

  const { error: pairErr } = await supabase.from('device_pairings').insert({
    code,
    status: 'pending',
    claim_token: hashToken(claimToken),
    device_id: device.id,
    user_id: user.id,
    created_by_email: ctx?.email,
  });
  if (pairErr) return NextResponse.json({ error: pairErr.message }, { status: 500 });

  await audit(ctx, 'device.pairing_code_issued', {
    targetTable: 'device_pairings',
    targetId: code,
    details: { customer: user.email, device_id: device.id },
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });

  return NextResponse.json({
    code,
    expiresMinutes: CODE_TTL_MIN,
    // Shown ONCE for the admin to put into the device firmware's
    // provisioning step (e.g. via USB serial). After this the device
    // will discover its token via the QR/claim flow, so this is a
    // belt-and-braces channel only.
    initialClaimToken: claimToken,
    deviceId: device.id,
    customerUid: user.uid,
    customerEmail: user.email,
  });
}

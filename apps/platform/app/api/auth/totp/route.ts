import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { requireCustomer } from '@/lib/customerAuth';
import {
  byteaToBuffer,
  decryptSecret,
  encryptSecret,
  enrollmentFromSecret,
  generateFreshSecret,
  PENDING_TOTP_TTL_MS,
  verifyTotp,
} from '@/lib/customerTotp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/totp
 * Returns the TOTP QR + secret for the signed-in customer. The
 * secret is encrypted and persisted to pending_totp_secret so the
 * confirming POST can verify against the SAME secret (otherwise we'd
 * mint a fresh one on every call and the user's authenticator app and
 * our verifier would never agree).
 *
 * Caller must be fully signed in (stage='done').
 */
export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const secret = generateFreshSecret();
  const enrollment = await enrollmentFromSecret(guard.session.email, secret, true);
  const expiresAt = new Date(Date.now() + PENDING_TOTP_TTL_MS).toISOString();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('web_users')
    .update({
      pending_totp_secret: `\\x${encryptSecret(secret).toString('hex')}`,
      pending_totp_secret_expires_at: expiresAt,
    })
    .eq('id', guard.session.sub);
  if (error) {
    return NextResponse.json(
      { error: `Failed to persist TOTP enrollment: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    email: guard.session.email,
    secret: enrollment.secret,
    otpauthUrl: enrollment.otpauthUrl,
    qrDataUrl: enrollment.qrDataUrl,
  });
}

const postSchema = z.object({
  totpCode: z.string().min(6).max(6),
});

/**
 * POST /api/auth/totp
 * Body: { totpCode }
 * Reads pending_totp_secret from DB, verifies the submitted code
 * against it, then promotes the pending secret to
 * totp_secret_encrypted and clears the pending row.
 */
export async function POST(req: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { totpCode } = parsed.data;

  const supabase = createAdminClient();
  const { data: row, error: selErr } = await supabase
    .from('web_users')
    .select('pending_totp_secret, pending_totp_secret_expires_at')
    .eq('id', guard.session.sub)
    .maybeSingle();
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!row?.pending_totp_secret) {
    return NextResponse.json(
      { error: 'TOTP enrollment expired. Open the QR again to start over.' },
      { status: 410 }
    );
  }
  if (
    row.pending_totp_secret_expires_at &&
    new Date(row.pending_totp_secret_expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: 'TOTP enrollment expired. Open the QR again to start over.' },
      { status: 410 }
    );
  }

  const blob = byteaToBuffer(row.pending_totp_secret);
  const secret = decryptSecret(blob);
  if (!verifyTotp(secret, totpCode)) {
    return NextResponse.json({ error: 'Invalid 6-digit code' }, { status: 400 });
  }

  const { error } = await supabase
    .from('web_users')
    .update({
      totp_secret_encrypted: `\\x${encryptSecret(secret).toString('hex')}`,
      totp_enrolled: true,
      pending_totp_secret: null,
      pending_totp_secret_expires_at: null,
    })
    .eq('id', guard.session.sub);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/auth/totp
 * Removes the TOTP enrollment for the current account (used by the
 * "disable 2FA" flow in Settings). Requires the current password as
 * proof.
 */
const deleteSchema = z.object({ currentPassword: z.string().min(1).max(256) });

export async function DELETE(req: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('web_users')
    .select('password_hash')
    .eq('id', guard.session.sub)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const bcrypt = await import('bcryptjs');
  if (!(await bcrypt.compare(parsed.data.currentPassword, data.password_hash))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  const { error } = await supabase
    .from('web_users')
    .update({
      totp_secret_encrypted: null,
      totp_enrolled: false,
      pending_totp_secret: null,
      pending_totp_secret_expires_at: null,
    })
    .eq('id', guard.session.sub);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

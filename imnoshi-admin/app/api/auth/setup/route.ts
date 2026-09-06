import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import {
  getSession,
  startSession,
} from '@/lib/adminAuth';
import {
  byteaToBuffer,
  decryptSecretFromDb,
  encryptSecretForDb,
  enrollmentFromSecret,
  generateFreshSecret,
  PENDING_TOTP_TTL_MS,
  verifyTotp,
} from '@/lib/adminTotp';

export const dynamic = 'force-dynamic';

const getSchema = z.object({});

/**
 * GET /api/auth/setup
 * Returns the TOTP QR code + secret for the currently-signed-in admin.
 * The secret is encrypted and written to pending_totp_secret with a
 * short expiry so the confirming POST can verify against the SAME
 * secret (otherwise we'd mint a fresh one on every call and the
 * user's authenticator app and our verifier would never agree).
 *
 * Caller must be in the 'reset' stage (i.e. first login, hasn't set up
 * TOTP yet).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.stage !== 'reset') {
    return NextResponse.json({ error: 'Already set up' }, { status: 409 });
  }

  const secret = generateFreshSecret();
  const enrollment = await enrollmentFromSecret(session.email, secret, true);
  const expiresAt = new Date(Date.now() + PENDING_TOTP_TTL_MS).toISOString();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('admin_users')
    .update({
      pending_totp_secret: encryptSecretForDb(secret),
      pending_totp_secret_expires_at: expiresAt,
    })
    .eq('id', session.sub);
  if (error) {
    return NextResponse.json(
      { error: `Failed to persist TOTP enrollment: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    email: session.email,
    secret: enrollment.secret,
    otpauthUrl: enrollment.otpauthUrl,
    qrDataUrl: enrollment.qrDataUrl,
  });
}

const postSchema = z.object({
  newPassword: z.string().min(10).max(256),
  totpCode: z.string().min(6).max(6),
});

/**
 * POST /api/auth/setup
 * Body: { newPassword, totpCode }
 * - hashes and stores the new password
 * - reads the pending TOTP secret from DB and verifies the submitted
 *   6-digit code against it (same secret the QR was generated from)
 * - persists the now-confirmed secret to totp_secret_encrypted and
 *   clears pending_totp_secret
 * - upgrades the session to 'done'
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.stage !== 'reset') {
    return NextResponse.json({ error: 'Already set up' }, { status: 409 });
  }

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { newPassword, totpCode } = parsed.data;

  const supabase = createAdminClient();
  const { data: row, error: selErr } = await supabase
    .from('admin_users')
    .select('pending_totp_secret, pending_totp_secret_expires_at')
    .eq('id', session.sub)
    .maybeSingle();
  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }
  if (!row?.pending_totp_secret) {
    return NextResponse.json(
      { error: 'TOTP enrollment expired. Reload the page to get a new QR.' },
      { status: 410 }
    );
  }
  if (
    row.pending_totp_secret_expires_at &&
    new Date(row.pending_totp_secret_expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: 'TOTP enrollment expired. Reload the page to get a new QR.' },
      { status: 410 }
    );
  }

  // Supabase JS returns bytea in one of several shapes -- use the
  // shared helper to coerce it into a real Buffer.
  const blob = byteaToBuffer(row.pending_totp_secret);
  const secret = decryptSecretFromDb(blob);
  if (!verifyTotp(secret, totpCode)) {
    return NextResponse.json(
      {
        error:
          'Invalid or expired 6-digit code. The code refreshes every 30s; try again with the latest one.',
      },
      { status: 400 }
    );
  }

  const bcrypt = await import('bcryptjs');
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  const secretBlob = encryptSecretForDb(secret);

  const { error: upErr } = await supabase
    .from('admin_users')
    .update({
      password_hash: passwordHash,
      totp_secret_encrypted: secretBlob,
      totp_enrolled: true,
      must_reset_password: false,
      // Clear the pending row so it can't be replayed.
      pending_totp_secret: null,
      pending_totp_secret_expires_at: null,
    })
    .eq('id', session.sub);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  await startSession(
    res,
    { id: session.sub, email: session.email },
    'done'
  );
  return res;
}
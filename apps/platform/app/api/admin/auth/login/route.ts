import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  clearSessionCookie,
  startSession,
  verifyPassword,
} from '@/lib/adminAuth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * On success sets the session cookie and returns the next stage:
 *   - 'reset' = forced first-login password + TOTP enrollment
 *   - 'totp'  = password ok but TOTP pending
 *   - 'done'  = fully signed in
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  let result;
  try {
    result = await verifyPassword(email, password);
  } catch (err) {
    // Surface the real cause so a missing-table or wrong Supabase
    // credentials doesn't get masked as a generic login failure.
    const message = err instanceof Error ? err.message : 'Login failed';
    const isMissingTable = /does not exist|relation .* does not exist|42P01/i.test(message);
    return NextResponse.json(
      {
        error: isMissingTable
          ? 'Admin users table is missing. Apply the 20260907100000 migration in Supabase.'
          : message,
        reason: isMissingTable ? 'table_missing' : 'server_error',
      },
      { status: 500 }
    );
  }

  if (!result.ok || !result.account) {
    // Differentiate "no such email" from "wrong password" so the UI
    // can surface an actionable hint (e.g. don't paste your UID).
    const reason = result.reason ?? 'bad_password';
    const errorMessage =
      reason === 'unknown_email'
        ? 'No admin account with that email. Allowed addresses are set via ADMIN_EMAILS.'
        : reason === 'locked'
          ? 'Account locked. Try again in 15 minutes.'
          : 'Wrong password. For first login the shared password is Imnoshi@2026.';
    const res = NextResponse.json(
      { error: errorMessage, reason },
      { status: 401 }
    );
    await clearSessionCookie(res);
    return res;
  }

  // Stage routing:
//   must_reset_password = true  -> 'reset' (first-login setup wizard)
//   totp_enrolled        = true -> 'totp'  (still need the 6-digit code)
//   otherwise                  -> 'done'  (password-only sign-in)
const stage: 'reset' | 'totp' | 'done' = result.account.must_reset_password
  ? 'reset'
  : result.account.totp_enrolled
    ? 'totp'
    : 'done';

  const res = NextResponse.json({ stage, email: result.account.email });
  await startSession(res, result.account, stage);
  return res;
}
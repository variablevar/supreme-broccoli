import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  clearSessionCookie,
  startSession,
  verifyPassword,
} from '@/lib/customerAuth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

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
    const message = err instanceof Error ? err.message : 'Login failed';
    const isMissingTable = /does not exist|relation .* does not exist|42P01/i.test(message);
    return NextResponse.json(
      {
        error: isMissingTable
          ? 'web_users table is missing. Apply migration 20260907120000 in Supabase.'
          : message,
        reason: isMissingTable ? 'table_missing' : 'server_error',
      },
      { status: 500 }
    );
  }

  if (!result.ok || !result.account || !result.appUser) {
    // Distinguish between "no account with that email" and "email
    // exists but password is wrong" -- the latter is far more common
    // (typos, pasted-UID-instead-of-password, etc.) and the message
    // for that case is more actionable.
    const reason = result.reason ?? 'bad_password';
    const errorMessage =
      reason === 'unknown_email'
        ? 'No account found for that email. Sign in with your @imnoshi.com email (not your UID).'
        : 'Wrong password. Passwords are case-sensitive and <FirstName>-2026! for seeded demo accounts.';
    const res = NextResponse.json(
      { error: errorMessage, reason },
      { status: 401 }
    );
    await clearSessionCookie(res);
    return res;
  }

  // Stage: 'done' if no TOTP, 'totp' if TOTP enrolled (password-only
  // logins never happen for TOTP-enrolled accounts -- they always
  // bounce through /login/verify).
  const stage: 'totp' | 'done' = result.account.totp_enrolled ? 'totp' : 'done';

  const res = NextResponse.json({ stage, email: result.account.email });
  await startSession(res, result.account, result.appUser, stage);
  return res;
}
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/adminAuth';

/**
 * POST /api/auth/logout
 * Clears the session cookie. Always returns 200.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  await clearSessionCookie(res);
  return res;
}
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

/**
 * Admin gate: caller must be signed in via Clerk AND their primary email must
 * be in the ADMIN_EMAILS env var (comma-separated, case-insensitive).
 * Returns null when authorized, or a ready-to-return error response.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    return NextResponse.json({ error: 'Admin access not configured' }, { status: 503 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? '';

  if (!allowed.includes(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

/** Page-level check: returns true when the current user is an allowlisted admin. */
export async function isAdmin(): Promise<boolean> {
  const { userId } = auth();
  if (!userId) return false;

  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return false;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? '';
  return allowed.includes(email);
}

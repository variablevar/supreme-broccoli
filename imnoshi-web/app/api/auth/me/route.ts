import { NextResponse } from 'next/server';
import { getSession } from '@/lib/customerAuth';
import { createAdminClient } from '@/lib/supabase';

/**
 * GET /api/auth/me
 * Returns the current customer session state for the client-side
 * useAuth hook. Returns an empty object (200) when no session is
 * present so the hook can distinguish "loading" from "signed out".
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.stage !== 'done') {
    return NextResponse.json({});
  }

  const supabase = createAdminClient();
  const [{ data: appUser }, { data: wu }] = await Promise.all([
    supabase.from('users').select('uid').eq('id', session.userId).maybeSingle(),
    supabase.from('web_users').select('totp_enrolled').eq('id', session.sub).maybeSingle(),
  ]);

  return NextResponse.json({
    email: session.email,
    uid: appUser?.uid ?? '',
    totpEnrolled: !!(wu?.totp_enrolled ?? false),
  });
}
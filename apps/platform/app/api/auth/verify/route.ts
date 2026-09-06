import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { getSession, startSession } from '@/lib/customerAuth';
import { byteaToBuffer, decryptSecret, verifyTotp } from '@/lib/customerTotp';

export const dynamic = 'force-dynamic';

const schema = z.object({ totpCode: z.string().min(6).max(6) });

/**
 * POST /api/auth/verify
 * Body: { totpCode }
 * Required when the session is in 'totp' stage. On success upgrades
 * the session to 'done'.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.stage !== 'totp') {
    return NextResponse.json({ error: 'No TOTP step required' }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { totpCode } = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('web_users')
    .select('id, email, totp_secret_encrypted, totp_enrolled')
    .eq('id', session.sub)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || !data.totp_enrolled || !data.totp_secret_encrypted) {
    return NextResponse.json({ error: 'TOTP not enrolled for this account' }, { status: 400 });
  }

  const blob = byteaToBuffer(data.totp_secret_encrypted);
  const secret = decryptSecret(blob);
  if (!verifyTotp(secret, totpCode)) {
    return NextResponse.json({ error: 'Invalid 6-digit code' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  await startSession(
    res,
    { id: data.id, email: data.email },
    { id: session.userId, email: session.email, uid: '' },
    'done'
  );
  return res;
}
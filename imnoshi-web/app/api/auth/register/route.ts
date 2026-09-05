import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { generateUID } from '@/lib/wallet';
import { ensureDbUser } from '@/lib/userId';
import { startSession } from '@/lib/customerAuth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(256),
});

/**
 * POST /api/auth/register
 * Body: { email, password }
 *
 * - Creates a web_users row (auth) AND a users row (app profile) in one
 *   shot, linking them by email.
 * - Auto-signs the new account in (stage='done' since they haven't
 *   enrolled TOTP yet).
 *
 * Re-registering an existing email returns 409.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const normalized = email.trim().toLowerCase();

  const supabase = createAdminClient();

  // Refuse if already registered.
  const { data: existing } = await supabase
    .from('web_users')
    .select('id')
    .eq('email', normalized)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: 'An account with that email already exists. Try signing in.' },
      { status: 409 }
    );
  }

  const bcrypt = await import('bcryptjs');
  const passwordHash = bcrypt.hashSync(password, 10);

  const { data: webUser, error: wErr } = await supabase
    .from('web_users')
    .insert({
      email: normalized,
      password_hash: passwordHash,
      must_reset_password: false,
      totp_enrolled: false,
    })
    .select('id, email')
    .single();
  if (wErr) {
    return NextResponse.json({ error: wErr.message }, { status: 500 });
  }

  // Provision the app-level users row (uid + email). Reuse the helper.
  const appUser = await ensureDbUser(supabase, normalized);

  const res = NextResponse.json({ stage: 'done', email: webUser.email });
  await startSession(
    res,
    { id: webUser.id, email: webUser.email },
    { id: appUser.id, email: appUser.email, uid: appUser.uid },
    'done'
  );
  // avoid unused-import warning on dev builds
  void generateUID;
  return res;
}
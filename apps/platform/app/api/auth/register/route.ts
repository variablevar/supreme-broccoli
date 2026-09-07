import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase';
import { allowAttempt } from '@/modules/auth/rate-limit';
const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(12).max(72) }).strict();
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email and a password of 12–72 characters.' }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  if (!await allowAttempt('register:' + email, 5)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  const { error } = await createAdminClient().rpc('submit_registration_application', { p_email: email, p_password_hash: await hash(parsed.data.password, 12) });
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'An account or pending application already exists.' : 'Could not submit application.' }, { status: error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ status: 'pending' }, { status: 202 });
}

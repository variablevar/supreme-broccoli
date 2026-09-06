import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import {
  audit,
  getAdminContext,
  getSession,
  requireAdmin,
} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(10).max(256),
});

/**
 * POST /api/auth/password
 * Body: { currentPassword, newPassword }
 * Authenticated admins can rotate their own password.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, password_hash')
    .eq('id', session.sub)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const bcrypt = await import('bcryptjs');
  if (!bcrypt.compareSync(currentPassword, data.password_hash)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  const { error: updErr } = await supabase
    .from('admin_users')
    .update({ password_hash: newHash })
    .eq('id', data.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await audit(ctx, 'admin.password.change', {
    targetTable: 'admin_users',
    targetId: data.id,
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });
  return NextResponse.json({ ok: true });
}
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getAdminContext } from '@/lib/adminAuth';

/**
 * Read recent admin audit log entries. Both full and view admins can
 * read -- this is part of the accountability surface.
 *
 * GET /admin/api/audit?limit=100&actor=foo@bar.com
 */
export async function GET(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? 100)));
  const actor = url.searchParams.get('actor');

  const supabase = createAdminClient();
  let query = supabase
    .from('admin_audit_log')
    .select('id, actor_email, actor_role, action, target_table, target_id, details, ip, user_agent, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (actor) query = query.eq('actor_email', actor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

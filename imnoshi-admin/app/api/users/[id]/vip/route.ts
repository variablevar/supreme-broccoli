import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { audit, getAdminContext, requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

const schema = z.object({
  vip: z.boolean(),
  reason: z.string().min(1).max(280),
});

/**
 * Toggle a user's VIP status. Full-admin only. Records the change in
 * users.vip_status plus an entry in vip_grants for audit.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ctx = await getAdminContext();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('users')
    .update({ vip_status: parsed.data.vip, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('vip_grants').insert({
    user_id: params.id,
    granted_by_email: ctx?.email,
    reason: parsed.data.reason,
  });

  await audit(ctx, 'user.vip_toggle', {
    targetTable: 'users',
    targetId: params.id,
    details: { vip: parsed.data.vip, reason: parsed.data.reason },
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });

  return NextResponse.json(data);
}

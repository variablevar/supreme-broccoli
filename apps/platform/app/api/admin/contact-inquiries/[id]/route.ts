import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, getAdminContext } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase';
import { dbError, invalid } from '@/modules/http/errors';

const schema = z.object({ status: z.enum(['new', 'in_progress', 'resolved']) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const actor = await getAdminContext();
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return invalid();
  const { data, error } = await createAdminClient().rpc('update_contact_inquiry_status', {
    p_id: id,
    p_status: parsed.data.status,
    p_actor: actor.email,
  });
  return error ? dbError(error) : NextResponse.json(data);
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser, clerkIdToUuid } from '@/lib/userId';
import { z } from 'zod';

const destinationSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['crypto', 'revolut']),
  label: z.string().min(1).max(80),
  network: z.enum(['TRC20', 'ERC20', 'BEP20', 'SOL']).optional(),
  address: z.string().max(160).optional(),
  revolutName: z.string().max(120).optional(),
  revolutTag: z.string().max(80).optional(),
  iban: z.string().max(64).optional(),
});

function serialize(row: Record<string, any>) {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    network: row.network ?? undefined,
    address: row.address ?? undefined,
    revolutName: row.revolut_name ?? undefined,
    revolutTag: row.revolut_tag ?? undefined,
    iban: row.iban ?? undefined,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payout_destinations')
    .select('*')
    .eq('user_id', clerkIdToUuid(userId))
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json((data ?? []).map(serialize));
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = destinationSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payout destination' }, { status: 400 });

  const supabase = createAdminClient();
  const dbUser = await ensureDbUser(supabase, userId);
  const row = {
    user_id: dbUser.id,
    type: parsed.data.type,
    label: parsed.data.label,
    network: parsed.data.type === 'crypto' ? parsed.data.network ?? 'TRC20' : null,
    address: parsed.data.type === 'crypto' ? parsed.data.address ?? '' : null,
    revolut_name: parsed.data.type === 'revolut' ? parsed.data.revolutName ?? '' : null,
    revolut_tag: parsed.data.type === 'revolut' ? parsed.data.revolutTag ?? '' : null,
    iban: parsed.data.type === 'revolut' ? parsed.data.iban ?? '' : null,
    updated_at: new Date().toISOString(),
  };

  const query = parsed.data.id
    ? supabase.from('payout_destinations').update(row).eq('id', parsed.data.id).eq('user_id', dbUser.id)
    : supabase.from('payout_destinations').insert(row);
  const { data, error } = await query.select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(serialize(data));
}

export async function DELETE(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing destination id' }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('payout_destinations')
    .delete()
    .eq('id', id)
    .eq('user_id', clerkIdToUuid(userId));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

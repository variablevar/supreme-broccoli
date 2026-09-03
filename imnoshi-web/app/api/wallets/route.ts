import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser, clerkIdToUuid } from '@/lib/userId';
import { z } from 'zod';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('wallets')
    .select('id, symbol, chain, address, created_at')
    .eq('user_id', clerkIdToUuid(userId))
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const patchSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string().min(1).max(8),
  chain: z.string().min(1).max(32),
  address: z.string().min(1).max(160),
});

export async function PATCH(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid wallet data' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('wallets')
    .update({
      symbol: parsed.data.symbol,
      chain: parsed.data.chain,
      address: parsed.data.address,
    })
    .eq('id', parsed.data.id)
    .eq('user_id', clerkIdToUuid(userId))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, address } = await req.json();
  if (!id && !address) return NextResponse.json({ error: 'Missing wallet id' }, { status: 400 });

  const supabase = createAdminClient();
  const query = supabase.from('wallets').delete().eq('user_id', clerkIdToUuid(userId));
  const { error } = id ? await query.eq('id', id) : await query.eq('address', address);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

const postSchema = z.object({
  addresses: z
    .array(
      z.object({
        symbol: z.string().min(1).max(8),
        chain: z.string().min(1).max(32),
        address: z.string().min(1).max(128),
      })
    )
    .min(1)
    .max(16),
});

// POST = save a newly created/imported wallet set. One set per account.
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid wallet data' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const dbUser = await ensureDbUser(supabase, userId);

    // Enforce one wallet set per account.
    const { count } = await supabase
      .from('wallets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', dbUser.id);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'A wallet already exists for this account' },
        { status: 409 }
      );
    }

    const rows = parsed.data.addresses.map((a) => ({
      user_id: dbUser.id,
      symbol: a.symbol,
      chain: a.chain,
      address: a.address,
    }));

    const { data, error } = await supabase.from('wallets').insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { normalizeAddress } from '@/lib/web3/evm';
import { ensureDbUser } from '@/lib/userId';

const schema = z.object({
  address: z.string().min(40).max(80),
  chain: z.string().min(1).max(32).default('Ethereum'),
});

export async function POST(req: Request) {
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  const raw = jar.get('imnoshi_customer_session')?.value;
  if (!raw) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let email: string | null = null;
  try {
    const sess = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8')
    ) as { email?: string; exp?: number };
    if (sess.email && sess.exp && sess.exp > Date.now()) {
      email = sess.email;
    }
  } catch {
    // fallthrough
  }
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const normalized = normalizeAddress(parsed.data.address);
  if (!normalized) {
    return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const dbUser = await ensureDbUser(supabase, email);

  const { error: wErr } = await supabase
    .from('wallets')
    .upsert(
      {
        user_id: dbUser.id,
        symbol: 'ETH',
        chain: parsed.data.chain,
        address: normalized,
      },
      { onConflict: 'user_id,symbol' }
    );
  if (wErr) {
    return NextResponse.json({ error: wErr.message }, { status: 500 });
  }

  const { error: uErr } = await supabase
    .from('users')
    .update({ wallet_address: normalized, updated_at: new Date().toISOString() })
    .eq('id', dbUser.id);
  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, address: normalized });
}

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser } from '@/lib/userId';
import { z } from 'zod';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const supabase = createAdminClient();

  try {
    // Creates the users row (with UID) on first call, returns it afterwards.
    const dbUser = await ensureDbUser(supabase, userId, email);

    return NextResponse.json({
      id: userId,
      uid: dbUser.uid,
      email: email || dbUser.email,
      walletAddress: dbUser.wallet_address ?? '',
      vipStatus: dbUser.vip_status ?? false,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

const postSchema = z.object({
  walletAddress: z.string().min(1).max(128),
});

// POST = link a connected Web3 wallet address to the user profile.
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const dbUser = await ensureDbUser(supabase, userId);

    const { error } = await supabase
      .from('users')
      .update({
        wallet_address: parsed.data.walletAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbUser.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

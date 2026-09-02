import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { z } from 'zod';

// Public: latest fleet-wide GPU stats for the marketing ticker.
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('fleet_stats')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data ?? { total_gpus: 0, active_miners: 0, total_hashrate: 0, daily_rewards: 0 }
  );
}

const postSchema = z.object({
  total_gpus: z.number().int().nonnegative(),
  active_miners: z.number().int().nonnegative(),
  total_hashrate: z.number().nonnegative(),
  daily_rewards: z.number().nonnegative(),
});

// Admin: record a new fleet stats snapshot.
// Requires header: Authorization: Bearer <FLEET_ADMIN_SECRET>
export async function POST(req: Request) {
  const secret = process.env.FLEET_ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Admin endpoint not configured' }, { status: 503 });
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid stats payload' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('fleet_stats')
      .insert({ ...parsed.data, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

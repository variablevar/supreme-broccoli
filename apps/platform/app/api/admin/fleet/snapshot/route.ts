import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { audit, getAdminContext, requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

const schema = z.object({
  totalGpus: z.number().int().nonnegative(),
  activeMiners: z.number().int().nonnegative(),
  totalHashrate: z.number().nonnegative(),
  dailyRewards: z.number().nonnegative(),
});

/**
 * Insert a new fleet_stats snapshot. Full-admin only. The public
 * /api/fleet endpoint on imnoshi-web returns the latest row; this
 * route lets you push updates from the admin console.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ctx = await getAdminContext();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const supabase = createAdminClient();
  // Map camelCase input -> snake_case columns (the Supabase client
  // doesn't auto-translate without a configured camelCase option).
  const { data, error } = await supabase
    .from('fleet_stats')
    .insert({
      total_gpus: parsed.data.totalGpus,
      active_miners: parsed.data.activeMiners,
      total_hashrate: parsed.data.totalHashrate,
      daily_rewards: parsed.data.dailyRewards,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit(ctx, 'fleet.snapshot', {
    targetTable: 'fleet_stats',
    targetId: data.id,
    details: parsed.data,
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });
  return NextResponse.json(data);
}

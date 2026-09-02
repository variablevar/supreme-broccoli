import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser, clerkIdToUuid } from '@/lib/userId';
import { calculateAPY, calculateEndDate, calculateMultiplier, LOCK_PERIODS } from '@/lib/constants';
import { z } from 'zod';

const schema = z.object({
  amount: z.number().positive(),
  lockPeriod: z.number().refine((v) => LOCK_PERIODS.includes(v as 1 | 3 | 6 | 12)),
});

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('stakes')
    .select('*')
    .eq('user_id', clerkIdToUuid(userId))
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { amount, lockPeriod } = parsed.data;
    const supabase = createAdminClient();
    const dbUser = await ensureDbUser(supabase, userId);

    const { data, error } = await supabase
      .from('stakes')
      .insert({
        user_id: dbUser.id,
        amount,
        lock_period_months: lockPeriod,
        apy: calculateAPY(lockPeriod),
        ends_at: calculateEndDate(lockPeriod),
        reward_multiplier: calculateMultiplier(lockPeriod),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

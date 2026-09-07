import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { z } from 'zod';
import { allowAttempt } from '@/modules/auth/rate-limit';
import { dbError, invalid } from '@/modules/http/errors';

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().trim().max(80).optional(),
  quantity: z.number().int().min(1).max(20),
});

export async function POST(req: Request) {
  const source = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!(await allowAttempt(`purchase:${source}`, 5, 3600))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('purchase_inquiries')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? '',
      quantity: parsed.data.quantity,
      device_price_gbp: 3000,
      status: 'new',
    })
    .select()
    .single();

  if (error) return dbError(error);
  return NextResponse.json(data);
}

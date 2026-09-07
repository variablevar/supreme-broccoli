import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { z } from 'zod';
import { allowAttempt } from '@/modules/auth/rate-limit';
import { dbError, invalid } from '@/modules/http/errors';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(80),
  quantity: z.number().int().min(1).max(20),
  company: z.string().max(0),
}).strict();

export async function POST(req: Request) {
  const source = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid();
  const allowedBySource = await allowAttempt(`purchase:ip:${source}`, 5, 3600);
  const allowedByEmail = await allowAttempt(`purchase:email:${parsed.data.email}`, 3, 3600);
  if (!allowedBySource || !allowedByEmail) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('purchase_inquiries')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      quantity: parsed.data.quantity,
      device_price_gbp: 3000,
      status: 'new',
    });

  if (error) return dbError(error);
  return NextResponse.json({ received: true }, { status: 201 });
}

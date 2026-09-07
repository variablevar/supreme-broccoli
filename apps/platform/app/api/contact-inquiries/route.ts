import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { allowAttempt } from '@/modules/auth/rate-limit';
import { dbError, invalid } from '@/modules/http/errors';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(3000),
  company: z.string().max(0),
}).strict();

export async function POST(req: Request) {
  const source = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid();

  const { company: _company, ...inquiry } = parsed.data;
  const allowedBySource = await allowAttempt(`contact:ip:${source}`, 5, 3600);
  const allowedByEmail = await allowAttempt(`contact:email:${inquiry.email}`, 3, 3600);
  if (!allowedBySource || !allowedByEmail) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const { error } = await createAdminClient().from('contact_inquiries').insert(inquiry);
  if (error) return dbError(error);
  return NextResponse.json({ received: true }, { status: 201 });
}

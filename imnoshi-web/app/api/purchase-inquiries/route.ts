import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(80).optional(),
  quantity: z.number().int().min(1).max(20),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid purchase request' }, { status: 400 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser } from '@/lib/userId';

const schema = z.object({
  code: z.string().length(6).regex(/^[A-Z2-9]{6}$/),
});

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Customer redeems a pairing code. The matching row in
 * device_pairings already has the device_id and user_id; we update
 * status='claimed' and replace the admin-issued claim token (if
 * any) with a freshly-minted one. The customer surfaces the new
 * claim token as a QR code on the next page so their device can
 * complete pairing via scan.
 */
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  const supabase = createAdminClient();
  const dbUser = await ensureDbUser(supabase, userId);

  const { data: pairing, error } = await supabase
    .from('device_pairings')
    .select('code, status, device_id, user_id, created_at')
    .eq('code', parsed.data.code.toUpperCase())
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pairing) return NextResponse.json({ error: 'Code not found' }, { status: 404 });
  if (pairing.status !== 'pending') {
    return NextResponse.json({ error: `Code already ${pairing.status}` }, { status: 409 });
  }
  if (Date.now() - new Date(pairing.created_at).getTime() > 15 * 60 * 1000) {
    await supabase
      .from('device_pairings')
      .update({ status: 'revoked' })
      .eq('code', parsed.data.code);
    return NextResponse.json({ error: 'Code expired -- ask the admin for a new one' }, { status: 410 });
  }
  if (pairing.user_id !== dbUser.id) {
    return NextResponse.json({ error: 'Code is not assigned to your account' }, { status: 403 });
  }

  const newClaimToken = crypto.randomBytes(24).toString('base64url');

  const { error: upErr } = await supabase
    .from('device_pairings')
    .update({
      status: 'claimed',
      claim_token: hashToken(newClaimToken),
      claimed_at: new Date().toISOString(),
    })
    .eq('code', parsed.data.code);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({
    deviceId: pairing.device_id,
    // This token is shown ONCE -- the device scans a QR encoding it.
    claimToken: newClaimToken,
  });
}

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { ensureDbUser } from '@/lib/userId';
import { requireCustomer } from '@/lib/customerAuth';
import { z } from 'zod';
import type { LanguageCode, ThemePreference } from '@/types';

const languageSchema = z.enum([
  'bn',
  'ar',
  'ur',
  'pk',
  'hi',
  'en-US',
  'en-GB',
  'de',
  'ja',
  'zh',
  'nl',
  'es',
  'fr',
]);

const themeSchema = z.enum(['dark', 'light', 'system']);

export async function GET() {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  try {
    const dbUser = await ensureDbUser(supabase, guard.session.email);
    return NextResponse.json({
      id: guard.session.userId,
      uid: dbUser.uid,
      email: dbUser.email,
      walletAddress: dbUser.wallet_address ?? '',
      vipStatus: dbUser.vip_status ?? false,
      language: (dbUser.language_preference ?? 'en-GB') as LanguageCode,
      theme: (dbUser.theme_preference ?? 'dark') as ThemePreference,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

const postSchema = z.object({
  walletAddress: z.string().min(1).max(128).optional(),
  language: languageSchema.optional(),
  theme: themeSchema.optional(),
}).refine((value) => value.walletAddress || value.language || value.theme, {
  message: 'Nothing to update',
});

// POST = update user profile preferences and linked payout wallet.
export async function POST(req: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid profile update' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const dbUser = await ensureDbUser(supabase, guard.session.email);
    const updates: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.walletAddress) updates.wallet_address = parsed.data.walletAddress;
    if (parsed.data.language) updates.language_preference = parsed.data.language;
    if (parsed.data.theme) updates.theme_preference = parsed.data.theme;

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', dbUser.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

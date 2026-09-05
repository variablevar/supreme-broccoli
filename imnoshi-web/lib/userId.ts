import { randomUUID } from 'crypto';
import type { createAdminClient } from '@/lib/supabase';
import { generateUID } from '@/lib/wallet';

type DbClient = ReturnType<typeof createAdminClient>;

export interface AppUserRow {
  id: string;
  uid: string;
  email: string;
  wallet_address: string | null;
  vip_status: boolean | null;
  language_preference: string | null;
  theme_preference: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Look up the public.users row for the given email and create it if
 * missing. Used by every customer API route that needs the app-level
 * user. The auth row in public.web_users is the source of truth for
 * who is signed in (cookie session); this function only manages the
 * legacy "app user" row that holds wallet_address, balances, etc.
 *
 * The public.users.id column is a uuid PK WITHOUT a default -- the
 * caller must supply it. We generate one with crypto.randomUUID() so
 * new sign-ups don't have to think about it.
 */
export async function ensureDbUser(
  supabase: DbClient,
  email: string
): Promise<AppUserRow> {
  const normalized = email.trim().toLowerCase();

  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('id, uid, email, wallet_address, vip_status, language_preference, theme_preference, created_at, updated_at')
    .eq('email', normalized)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as AppUserRow;

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: randomUUID(),
      uid: generateUID(),
      email: normalized,
    })
    .select('id, uid, email, wallet_address, vip_status, language_preference, theme_preference, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as AppUserRow;
}

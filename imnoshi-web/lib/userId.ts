import { createHash } from 'crypto';
import type { createAdminClient } from '@/lib/supabase';
import { generateUID } from '@/lib/wallet';

type DbClient = ReturnType<typeof createAdminClient>;

/**
 * Deterministically map a Clerk user ID (e.g. "user_2abc...") to a UUID so it
 * fits the `uuid` primary key in public.users without changing the schema.
 */
export function clerkIdToUuid(clerkId: string): string {
  const hash = createHash('sha256').update(`imnoshi:${clerkId}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Ensure a public.users row exists for this Clerk user and return it.
 * Creates the row (with a fresh UID) on first call.
 */
export async function ensureDbUser(supabase: DbClient, clerkId: string, email?: string) {
  const id = clerkIdToUuid(clerkId);

  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('users')
    .insert({
      id,
      uid: generateUID(),
      email: email || `${id.slice(0, 8)}@pending.local`,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey;

// Realtime is not used by this app. realtime-js throws at client construction
// on Node < 22 (no native WebSocket) when no transport is provided, so pass a
// stub constructor. It is only ever instantiated if realtime.connect() is
// called, which never happens here.
class NoopWebSocketTransport {
  constructor(_url: string, _protocols?: string | string[]) {}
  send() {}
  close() {}
}

const noopRealtime = {
  realtime: {
    transport: NoopWebSocketTransport,
  },
} as unknown as Parameters<typeof createSupabaseClient>[2];

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

export function createAdminClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...noopRealtime,
  });
}

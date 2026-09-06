import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Realtime is unused; realtime-js throws at client construction on Node < 22
// without a native WebSocket, so pass a stub transport.
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

export function createAdminClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...noopRealtime,
  });
}

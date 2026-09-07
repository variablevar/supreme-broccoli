import { createAdminClient } from "@/lib/supabase";
import { tokenHash } from "./tokens";
export async function allowAttempt(scope: string, limit = 10, window = 900) {
  const { data, error } = await createAdminClient().rpc("take_rate_limit", {
    p_scope: tokenHash(scope),
    p_limit: limit,
    p_window_seconds: window,
  });
  if (error) throw new Error("Rate limiter unavailable");
  return data === true;
}

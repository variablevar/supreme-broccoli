import { PostgrestClient } from "@supabase/postgrest-js";
/** Server-only database access. Browser roles have no access to the imo schema. */
export function createAdminClient() {
  const url =
    process.env.DATABASE_REST_URL ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`
      : "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database is not configured");
  if (/^sb_publishable_/i.test(key))
    throw new Error("SUPABASE_SERVICE_ROLE_KEY cannot be a publishable key");
  if (process.env.NODE_ENV === "production") {
    const origin = process.env.APP_ORIGIN;
    if (!origin || !origin.startsWith("https://"))
      throw new Error("APP_ORIGIN must be an HTTPS origin in production");
  }
  return new PostgrestClient(url, {
    schema: "imo",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
}

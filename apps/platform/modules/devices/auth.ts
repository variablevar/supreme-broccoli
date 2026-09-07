import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { tokenHash, validToken } from "@/modules/auth/tokens";
import { dbError } from "@/modules/http/errors";
export async function requireDevice(req: Request) {
  const token = /^Bearer ([A-Za-z0-9_-]+)$/.exec(
    req.headers.get("authorization") || "",
  )?.[1];
  if (!validToken(token))
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const { data, error } = await createAdminClient()
    .from("devices")
    .select("id,user_id,revoked_at")
    .eq("credential_hash", tokenHash(token))
    .maybeSingle();
  if (error) return { ok: false as const, response: dbError(error) };
  if (!data || data.revoked_at)
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Device unavailable" },
        { status: 401 },
      ),
    };
  return { ok: true as const, device: data };
}

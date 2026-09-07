import { allowAttempt } from "@/modules/auth/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { getSession, startSession } from "@/lib/adminAuth";
import { byteaToBuffer, decryptSecret, verifyTotp } from "@/lib/adminTotp";
import { internalError } from "@/modules/http/errors";
import { recordLoginFailure } from "@/modules/auth/security-events";

export const dynamic = "force-dynamic";

const schema = z.object({ totpCode: z.string().min(6).max(6) });

/**
 * POST /api/auth/verify
 * Body: { totpCode }
 * Required when the session is in 'totp' stage (i.e. the admin has
 * previously enrolled TOTP and is mid-login). On success upgrades the
 * session to 'done'.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.stage !== "totp") {
    return NextResponse.json(
      { error: "No TOTP step required" },
      { status: 409 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    await recordLoginFailure(req, "admin", session.email, "invalid_totp");
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!(await allowAttempt("admin/auth:totp:" + session.sub, 5))) {
    await recordLoginFailure(req, "admin", session.email, "rate_limited");
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }
  const { totpCode } = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("totp_secret_encrypted, totp_enrolled")
    .eq("id", session.sub)
    .maybeSingle();
  if (error) return internalError("Admin TOTP verification read failed", error);
  if (!data || !data.totp_enrolled || !data.totp_secret_encrypted) {
    return NextResponse.json(
      { error: "TOTP not enrolled for this account" },
      { status: 400 },
    );
  }

  // Supabase JS returns bytea in one of several shapes -- use the
  // shared helper to coerce it into a real Buffer.
  const blob = byteaToBuffer(data.totp_secret_encrypted);
  const secret = decryptSecret(blob);
  if (!verifyTotp(secret, totpCode)) {
    await recordLoginFailure(req, "admin", session.email, "invalid_totp");
    return NextResponse.json(
      { error: "Invalid 6-digit code" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  await startSession(res, { id: session.sub, email: session.email }, "done");
  return res;
}

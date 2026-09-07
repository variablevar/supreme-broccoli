import { allowAttempt } from "@/modules/auth/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSessionCookie,
  startSession,
  verifyPassword,
} from "@/lib/adminAuth";
import { internalError } from "@/modules/http/errors";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * On success sets the session cookie and returns the next stage:
 *   - 'reset' = forced first-login password + TOTP enrollment
 *   - 'totp'  = password ok but TOTP pending
 *   - 'done'  = fully signed in
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  if (
    !(await allowAttempt("admin/auth:password:" + email.trim().toLowerCase()))
  )
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  let result;
  try {
    result = await verifyPassword(email, password);
  } catch (err) {
    return internalError("Admin login failed", err);
  }

  if (!result.ok || !result.account) {
    // Differentiate "no such email" from "wrong password" so the UI
    // can surface an actionable hint (e.g. don't paste your UID).
    const res = NextResponse.json(
      {
        error: "Unable to sign in. Check your credentials or try again later.",
      },
      { status: 401 },
    );
    await clearSessionCookie(res);
    return res;
  }

  // Stage routing:
  //   must_reset_password = true  -> 'reset' (first-login setup wizard)
  //   totp_enrolled        = true -> 'totp'  (still need the 6-digit code)
  //   otherwise                  -> 'done'  (password-only sign-in)
  const stage: "reset" | "totp" | "done" =
    result.account.must_reset_password || !result.account.totp_enrolled
      ? "reset"
      : result.account.totp_enrolled
        ? "totp"
        : "done";

  const res = NextResponse.json({ stage, email: result.account.email });
  await startSession(res, result.account, stage);
  return res;
}

import { allowAttempt } from "@/modules/auth/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSessionCookie,
  startSession,
  verifyPassword,
} from "@/lib/customerAuth";
import { internalError } from "@/modules/http/errors";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  if (!(await allowAttempt("auth:password:" + email.trim().toLowerCase())))
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  let result;
  try {
    result = await verifyPassword(email, password);
  } catch (err) {
    return internalError("Customer login failed", err);
  }

  if (!result.ok || !result.account || !result.appUser) {
    // Distinguish between "no account with that email" and "email
    // exists but password is wrong" -- the latter is far more common
    // (typos, pasted-UID-instead-of-password, etc.) and the message
    // for that case is more actionable.
    const res = NextResponse.json(
      {
        error: "Unable to sign in. Check your credentials or try again later.",
      },
      { status: 401 },
    );
    await clearSessionCookie(res);
    return res;
  }

  // Stage: 'done' if no TOTP, 'totp' if TOTP enrolled (password-only
  // logins never happen for TOTP-enrolled accounts -- they always
  // bounce through /login/verify).
  const stage: "totp" | "done" = result.account.totp_enrolled ? "totp" : "done";

  const res = NextResponse.json({ stage, email: result.account.email });
  await startSession(res, result.account, result.appUser, stage);
  return res;
}

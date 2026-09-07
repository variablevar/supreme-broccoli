import { allowAttempt } from "@/modules/auth/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSessionCookie,
  startSession,
  verifyPassword,
} from "@/lib/customerAuth";
import { internalError } from "@/modules/http/errors";
import { recordLoginFailure } from "@/modules/auth/security-events";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const attemptedEmail =
    body &&
    typeof body === "object" &&
    "email" in body &&
    typeof body.email === "string"
      ? body.email
      : "";
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    await recordLoginFailure(
      req,
      "customer",
      attemptedEmail,
      "invalid_request",
    );
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  if (!(await allowAttempt("auth:password:" + email.trim().toLowerCase()))) {
    await recordLoginFailure(req, "customer", email, "rate_limited");
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }
  let result;
  try {
    result = await verifyPassword(email, password);
  } catch (err) {
    return internalError("Customer login failed", err);
  }

  if (!result.ok || !result.account || !result.appUser) {
    const outcome =
      result.reason === "approval_required"
        ? "approval_required"
        : result.reason === "locked"
          ? "locked"
          : result.reason === "bad_password"
            ? "bad_password"
            : "unknown_email";
    await recordLoginFailure(req, "customer", email, outcome);
    if (result.reason === "approval_required") {
      const res = NextResponse.json(
        {
          error:
            "Your account has not been approved yet. Please contact support@imnoshi.com.",
          code: "approval_required",
        },
        { status: 403 },
      );
      await clearSessionCookie(res);
      return res;
    }
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

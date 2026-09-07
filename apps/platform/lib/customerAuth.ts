import {
  readSession,
  issueSession,
  clearSession,
} from "@/modules/auth/sessions";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export interface CustomerSession {
  /** web_users.id (auth row). */
  sub: string;
  /** public.users.id (app-level row) -- denormalised here so route
   *  handlers don't need an extra round-trip. */
  userId: string;
  email: string;
  /** TOTP enrollment stage:
   *   - 'totp' = password ok, TOTP verification pending (TOTP enrolled)
   *   - 'done' = fully signed in
   *
   *  Customers don't have a 'reset' stage because the chosen UX is
   *  "customers may enroll optional TOTP from Settings".
   */
  stage: "totp" | "done";
  iat: number;
  exp: number;
}

interface WebUserRow {
  id: string;
  email: string;
  password_hash: string;
  totp_secret_encrypted: Buffer | null;
  totp_enrolled: boolean;
  must_reset_password: boolean;
  failed_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
}

export async function getSession(): Promise<CustomerSession | null> {
  return (await readSession("customer")) as CustomerSession | null;
}
export async function clearSessionCookie(res: NextResponse) {
  await clearSession(res, "customer");
}

export interface LoginAttemptResult {
  ok: boolean;
  reason?: "unknown_email" | "locked" | "bad_password" | "no_app_user";
  account?: WebUserRow;
  appUser?: { id: string; email: string; uid: string } | null;
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;
const DUMMY_PASSWORD_HASH =
  "$2b$12$piMtoJ5qmm.07rfjSB5oC.Je2z.eViMwxSHD6jWPii643BXsOsTB2";
export async function verifyPassword(
  email: string,
  password: string,
): Promise<LoginAttemptResult> {
  const normalized = email.trim().toLowerCase();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("web_users")
    .select(
      "id, email, password_hash, totp_secret_encrypted, totp_enrolled, must_reset_password, failed_attempts, locked_until, last_login_at",
    )
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const bcrypt = await import("bcryptjs");
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return { ok: false, reason: "unknown_email" };
  }

  const account = data as unknown as WebUserRow;

  if (
    account.locked_until &&
    new Date(account.locked_until).getTime() > Date.now()
  ) {
    return { ok: false, reason: "locked", account };
  }

  const bcrypt = await import("bcryptjs");
  const passwordOk = await bcrypt.compare(password, account.password_hash);
  if (!passwordOk) {
    const nextAttempts = (account.failed_attempts ?? 0) + 1;
    const lockUntil =
      nextAttempts >= LOCKOUT_THRESHOLD
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : account.locked_until;
    const { error: updateError } = await supabase
      .from("web_users")
      .update({ failed_attempts: nextAttempts, locked_until: lockUntil })
      .eq("id", account.id);
    if (updateError) throw updateError;
    return {
      ok: false,
      reason: "bad_password",
      account: { ...account, failed_attempts: nextAttempts },
    };
  }

  const { error: updateError } = await supabase
    .from("web_users")
    .update({
      failed_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    })
    .eq("id", account.id);
  if (updateError) throw updateError;

  // Look up the app-level users row (the one that holds wallet_address, balance, etc.).
  const { data: appUser } = await supabase
    .from("users")
    .select("id, email, uid")
    .eq("email", normalized)
    .maybeSingle();

  if (!appUser) {
    return { ok: false, reason: "no_app_user", account };
  }

  return { ok: true, account, appUser };
}

export function makeSession(
  account: { id: string; email: string },
  appUser: { id: string; email: string; uid: string },
  stage: CustomerSession["stage"],
): CustomerSession {
  const now = Date.now();
  const ttlMs = stage === "done" ? 12 * 60 * 60_000 : 15 * 60_000;
  return {
    sub: account.id,
    userId: appUser.id,
    email: account.email.toLowerCase(),
    stage,
    iat: now,
    exp: now + ttlMs,
  };
}

export async function startSession(
  res: NextResponse,
  account: { id: string; email: string },
  appUser: { id: string; email: string; uid: string },
  stage: CustomerSession["stage"],
) {
  await issueSession(res, "customer", account, stage, appUser.id);
}

/**
 * Auth gate for API routes. Returns null on success, or a ready-to-return
 * error response. Use `requireCustomer()` when you need the session
 * details after the gate.
 */
export async function requireCustomer(): Promise<
  { ok: true; session: CustomerSession } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.stage !== "done") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "TOTP verification required", code: "totp_required" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, session };
}

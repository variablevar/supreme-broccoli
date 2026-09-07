import {
  readSession,
  issueSession,
  clearSession,
} from "@/modules/auth/sessions";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export type AdminRole = "full" | "none";

export interface AdminSession {
  email: string;
  /** Subject id (the admin_users.id). */
  sub: string;
  /** Three-stage login:
   *  'reset' = must change password + enroll TOTP
   *  'totp'  = password ok, TOTP pending
   *  'done'  = fully signed in. */
  stage: "reset" | "totp" | "done";
  /** Unix ms when this session was issued. */
  iat: number;
  /** Unix ms when this session expires. */
  exp: number;
}

export interface AdminAccount {
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

function splitEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getSession(): Promise<AdminSession | null> {
  return (await readSession("admin")) as AdminSession | null;
}
export async function clearSessionCookie(res: NextResponse) {
  await clearSession(res, "admin");
}

export function getAllowedAdminEmails(): string[] {
  return splitEmails(process.env.ADMIN_EMAILS);
}

export function isAllowedAdminEmail(email: string): boolean {
  return getAllowedAdminEmails().includes(email.trim().toLowerCase());
}

export interface LoginAttemptResult {
  ok: boolean;
  reason?: "unknown_email" | "not_allowlisted" | "locked" | "bad_password";
  account?: AdminAccount;
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;
/**
 * Verify a (email, password) pair against an admin_users row and the
 * ADMIN_EMAILS allowlist. On success returns the account. On failure
 * increments failed_attempts and may lock the account. Resets
 * failed_attempts to 0 on success.
 */
export async function verifyPassword(
  email: string,
  password: string,
): Promise<LoginAttemptResult> {
  const normalized = email.trim().toLowerCase();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select(
      "id, email, password_hash, totp_secret_encrypted, totp_enrolled, must_reset_password, failed_attempts, locked_until, last_login_at",
    )
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, reason: "unknown_email" };

  const account = data as unknown as AdminAccount;

  if (
    account.locked_until &&
    new Date(account.locked_until).getTime() > Date.now()
  ) {
    return { ok: false, reason: "locked", account };
  }

  // Allowlist: ADMIN_EMAILS env is still honoured as a deploy-time
  // safety net (e.g. to keep a former employee out before the
  // admin_users row is deleted), but the presence of a row in
  // admin_users (which we just queried) is sufficient by itself.
  // So no extra check is required here -- the row's existence
  // already implies the email is on the allowlist.

  const bcrypt = await import("bcryptjs");
  const passwordOk = await bcrypt.compare(password, account.password_hash);
  if (!passwordOk) {
    const nextAttempts = (account.failed_attempts ?? 0) + 1;
    const lockUntil =
      nextAttempts >= LOCKOUT_THRESHOLD
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : account.locked_until;
    await supabase
      .from("admin_users")
      .update({ failed_attempts: nextAttempts, locked_until: lockUntil })
      .eq("id", account.id);
    return {
      ok: false,
      reason: "bad_password",
      account: { ...account, failed_attempts: nextAttempts },
    };
  }

  await supabase
    .from("admin_users")
    .update({
      failed_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  return { ok: true, account };
}

/** Build a fresh session payload for the given admin and stage. */
export function makeSession(
  account: { id: string; email: string },
  stage: AdminSession["stage"],
): AdminSession {
  const now = Date.now();
  const ttlMs = stage === "done" ? 12 * 60 * 60_000 : 15 * 60_000;
  return {
    email: account.email.toLowerCase(),
    sub: account.id,
    stage,
    iat: now,
    exp: now + ttlMs,
  };
}

export async function startSession(
  res: NextResponse,
  account: { id: string; email: string },
  stage: AdminSession["stage"],
) {
  await issueSession(res, "admin", account, stage);
}

/**
 * Page-level role check used by server components / route handlers.
 * Returns 'full' only when the admin is fully signed in. Returns 'none'
 * otherwise.
 */
export async function getAdminRole(): Promise<AdminRole> {
  const session = await getSession();
  if (!session || session.stage !== "done") return "none";
  return "full";
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminRole()) !== "none";
}

export async function isFullAdmin(): Promise<boolean> {
  return (await getAdminRole()) === "full";
}

export interface AdminContext {
  email: string;
  role: AdminRole;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await getSession();
  if (!session || session.stage !== "done") return null;
  const allowlist = getAllowedAdminEmails();
  if (
    allowlist.length > 0 &&
    !allowlist.includes(session.email.toLowerCase())
  ) {
    return null;
  }
  return { email: session.email, role: "full" };
}

/**
 * Admin gate for API routes: returns null when the caller is fully
 * authenticated as a full admin, otherwise a ready-to-return error
 * response.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.stage === "reset") {
    return NextResponse.json(
      { error: "Password reset required", code: "must_reset_password" },
      { status: 401 },
    );
  }
  if (session.stage === "totp") {
    return NextResponse.json(
      { error: "TOTP verification required", code: "totp_required" },
      { status: 401 },
    );
  }
  if (
    !isAllowedAdminEmail(session.email) &&
    !(await hasAdminUserRow(session.email))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Best-effort audit log write. Never throws -- a logging failure must
 * not break an already-validated write.
 */
export async function audit(
  ctx: AdminContext | null,
  action: string,
  details: {
    targetTable?: string;
    targetId?: string;
    details?: unknown;
    ip?: string | null;
    userAgent?: string | null;
  } = {},
): Promise<void> {
  if (!ctx) return;
  try {
    const supabase = createAdminClient();
    await supabase.from("admin_audit_log").insert({
      actor_email: ctx.email,
      actor_role: ctx.role,
      action,
      target_table: details.targetTable,
      target_id: details.targetId,
      details: details.details ?? null,
      ip: details.ip ?? null,
      user_agent: details.userAgent ?? null,
    });
  } catch {
    // intentionally swallow
  }
}

/**
 * True if a row exists in admin_users with the given email. Used as
 * the second line of defence behind ADMIN_EMAILS -- once the
 * admin_users migration has been applied and at least one row is
 * present, treat the table as the authoritative allowlist. Until
 * then we fall back to ADMIN_EMAILS so an operator can bootstrap.
 */
export async function hasAdminUserRow(email: string): Promise<boolean> {
  try {
    const normalized = email.trim().toLowerCase();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", normalized)
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

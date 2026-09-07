import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import {
  newToken,
  tokenHash,
  validToken,
  sessionValid,
  type Audience,
  type Stage,
} from "./tokens";

export interface StoredSession {
  email: string;
  sub: string;
  userId: string;
  stage: Stage;
  iat: number;
  exp: number;
}
const cookieName = (audience: Audience) => `imo_${audience}_session`;
export async function readSession(
  audience: Audience,
): Promise<StoredSession | null> {
  const token = (await cookies()).get(cookieName(audience))?.value;
  if (!validToken(token)) return null;
  const db = createAdminClient();
  const { data: row, error } = await db
    .from("app_sessions")
    .select("*")
    .eq("token_hash", tokenHash(token))
    .eq("audience", audience)
    .maybeSingle();
  if (error) throw new Error("Session service unavailable");
  if (!sessionValid(row, audience)) return null;
  const { data: account, error: accountError } = await db
    .from(audience === "admin" ? "admin_users" : "web_users")
    .select("id, email, session_version, totp_enrolled, must_reset_password")
    .eq("id", row.subject_id)
    .maybeSingle();
  if (accountError) throw new Error("Session service unavailable");
  if (
    !account ||
    account.session_version !== row.session_version ||
    account.email !== row.email
  )
    return null;
  if (
    audience === "admin" &&
    row.stage === "done" &&
    (!account.totp_enrolled || account.must_reset_password)
  )
    return null;
  return {
    sub: row.subject_id,
    email: row.email,
    userId: row.user_id ?? "",
    stage: row.stage,
    iat: Date.parse(row.created_at),
    exp: Date.parse(row.expires_at),
  };
}
export async function clearSession(res: NextResponse, audience: Audience) {
  const token = (await cookies()).get(cookieName(audience))?.value;
  if (validToken(token)) {
    const { error } = await createAdminClient()
      .from("app_sessions")
      .delete()
      .eq("token_hash", tokenHash(token))
      .eq("audience", audience);
    if (error) throw new Error("Could not revoke session");
  }
  res.cookies.set(cookieName(audience), "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}
export async function issueSession(
  res: NextResponse,
  audience: Audience,
  account: { id: string; email: string },
  stage: Stage,
  userId?: string,
) {
  await clearSession(res, audience);
  const db = createAdminClient();
  const { data: current, error: readError } = await db
    .from(audience === "admin" ? "admin_users" : "web_users")
    .select("session_version")
    .eq("id", account.id)
    .single();
  if (readError) throw new Error("Session service unavailable");
  const token = newToken();
  const maxAge = stage === "done" ? 12 * 3600 : 10 * 60;
  const { error } = await db
    .from("app_sessions")
    .insert({
      token_hash: tokenHash(token),
      audience,
      subject_id: account.id,
      email: account.email,
      user_id: userId ?? null,
      stage,
      session_version: current.session_version,
      expires_at: new Date(Date.now() + maxAge * 1000).toISOString(),
    });
  if (error) throw new Error("Could not create session");
  res.cookies.set(cookieName(audience), token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  });
}

import { createAdminClient } from "@/lib/supabase";

export type LoginAudience = "customer" | "admin";
export type LoginFailure =
  | "invalid_request"
  | "unknown_email"
  | "bad_password"
  | "locked"
  | "rate_limited"
  | "approval_required"
  | "invalid_totp";

const clean = (value: string | null, max: number) =>
  (value || "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) || null;

export async function recordLoginFailure(
  req: Request,
  audience: LoginAudience,
  email: string,
  outcome: LoginFailure,
) {
  try {
    const forwarded =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ip =
      clean(req.headers.get("cf-connecting-ip"), 80) ||
      clean(req.headers.get("x-real-ip"), 80) ||
      clean(forwarded, 80);
    const country =
      clean(req.headers.get("cf-ipcountry"), 80) ||
      clean(req.headers.get("x-vercel-ip-country"), 80);
    const region =
      clean(req.headers.get("x-vercel-ip-country-region"), 120) ||
      clean(req.headers.get("cf-region"), 120);
    const { error } = await createAdminClient().rpc(
      "record_login_security_event",
      {
        p_audience: audience,
        p_email: email.toLowerCase().trim().slice(0, 254),
        p_outcome: outcome,
        p_ip: ip,
        p_country: country,
        p_region: region,
        p_user_agent: clean(req.headers.get("user-agent"), 500),
      },
    );
    if (error)
      console.error("Login security event write failed", { code: error.code });
  } catch {
    console.error("Login security event service unavailable");
  }
}

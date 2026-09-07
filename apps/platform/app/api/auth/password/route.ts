import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { requireCustomer } from "@/lib/customerAuth";
import { internalError } from "@/modules/http/errors";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(72),
});

/**
 * POST /api/auth/password
 * Body: { currentPassword, newPassword }
 * Signed-in customers can rotate their own password.
 */
export async function POST(req: Request) {
  const guard = await requireCustomer();
  if (!guard.ok) return guard.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("web_users")
    .select("id, password_hash")
    .eq("id", guard.session.sub)
    .maybeSingle();
  if (error) return internalError("Customer password read failed", error);
  if (!data)
    return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const bcrypt = await import("bcryptjs");
  if (!(await bcrypt.compare(currentPassword, data.password_hash))) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 },
    );
  }
  const newHash = await bcrypt.hash(newPassword, 12);
  const { error: updErr } = await supabase
    .from("web_users")
    .update({ password_hash: newHash })
    .eq("id", data.id);
  if (updErr) return internalError("Customer password update failed", updErr);

  return NextResponse.json({ ok: true });
}

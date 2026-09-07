import { NextResponse } from "next/server";
import { requireAdmin, getAdminContext } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase";
import { bulkPublishInput } from "@/modules/devices/validation";
import { dbError, invalid } from "@/modules/http/errors";

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const actor = await getAdminContext();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = bulkPublishInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid();
  const { data, error } = await createAdminClient().rpc(
    "publish_device_group",
    {
      p_scope: parsed.data.target,
      p_device_ids: parsed.data.deviceIds,
      p_content: parsed.data.content,
      p_actor: actor.email,
    },
  );
  return error ? dbError(error) : NextResponse.json(data);
}

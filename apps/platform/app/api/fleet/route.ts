import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { z } from "zod";
import { internalError } from "@/modules/http/errors";

// Public: latest fleet-wide GPU stats for the marketing ticker.
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fleet_stats")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return internalError("Fleet snapshot read failed", error);

  return NextResponse.json(
    data ?? {
      total_gpus: 0,
      active_miners: 0,
      total_hashrate: 0,
      daily_rewards: 0,
    },
  );
}

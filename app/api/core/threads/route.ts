// FILE: app/api/core/threads/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createServiceClient();

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const org_key = (url.searchParams.get("org_key") ?? "swva").trim();

  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, channel, external_user_id, display_name, created_at, buyer_id, puppy_id, org_key")
    .eq("org_key", org_key)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load threads." }, { status: 500 });
  }

  return NextResponse.json({ threads: data ?? [] });
}
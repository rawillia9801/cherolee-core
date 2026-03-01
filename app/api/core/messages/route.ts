// FILE: app/api/core/messages/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createServiceClient();

  const url = new URL(req.url);
  const thread_id = (url.searchParams.get("thread_id") ?? "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10), 500);

  if (!thread_id) {
    return NextResponse.json({ error: "thread_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, thread_id, role, content, meta, created_at, org_key")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}
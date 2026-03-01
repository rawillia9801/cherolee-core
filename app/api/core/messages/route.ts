// FILE: app/api/core/messages/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs"; // important if createServiceClient relies on Node APIs

export async function GET(req: Request) {
  try {
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const thread_id = (url.searchParams.get("thread_id") ?? "").trim();
    const limitRaw = parseInt(url.searchParams.get("limit") ?? "200", 10);
    const limit = Math.min(Number.isFinite(limitRaw) ? limitRaw : 200, 500);

    if (!thread_id) {
      return NextResponse.json({ ok: false, error: "thread_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, thread_id, role, content, meta, created_at, org_key")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("messages GET db error:", error);
      return NextResponse.json({ ok: false, error: "Failed to load messages." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messages: data ?? [] });
  } catch (e: any) {
    console.error("messages GET crash:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error." },
      { status: 500 }
    );
  }
}
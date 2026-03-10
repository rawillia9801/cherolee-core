// FILE: app/api/inventory/delete/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ✅ Must await cookies()
    const cookieStore = await cookies();

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iywgzsmnxbptititowtp.supabase.co";
    const anon =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5d2d6c21ueGJwdGl0aXRvd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTMyNTQsImV4cCI6MjA3OTU4OTI1NH0.KIv0nzANGw1JsIW9n13dCrywJtHc5KnQJzKfs2kT7w0";

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = (body?.id ?? "").toString().trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    // ✅ Delete is scoped to owner_id so you can’t delete someone else’s row.
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id);

    if (error) {
      console.error("inventory delete db error:", error);
      return NextResponse.json(
        { ok: false, error: error.message ?? "Failed to delete item." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("inventory delete crash:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error." }, { status: 500 });
  }
}
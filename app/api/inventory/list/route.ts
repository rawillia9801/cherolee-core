import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const res = NextResponse.json({ ok: false, error: "Unhandled" }, { status: 500 });

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return NextResponse.json(
        { ok: false, error: "Missing env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY" },
        { status: 500 }
      );
    }

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    });

    // Require auth (uses cookies)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const userId = authData.user.id;

    const { data, error } = await supabase
      .from("inventory")
      .select(
        `
        id,
        owner_id,
        name,
        sku,
        category,
        listed_on,
        quantity,
        cost,
        total_cost,
        serial_numbers,
        notes,
        created_at,
        updated_at
      `
      )
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // IMPORTANT: return the same `res` so any Set-Cookie headers are preserved
    res.headers.set("content-type", "application/json");
    return NextResponse.json({ ok: true, rows: data ?? [] }, { status: 200, headers: res.headers });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
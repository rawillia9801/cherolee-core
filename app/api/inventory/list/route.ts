// FILE: app/api/inventory/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // ✅ Next.js 16: cookies() can be async. If you don’t await it, you get:
    // "cookieStore.getAll is not a function"
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

    const u = new URL(req.url);

    const limitRaw = parseInt(u.searchParams.get("limit") ?? "250", 10);
    const limit = Math.min(Number.isFinite(limitRaw) ? limitRaw : 250, 500);

    const search = (u.searchParams.get("search") ?? "").trim();
    const category = (u.searchParams.get("category") ?? "").trim();
    const listed_on = (u.searchParams.get("listed_on") ?? "").trim();
    const low_only = (u.searchParams.get("low_only") ?? "").trim() === "1";

    let q = supabase
      .from("inventory")
      .select(
        "id, owner_id, name, sku, category, listed_on, quantity, cost, total_cost, current_sales_price_walmart, current_sales_price_ebay, sent_to_wfs, updated_at, notes"
      )
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (category && category !== "all") q = q.eq("category", category);
    if (listed_on && listed_on !== "all") q = q.eq("listed_on", listed_on);

    if (search) {
      // NOTE: This is safe enough for your use case; if you ever have commas/parentheses in search,
      // we can escape it, but not needed right now.
      q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    if (low_only) q = q.lte("quantity", 2);

    const { data, error } = await q;

    if (error) {
      console.error("inventory list db error:", error);
      return NextResponse.json({ ok: false, error: "Failed to load inventory." }, { status: 500 });
    }

    const items = data ?? [];
    const kpis = {
      totalItems: items.length,
      totalQty: items.reduce((sum: number, it: any) => sum + Number(it.quantity ?? 0), 0),
      totalValue: items.reduce((sum: number, it: any) => sum + Number(it.total_cost ?? 0), 0),
      lowCount: items.filter((it: any) => Number(it.quantity ?? 0) <= 2).length,
      wfsCount: items.filter((it: any) => !!it.sent_to_wfs).length,
    };

    return NextResponse.json({ ok: true, items, kpis });
  } catch (e: any) {
    console.error("inventory list crash:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error." }, { status: 500 });
  }
}
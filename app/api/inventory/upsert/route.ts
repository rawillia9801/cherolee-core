// FILE: app/api/inventory/upsert/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {
    // ✅ Next.js 16 / Turbopack: MUST await cookies()
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

    const id = (body?.id ?? "").toString().trim(); // optional for insert
    const name = (body?.name ?? "").toString().trim();

    if (!name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }

    // ✅ owner_id always comes from auth (never trust client)
    const payload: any = {
      owner_id: user.id,
      name,
      sku: (body?.sku ?? "").toString().trim() || null,
      category: (body?.category ?? "").toString().trim() || null,
      listed_on: (body?.listed_on ?? "").toString().trim() || null,
      quantity: Math.max(0, Math.trunc(num(body?.quantity))),
      cost: Math.max(0, num(body?.cost)),
      total_cost: Math.max(0, num(body?.total_cost ?? num(body?.cost) * num(body?.quantity))),
      current_sales_price_walmart: Math.max(0, num(body?.current_sales_price_walmart)),
      current_sales_price_ebay: Math.max(0, num(body?.current_sales_price_ebay)),
      sent_to_wfs: !!body?.sent_to_wfs,
      notes: (body?.notes ?? "").toString().trim() || null,
    };

    // ✅ Update is scoped to (id + owner_id). Insert uses owner_id from auth.
    const { data, error } = id
      ? await supabase
          .from("inventory")
          .update(payload)
          .eq("id", id)
          .eq("owner_id", user.id)
          .select(
            "id, owner_id, name, sku, category, listed_on, quantity, cost, total_cost, current_sales_price_walmart, current_sales_price_ebay, sent_to_wfs, updated_at, notes"
          )
          .single()
      : await supabase
          .from("inventory")
          .insert(payload)
          .select(
            "id, owner_id, name, sku, category, listed_on, quantity, cost, total_cost, current_sales_price_walmart, current_sales_price_ebay, sent_to_wfs, updated_at, notes"
          )
          .single();

    if (error) {
      console.error("inventory upsert db error:", error);
      return NextResponse.json(
        { ok: false, error: error.message ?? "Failed to save item." },
        { status: 500 }
      );
    }

    // If update matched nothing (wrong id or not owned), data will be null
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Item not found or not owned by current user." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    console.error("inventory upsert crash:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error." }, { status: 500 });
  }
}
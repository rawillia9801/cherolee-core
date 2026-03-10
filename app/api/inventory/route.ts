// FILE: app/api/inventory/route.ts
// CHEROLEE — Single inventory API (LIST + UPSERT + DELETE)
// - GET  /api/inventory?limit=250&search=...&category=...&listed_on=...&low_only=1
// - POST /api/inventory  { op: "upsert", ...fields }
// - POST /api/inventory  { op: "delete", id }

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iywgzsmnxbptititowtp.supabase.co";

const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5d2d6c21ueGJwdGl0aXRvd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTMyNTQsImV4cCI6MjA3OTU4OTI1NH0.KIv0nzANGw1JsIW9n13dCrywJtHc5KnQJzKfs2kT7w0";

function supabaseForReq() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getCookieValue(cookieHeader: string, name: string) {
  // Exact cookie name match; supports URL-encoded JSON cookie values.
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (!p.startsWith(name + "=")) continue;
    return p.slice(name.length + 1);
  }
  return null;
}

async function getAuthedUser(req: Request) {
  const supabase = supabaseForReq();
  const cookieHeader = req.headers.get("cookie") ?? "";

  // Supabase auth cookie: sb-<project-ref>-auth-token
  // Find it by scanning cookies for any that match /^sb-.*-auth-token$/
  const cookiePairs = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  let tokenCookieName: string | null = null;
  for (const pair of cookiePairs) {
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const k = pair.slice(0, eq);
    if (/^sb-[^-]+-auth-token$/.test(k)) {
      tokenCookieName = k;
      break;
    }
  }

  if (!tokenCookieName) return { supabase, user: null };

  const raw = getCookieValue(cookieHeader, tokenCookieName);
  if (!raw) return { supabase, user: null };

  let tokenJson: any;
  try {
    tokenJson = JSON.parse(decodeURIComponent(raw));
  } catch {
    // Some environments double-encode; try once more
    try {
      tokenJson = JSON.parse(decodeURIComponent(decodeURIComponent(raw)));
    } catch {
      return { supabase, user: null };
    }
  }

  const access_token = tokenJson?.access_token;
  const refresh_token = tokenJson?.refresh_token;
  if (!access_token || !refresh_token) return { supabase, user: null };

  await supabase.auth.setSession({ access_token, refresh_token });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user: user ?? null };
}

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getAuthedUser(req);
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

    const url = new URL(req.url);

    const limitRaw = parseInt(url.searchParams.get("limit") ?? "250", 10);
    const limit = Math.min(Number.isFinite(limitRaw) ? limitRaw : 250, 500);

    const search = (url.searchParams.get("search") ?? "").trim();
    const category = (url.searchParams.get("category") ?? "").trim();
    const listed_on = (url.searchParams.get("listed_on") ?? "").trim();
    const low_only = (url.searchParams.get("low_only") ?? "").trim() === "1";

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
    if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,notes.ilike.%${search}%`);
    if (low_only) q = q.lte("quantity", 2);

    const { data, error } = await q;
    if (error) {
      console.error("inventory GET db error:", error);
      return NextResponse.json({ ok: false, error: error.message ?? "Failed to load inventory." }, { status: 500 });
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
    console.error("inventory GET crash:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await getAuthedUser(req);
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const op = (body?.op ?? "").toString().trim();

    if (op === "delete") {
      const id = (body?.id ?? "").toString().trim();
      if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

      const { error } = await supabase.from("inventory").delete().eq("id", id).eq("owner_id", user.id);
      if (error) {
        console.error("inventory DELETE db error:", error);
        return NextResponse.json({ ok: false, error: error.message ?? "Failed to delete." }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (op === "upsert") {
      const id = (body?.id ?? "").toString().trim(); // optional
      const name = (body?.name ?? "").toString().trim();
      if (!name) return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });

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

      const sel =
        "id, owner_id, name, sku, category, listed_on, quantity, cost, total_cost, current_sales_price_walmart, current_sales_price_ebay, sent_to_wfs, updated_at, notes";

      const { data, error } = id
        ? await supabase.from("inventory").update(payload).eq("id", id).eq("owner_id", user.id).select(sel).single()
        : await supabase.from("inventory").insert(payload).select(sel).single();

      if (error) {
        console.error("inventory UPSERT db error:", error);
        return NextResponse.json({ ok: false, error: error.message ?? "Failed to save." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, item: data });
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid op. Use { op: "upsert" } or { op: "delete" }.' },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("inventory POST crash:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error." }, { status: 500 });
  }
}
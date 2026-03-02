// FILE: app/dashboard/inventory/page.tsx
// CHEROLEE — Inventory (Read-only UI scaffold; will wire to Supabase once schema is confirmed)
//
// CHANGELOG
// - NEW: Inventory dashboard page scaffold with KPIs, filters, table, low-stock panel
// - NOTE: This page does NOT invent tables. It expects an API route you already have or we will create after schema confirmation.
//
// ANCHOR:EXPECTED_API
// - GET /api/inventory/list?limit=200&search=...&category=...&listed_on=...&low_only=...
//   -> { items: any[], kpis: {...} }

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) return { __empty: true, __text: "" };
  try {
    return JSON.parse(text);
  } catch {
    return { __nonjson: true, __text: text.slice(0, 5000) };
  }
}

type InventoryItem = Record<string, any>;

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters (schema-agnostic until you paste columns)
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [listedOn, setListedOn] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);

  const kpis = useMemo(() => {
    const totalItems = items.length;

    // best-effort, schema-agnostic guesses (won’t break if fields absent)
    const totalQty = items.reduce((sum, it) => sum + Number(it.quantity ?? it.qty ?? 0), 0);
    const totalValue = items.reduce(
      (sum, it) => sum + Number(it.totalCost ?? it.total_cost ?? (Number(it.cost ?? 0) * Number(it.quantity ?? 0))),
      0
    );

    // low stock: if item has reorder_point/min_qty, use that; else quantity <= 2
    const lowCount = items.filter((it) => {
      const q = Number(it.quantity ?? it.qty ?? 0);
      const rp = it.reorder_point ?? it.min_qty ?? it.min_quantity;
      if (rp != null) return q <= Number(rp);
      return q <= 2;
    }).length;

    return { totalItems, totalQty, totalValue, lowCount };
  }, [items]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "250");
      if (search.trim()) params.set("search", search.trim());
      if (category !== "all") params.set("category", category);
      if (listedOn !== "all") params.set("listed_on", listedOn);
      if (lowOnly) params.set("low_only", "1");

      // This endpoint will be wired AFTER you paste your inventory columns
      const res = await fetch(`/api/inventory/list?${params.toString()}`, { cache: "no-store" });
      const data = await safeJson(res);

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          (data?.__nonjson ? `Inventory API returned non-JSON: ${data.__text}` : "") ||
          (data?.__empty ? "Inventory API returned an empty response." : "") ||
          "Failed to load inventory.";
        throw new Error(msg);
      }

      setItems((data?.items ?? []) as InventoryItem[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derive categories/platforms from payload if present (no hardcoding)
  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) {
      const v = (it.category ?? it.type ?? "").toString().trim();
      if (v) s.add(v);
    }
    return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const listedOns = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) {
      const v = (it.listed_on ?? it.platform ?? it.channel ?? "").toString().trim();
      if (v) s.add(v);
    }
    return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const columns = useMemo(() => {
    // display stable columns if present, otherwise show first few keys
    const preferred = ["name", "sku", "quantity", "cost", "totalCost", "category", "listed_on", "updated_at"];
    const keys = new Set<string>();
    for (const k of preferred) keys.add(k);

    // add keys seen in data
    for (const it of items.slice(0, 50)) {
      Object.keys(it || {}).forEach((k) => keys.add(k));
    }

    // only show up to 8 columns to keep table clean
    const list = Array.from(keys);
    // prefer preferred order first
    const ordered = [
      ...preferred.filter((k) => list.includes(k)),
      ...list.filter((k) => !preferred.includes(k)),
    ];
    return ordered.slice(0, 8);
  }, [items]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none fixed inset-0 opacity-[0.55]">
        <div className="absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950 to-zinc-950" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 py-8">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/10"
              >
                ← Dashboard
              </Link>
              <span className="text-xs text-zinc-500">/</span>
              <span className="text-xs text-zinc-300">Inventory</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">Inventory</h1>
            <p className="mt-1 text-sm text-zinc-300">
              Live stock view. Updates should be driven by Core; this page is the glass panel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className={cx(
                "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                "bg-white text-zinc-950 hover:bg-zinc-100",
                "disabled:opacity-60 disabled:hover:bg-white"
              )}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>

            <Link
              href="/dashboard/core"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10"
              title="Use Core to add/adjust inventory"
            >
              Open Core Console
            </Link>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
            <div className="mt-2 text-xs text-rose-200/80">
              This usually means <span className="font-semibold">/api/inventory/list</span> isn’t wired yet. Paste your
              inventory table columns and I’ll generate the exact API route to match your schema.
            </div>
          </div>
        ) : null}

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4">
            <div className="text-[11px] text-zinc-400">Active Items</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100">{kpis.totalItems}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4">
            <div className="text-[11px] text-zinc-400">Total Quantity</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100">{kpis.totalQty}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4">
            <div className="text-[11px] text-zinc-400">Estimated Inventory Value</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100">
              ${Number(kpis.totalValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4">
            <div className="text-[11px] text-zinc-400">Low Stock</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100">{kpis.lowCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="text-[11px] text-zinc-400">Search</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name / sku / platform / category…"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-white/20"
              />
            </div>

            <div>
              <div className="text-[11px] text-zinc-400">Category</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-white/20"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] text-zinc-400">Listed On</div>
              <select
                value={listedOn}
                onChange={(e) => setListedOn(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-white/20"
              >
                {listedOns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 hover:bg-black/40">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
                className="h-4 w-4 accent-white"
              />
              Low stock only
            </label>

            <button
              onClick={load}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
            >
              Apply / Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-100">Inventory Table</div>
              <div className="text-xs text-zinc-400">Read-only until your schema is confirmed and API is wired.</div>
            </div>
            <div className="text-xs text-zinc-400">{items.length} rows</div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/20 text-xs text-zinc-300">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-3 font-semibold border-b border-white/5 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-sm text-zinc-300">
                      {loading ? "Loading…" : "No inventory loaded yet."}
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id ?? it.sku ?? idx} className="hover:bg-white/[0.04]">
                      {columns.map((c) => (
                        <td key={c} className="px-4 py-3 text-sm text-zinc-200 whitespace-nowrap">
                          {String(it?.[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 px-4 py-3 text-[11px] text-zinc-500">
            Next: wire <span className="text-zinc-300 font-semibold">/api/inventory/list</span> to your existing
            Supabase inventory table (no guessing). Paste columns and I’ll generate the exact API route.
          </div>
        </div>
      </div>
    </main>
  );
}
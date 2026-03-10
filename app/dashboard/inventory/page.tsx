"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Search,
  Plus,
  RefreshCcw,
  Trash2,
  Edit3,
  X,
  Package,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// IMPORTANT: replace this with your real owner UUID
const OWNER_ID = "a9960a10-9972-4cba-bde1-4d95db611514";

type InventoryItem = {
  id: string;
  owner_id: string;
  name: string;
  sku: string;
  category: string | null;
  supplier: string | null;
  quantity: number;
  reorder_level: number;
  cost: number;
  sell_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  sku: string;
  category: string;
  supplier: string;
  quantity: number;
  reorder_level: number;
  cost: number;
  sell_price: number;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  sku: "",
  category: "",
  supplier: "",
  quantity: 0,
  reorder_level: 0,
  cost: 0,
  sell_price: 0,
  notes: "",
};

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function normalizeSku(value: string) {
  return value.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-_]/g, "");
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">{icon}</div>
      </div>
      <div className="mt-6">
        <div className="text-4xl font-semibold tracking-tight text-white">{value}</div>
        <div className="text-sm text-zinc-400 mt-1">{title}</div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function fetchInventory() {
    setSyncing(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("owner_id", OWNER_ID)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setItems((data || []) as InventoryItem[]);
    }

    setLoading(false);
    setTimeout(() => setSyncing(false), 300);
  }

  useEffect(() => {
    fetchInventory();
  }, []);

  function openNewModal() {
    setEditingId(null);
    setForm(emptyForm);
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  }

  function openEditModal(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      name: item.name ?? "",
      sku: item.sku ?? "",
      category: item.category ?? "",
      supplier: item.supplier ?? "",
      quantity: Number(item.quantity || 0),
      reorder_level: Number(item.reorder_level || 0),
      cost: Number(item.cost || 0),
      sell_price: Number(item.sell_price || 0),
      notes: item.notes ?? "",
    });
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!OWNER_ID || OWNER_ID === "a9960a10-9972-4cba-bde1-4d95db611514") {
      setSaving(false);
      setErrorMsg("Replace OWNER_ID in the page with your real owner UUID.");
      return;
    }

    if (!form.name.trim()) {
      setSaving(false);
      setErrorMsg("Name is required.");
      return;
    }

    if (!form.sku.trim()) {
      setSaving(false);
      setErrorMsg("SKU is required.");
      return;
    }

    const payload = {
      owner_id: OWNER_ID,
      name: form.name.trim(),
      sku: normalizeSku(form.sku),
      category: form.category.trim(),
      supplier: form.supplier.trim(),
      quantity: Math.max(0, Number(form.quantity || 0)),
      reorder_level: Math.max(0, Number(form.reorder_level || 0)),
      cost: Number(form.cost || 0),
      sell_price: Number(form.sell_price || 0),
      notes: form.notes.trim(),
    };

    let error;

    if (editingId) {
      ({ error } = await supabase.from("inventory").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("inventory").insert([payload]));
    }

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSuccessMsg(editingId ? "Item updated." : "Item created.");
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    await fetchInventory();
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this inventory item?");
    if (!ok) return;

    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase.from("inventory").delete().eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (selected?.id === id) setSelected(null);
    setSuccessMsg("Item deleted.");
    await fetchInventory();
  }

  async function adjustQuantity(item: InventoryItem, delta: number) {
    const nextQty = Math.max(0, Number(item.quantity || 0) + delta);

    const { error } = await supabase
      .from("inventory")
      .update({ quantity: nextQty })
      .eq("id", item.id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    await fetchInventory();

    if (selected?.id === item.id) {
      setSelected({ ...item, quantity: nextQty });
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) => {
      return (
        item.name?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.supplier?.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStock = items.filter(
      (i) => Number(i.quantity || 0) > 0 && Number(i.quantity || 0) <= Number(i.reorder_level || 0)
    ).length;
    const outOfStock = items.filter((i) => Number(i.quantity || 0) === 0).length;
    const inventoryValue = items.reduce(
      (sum, i) => sum + Number(i.quantity || 0) * Number(i.cost || 0),
      0
    );

    return {
      totalItems,
      lowStock,
      outOfStock,
      inventoryValue,
    };
  }, [items]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-white/5 bg-zinc-900/40 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-8 py-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest">
          <div className="flex items-center gap-3 text-emerald-400">
            <div className={`w-2 h-2 rounded-full bg-emerald-400 ${syncing ? "animate-ping" : ""}`} />
            Inventory Synced
          </div>
          <button
            onClick={fetchInventory}
            className="flex items-center gap-2 hover:text-white transition-colors"
            type="button"
          >
            <RefreshCcw size={14} className={syncing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-8 py-10">
        <div className="flex items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Inventory</h1>
            <p className="text-zinc-400 mt-2">
              Real inventory manager with add, edit, delete, search, SKU, and quantity updates.
            </p>
          </div>

          <button
            onClick={openNewModal}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-2xl font-semibold flex items-center gap-2"
            type="button"
          >
            <Plus size={18} />
            New Item
          </button>
        </div>

        {(errorMsg || successMsg) && (
          <div className="mb-6 space-y-3">
            {errorMsg && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-300">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300">
                {successMsg}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Items" value={stats.totalItems} icon={<Package size={20} />} />
          <StatCard title="Low Stock" value={stats.lowStock} icon={<AlertTriangle size={20} />} />
          <StatCard title="Out of Stock" value={stats.outOfStock} icon={<X size={20} />} />
          <StatCard title="Inventory Value" value={money(stats.inventoryValue)} icon={<CheckCircle2 size={20} />} />
        </div>

        <div className="relative mb-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, SKU, category, supplier..."
            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        <div className="bg-zinc-900/40 border border-white/10 rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-xs uppercase tracking-widest text-zinc-400">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Reorder</th>
                <th className="px-6 py-4">Unit Cost</th>
                <th className="px-6 py-4">Sell Price</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-zinc-400" colSpan={9}>
                    Loading inventory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-zinc-400" colSpan={9}>
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const low = Number(item.quantity || 0) <= Number(item.reorder_level || 0);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => setSelected(item)}
                    >
                      <td className="px-6 py-5 font-semibold text-white">{item.name}</td>
                      <td className="px-6 py-5 font-mono text-zinc-300">{item.sku}</td>
                      <td className="px-6 py-5 text-zinc-300">{item.category || "-"}</td>
                      <td className={`px-6 py-5 font-semibold ${low ? "text-amber-400" : "text-white"}`}>
                        {item.quantity}
                      </td>
                      <td className="px-6 py-5 text-zinc-300">{item.reorder_level}</td>
                      <td className="px-6 py-5 text-zinc-300">{money(item.cost)}</td>
                      <td className="px-6 py-5 text-zinc-300">{money(item.sell_price)}</td>
                      <td className="px-6 py-5 text-zinc-300">{item.supplier || "-"}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(item);
                            }}
                            className="p-2 rounded-xl hover:bg-white/5"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="p-2 rounded-xl hover:bg-rose-500/10 hover:text-rose-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-950 border-l border-white/10 z-50 p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Item Details</h2>
            <button
              onClick={() => setSelected(null)}
              className="p-2 rounded-xl hover:bg-white/5"
              type="button"
            >
              <X size={22} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Name</div>
              <div className="text-xl font-semibold">{selected.name}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">SKU</div>
              <div className="font-mono text-lg">{selected.sku}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Quantity</div>
                <div className="text-3xl font-bold">{selected.quantity}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Reorder Level</div>
                <div className="text-3xl font-bold">{selected.reorder_level}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Unit Cost</div>
                <div className="text-xl font-semibold">{money(selected.cost)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Sell Price</div>
                <div className="text-xl font-semibold">{money(selected.sell_price)}</div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Category</div>
              <div className="text-zinc-300">{selected.category || "-"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Supplier</div>
              <div className="text-zinc-300">{selected.supplier || "-"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Notes</div>
              <div className="text-zinc-300 whitespace-pre-wrap">{selected.notes || "-"}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                type="button"
                onClick={() => adjustQuantity(selected, 1)}
                className="py-3 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200"
              >
                +1 Quantity
              </button>
              <button
                type="button"
                onClick={() => adjustQuantity(selected, -1)}
                className="py-3 rounded-2xl border border-white/10 font-semibold hover:bg-white/5"
              >
                -1 Quantity
              </button>
            </div>

            <button
              type="button"
              onClick={() => openEditModal(selected)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Edit Item
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl p-8"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-bold">{editingId ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
                <p className="text-zinc-400 mt-2">
                  {editingId ? "Update the inventory record." : "Create a new inventory record."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm mb-2 text-zinc-400">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">SKU</label>
                <input
                  required
                  value={form.sku}
                  onChange={(e) => setForm((prev) => ({ ...prev, sku: normalizeSku(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 font-mono"
                  placeholder="SKU-001"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                  placeholder="Archery"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Supplier</label>
                <input
                  value={form.supplier}
                  onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                  placeholder="Main supplier"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))
                  }
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Reorder Level</label>
                <input
                  type="number"
                  min="0"
                  value={form.reorder_level}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reorder_level: Number(e.target.value) }))
                  }
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Unit Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cost: Number(e.target.value) }))
                  }
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Sell Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sell_price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sell_price: Number(e.target.value) }))
                  }
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-2 text-zinc-400">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 resize-none"
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 hover:bg-white/5"
                disabled={saving}
              >
                Cancel\
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : editingId ? "Update Item" : "Save Item"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
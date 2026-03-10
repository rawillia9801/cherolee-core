"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Search,
  Plus,
  RefreshCcw,
  Trash2,
  Package,
  AlertTriangle,
  X,
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface InventoryItem {
  id: string;
  owner_id: string;
  name: string;
  quantity: number | null;
  cost: number | null;
  created_at?: string | null;
}

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
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
        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
          {icon}
        </div>
      </div>
      <div className="mt-6">
        <div className="text-4xl font-light tracking-tight text-white">{value}</div>
        <div className="text-sm text-zinc-400 mt-1">{title}</div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    quantity: 0,
    cost: 0,
  });

  const fetchInventory = async () => {
    setIsSyncing(true);

    const { data: items, error } = await supabase
      .from("inventory")
      .select("id, owner_id, name, quantity, cost, created_at")
      .order("created_at", { ascending: false });

    if (!error && items) {
      setData(items as InventoryItem[]);
    }

    setLoading(false);
    setTimeout(() => setIsSyncing(false), 500);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("inventory").insert([
      {
        name: formData.name.trim(),
        quantity: formData.quantity,
        cost: formData.cost,
      },
    ]);

    if (!error) {
      setFormData({ name: "", quantity: 0, cost: 0 });
      setShowNewModal(false);
      fetchInventory();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this inventory item?")) return;

    const { error } = await supabase.from("inventory").delete().eq("id", id);

    if (!error) {
      setData((prev) => prev.filter((item) => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  const handleAdjustQuantity = async (id: string, newQuantity: number) => {
    const safeQty = Math.max(0, newQuantity);

    const { error } = await supabase
      .from("inventory")
      .update({ quantity: safeQty })
      .eq("id", id);

    if (!error) {
      fetchInventory();
    }
  };

  const processedData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return data.filter((item) =>
      item.name?.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const stats = useMemo(() => {
    const totalItems = data.length;
    const lowStock = data.filter((i) => Number(i.quantity || 0) > 0 && Number(i.quantity || 0) <= 5).length;
    const outOfStock = data.filter((i) => Number(i.quantity || 0) === 0).length;
    const totalValue = data.reduce(
      (acc, i) => acc + Number(i.quantity || 0) * Number(i.cost || 0),
      0
    );

    return {
      totalItems,
      lowStock,
      outOfStock,
      totalValue,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-white/5 bg-zinc-900/40 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-8 py-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest">
          <div className="flex items-center gap-3 text-emerald-400">
            <div
              className={`w-2 h-2 rounded-full bg-emerald-400 ${
                isSyncing ? "animate-ping" : ""
              }`}
            />
            Inventory Synced
          </div>
          <button
            onClick={fetchInventory}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <RefreshCcw size={14} className={isSyncing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-8 py-10">
        <div className="flex items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Inventory</h1>
            <p className="text-zinc-400 mt-2">Manage your recorded inventory items.</p>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-2xl font-semibold flex items-center gap-2"
          >
            <Plus size={18} />
            New Item
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Items" value={stats.totalItems} icon={<Package size={20} />} />
          <StatCard title="Low Stock" value={stats.lowStock} icon={<AlertTriangle size={20} />} />
          <StatCard title="Out of Stock" value={stats.outOfStock} icon={<X size={20} />} />
          <StatCard title="Inventory Value" value={money(stats.totalValue)} icon={<Package size={20} />} />
        </div>

        <div className="relative mb-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inventory by name..."
            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        <div className="bg-zinc-900/40 border border-white/10 rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-xs uppercase tracking-widest text-zinc-400">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Unit Cost</th>
                <th className="px-6 py-4">Total Cost</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-zinc-400" colSpan={6}>
                    Loading inventory...
                  </td>
                </tr>
              ) : processedData.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-zinc-400" colSpan={6}>
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                processedData.map((item) => {
                  const qty = Number(item.quantity || 0);
                  const cost = Number(item.cost || 0);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <td className="px-6 py-5 font-semibold text-white">{item.name}</td>
                      <td className="px-6 py-5">{qty}</td>
                      <td className="px-6 py-5">{money(cost)}</td>
                      <td className="px-6 py-5">{money(qty * cost)}</td>
                      <td className="px-6 py-5 text-zinc-400">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="p-2 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {selectedItem && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-950 border-l border-white/10 z-50 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Item Details</h2>
            <button
              onClick={() => setSelectedItem(null)}
              className="p-2 rounded-xl hover:bg-white/5"
            >
              <X size={22} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Name</div>
              <div className="text-xl font-semibold">{selectedItem.name}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Quantity</div>
              <div className="text-4xl font-bold">{selectedItem.quantity || 0}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Cost</div>
              <div className="text-xl font-semibold">{money(selectedItem.cost)}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() =>
                  handleAdjustQuantity(
                    selectedItem.id,
                    Number(selectedItem.quantity || 0) + 1
                  )
                }
                className="py-3 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-200"
              >
                +1 Quantity
              </button>

              <button
                onClick={() =>
                  handleAdjustQuantity(
                    selectedItem.id,
                    Number(selectedItem.quantity || 0) - 1
                  )
                }
                className="py-3 rounded-2xl border border-white/10 font-semibold hover:bg-white/5"
              >
                -1 Quantity
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <form
            onSubmit={handleAddItem}
            className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-3xl p-8"
          >
            <h2 className="text-3xl font-bold mb-2">Add Inventory Item</h2>
            <p className="text-zinc-400 mb-8">Create a new inventory record.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Quantity</label>
                <input
                  type="number"
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity: Number(e.target.value),
                    }))
                  }
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Unit Cost</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cost: Number(e.target.value),
                    }))
                  }
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
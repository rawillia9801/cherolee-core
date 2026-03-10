"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  X,
  Package,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const OWNER_ID = "a9960a10-9972-4cba-bde1-4d95db611514";

type Item = {
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
  created_at?: string;
};

type Sale = {
  id: string;
  inventory_id: string;
  owner_id: string;
  sold_at: string;
  channel: string;
  order_number: string;
  customer_name: string;
  quantity: number;
  sale_price: number;
  shipping_charged: number;
  shipping_cost: number;
  platform_fee: number;
  other_fee: number;
  notes: string;
  created_at: string;
};

type ItemFormState = {
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

type SaleFormState = {
  sold_at: string;
  channel: string;
  order_number: string;
  customer_name: string;
  quantity: number;
  sale_price: number;
  shipping_charged: number;
  shipping_cost: number;
  platform_fee: number;
  other_fee: number;
  notes: string;
};

const blankItemForm: ItemFormState = {
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

const blankSaleForm: SaleFormState = {
  sold_at: new Date().toISOString().slice(0, 16),
  channel: "",
  order_number: "",
  customer_name: "",
  quantity: 1,
  sale_price: 0,
  shipping_charged: 0,
  shipping_cost: 0,
  platform_fee: 0,
  other_fee: 0,
  notes: "",
};

function money(v: number | null | undefined) {
  return Number(v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function normalizeSku(v: string) {
  return v.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-_]/g, "");
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
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(blankItemForm);

  const [selected, setSelected] = useState<Item | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleForm, setSaleForm] = useState<SaleFormState>(blankSaleForm);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadInventory() {
    setErrorMsg("");

    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("owner_id", OWNER_ID)
      .order("created_at", { ascending: false });

    if (error) setErrorMsg(error.message);
    else setItems((data || []) as Item[]);

    setLoading(false);
  }

  async function loadSales(inventoryId: string) {
    setSalesLoading(true);

    const { data, error } = await supabase
      .from("inventory_sales")
      .select("*")
      .eq("owner_id", OWNER_ID)
      .eq("inventory_id", inventoryId)
      .order("sold_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setSales([]);
    } else {
      setSales((data || []) as Sale[]);
    }

    setSalesLoading(false);
  }

  useEffect(() => {
    loadInventory();
  }, []);

  async function selectItem(item: Item) {
    setSelected(item);
    await loadSales(item.id);
  }

  function openNewItem() {
    setEditingId(null);
    setItemForm(blankItemForm);
    setShowItemModal(true);
  }

  function openEditItem(item: Item) {
    setEditingId(item.id);
    setItemForm({
      name: item.name,
      sku: item.sku,
      category: item.category || "",
      supplier: item.supplier || "",
      quantity: item.quantity,
      reorder_level: item.reorder_level,
      cost: item.cost,
      sell_price: item.sell_price,
      notes: item.notes || "",
    });
    setShowItemModal(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!itemForm.name.trim()) {
      setErrorMsg("Name required");
      return;
    }

    if (!itemForm.sku.trim()) {
      setErrorMsg("SKU required");
      return;
    }

    const payload = {
      owner_id: OWNER_ID,
      name: itemForm.name.trim(),
      sku: normalizeSku(itemForm.sku),
      category: itemForm.category.trim(),
      supplier: itemForm.supplier.trim(),
      quantity: Number(itemForm.quantity || 0),
      reorder_level: Number(itemForm.reorder_level || 0),
      cost: Number(itemForm.cost || 0),
      sell_price: Number(itemForm.sell_price || 0),
      notes: itemForm.notes.trim(),
    };

    let error: any;

    if (editingId) {
      ({ error } = await supabase.from("inventory").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("inventory").insert([payload]));
    }

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setShowItemModal(false);
    setEditingId(null);
    setItemForm(blankItemForm);
    setSuccessMsg(editingId ? "Item updated." : "Item added.");
    await loadInventory();
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this item?")) return;

    const { error } = await supabase.from("inventory").delete().eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (selected?.id === id) {
      setSelected(null);
      setSales([]);
    }

    setSuccessMsg("Item deleted.");
    await loadInventory();
  }

  async function adjustQuantity(item: Item, delta: number) {
    const next = Math.max(0, Number(item.quantity || 0) + delta);

    const { error } = await supabase
      .from("inventory")
      .update({ quantity: next })
      .eq("id", item.id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    await loadInventory();
    if (selected?.id === item.id) {
      const updated = { ...item, quantity: next };
      setSelected(updated);
    }
  }

  function openSaleModal() {
    if (!selected) return;

    setSaleForm({
      ...blankSaleForm,
      channel: "",
      quantity: 1,
      sale_price: Number(selected.sell_price || 0),
    });

    setShowSaleModal(true);
  }

  async function saveSale(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selected) {
      setErrorMsg("No inventory item selected.");
      return;
    }

    if (!saleForm.channel.trim()) {
      setErrorMsg("Sales channel is required.");
      return;
    }

    const qty = Math.max(1, Number(saleForm.quantity || 1));
    const currentQty = Number(selected.quantity || 0);

    if (qty > currentQty) {
      setErrorMsg("Sale quantity is greater than inventory on hand.");
      return;
    }

    const salePayload = {
      inventory_id: selected.id,
      owner_id: OWNER_ID,
      sold_at: new Date(saleForm.sold_at).toISOString(),
      channel: saleForm.channel.trim(),
      order_number: saleForm.order_number.trim(),
      customer_name: saleForm.customer_name.trim(),
      quantity: qty,
      sale_price: Number(saleForm.sale_price || 0),
      shipping_charged: Number(saleForm.shipping_charged || 0),
      shipping_cost: Number(saleForm.shipping_cost || 0),
      platform_fee: Number(saleForm.platform_fee || 0),
      other_fee: Number(saleForm.other_fee || 0),
      notes: saleForm.notes.trim(),
    };

    const { error: saleError } = await supabase.from("inventory_sales").insert([salePayload]);

    if (saleError) {
      setErrorMsg(saleError.message);
      return;
    }

    const newQty = currentQty - qty;

    const { error: invError } = await supabase
      .from("inventory")
      .update({ quantity: newQty })
      .eq("id", selected.id);

    if (invError) {
      setErrorMsg(invError.message);
      return;
    }

    const updatedSelected = { ...selected, quantity: newQty };
    setSelected(updatedSelected);
    setShowSaleModal(false);
    setSaleForm(blankSaleForm);
    setSuccessMsg("Sale recorded.");
    await loadInventory();
    await loadSales(selected.id);
  }

  async function removeSale(saleId: string) {
    if (!selected) return;
    if (!confirm("Delete this sale record?")) return;

    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    const { error: deleteErr } = await supabase
      .from("inventory_sales")
      .delete()
      .eq("id", saleId);

    if (deleteErr) {
      setErrorMsg(deleteErr.message);
      return;
    }

    const restoredQty = Number(selected.quantity || 0) + Number(sale.quantity || 0);

    const { error: invErr } = await supabase
      .from("inventory")
      .update({ quantity: restoredQty })
      .eq("id", selected.id);

    if (invErr) {
      setErrorMsg(invErr.message);
      return;
    }

    const updatedSelected = { ...selected, quantity: restoredQty };
    setSelected(updatedSelected);
    setSuccessMsg("Sale deleted and quantity restored.");
    await loadInventory();
    await loadSales(selected.id);
  }

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();

    return items.filter((i) =>
      i.name?.toLowerCase().includes(q) ||
      i.sku?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q) ||
      i.supplier?.toLowerCase().includes(q)
    );
  }, [items, query]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      low: items.filter((i) => i.quantity <= i.reorder_level && i.quantity > 0).length,
      out: items.filter((i) => i.quantity === 0).length,
      value: items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.cost || 0), 0),
    };
  }, [items]);

  const selectedSalesSummary = useMemo(() => {
    const gross = sales.reduce(
      (sum, s) => sum + Number(s.sale_price || 0) + Number(s.shipping_charged || 0),
      0
    );

    const shipping = sales.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0);
    const fees = sales.reduce(
      (sum, s) => sum + Number(s.platform_fee || 0) + Number(s.other_fee || 0),
      0
    );

    const cogs = sales.reduce((sum, s) => {
      const unitCost = Number(selected?.cost || 0);
      return sum + unitCost * Number(s.quantity || 0);
    }, 0);

    const net = gross - shipping - fees - cogs;

    return { gross, shipping, fees, cogs, net };
  }, [sales, selected]);

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <div className="flex justify-between mb-8">
        <h1 className="text-4xl font-bold">Inventory</h1>
        <button onClick={openNewItem} className="bg-indigo-600 px-5 py-3 rounded-xl flex gap-2">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {(errorMsg || successMsg) && (
        <div className="mb-6 space-y-3">
          {errorMsg && <div className="text-rose-400">{errorMsg}</div>}
          {successMsg && <div className="text-emerald-400">{successMsg}</div>}
        </div>
      )}

      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard title="Items" value={stats.total} icon={<Package size={20} />} />
        <StatCard title="Low Stock" value={stats.low} icon={<AlertTriangle size={20} />} />
        <StatCard title="Out" value={stats.out} icon={<AlertTriangle size={20} />} />
        <StatCard title="Inventory Value" value={money(stats.value)} icon={<DollarSign size={20} />} />
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 pl-10 py-3 rounded-xl"
          placeholder="Search inventory..."
        />
      </div>

      <table className="w-full text-left bg-zinc-900 rounded-xl overflow-hidden">
        <thead className="bg-zinc-800 text-xs uppercase">
          <tr>
            <th className="p-4">Name</th>
            <th className="p-4">SKU</th>
            <th className="p-4">Qty</th>
            <th className="p-4">Cost</th>
            <th className="p-4">Price</th>
            <th className="p-4"></th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td className="p-6" colSpan={6}>
                Loading...
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td className="p-6" colSpan={6}>
                No inventory found.
              </td>
            </tr>
          ) : (
            filtered.map((item) => (
              <tr key={item.id} className="border-t border-zinc-800">
                <td className="p-4 cursor-pointer" onClick={() => selectItem(item)}>{item.name}</td>
                <td className="p-4 font-mono cursor-pointer" onClick={() => selectItem(item)}>{item.sku}</td>
                <td className="p-4">
                  {item.quantity}
                  <button onClick={() => adjustQuantity(item, 1)} className="ml-3 text-emerald-400">+</button>
                  <button onClick={() => adjustQuantity(item, -1)} className="ml-2 text-rose-400">-</button>
                </td>
                <td className="p-4">{money(item.cost)}</td>
                <td className="p-4">{money(item.sell_price)}</td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => openEditItem(item)}>
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => removeItem(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showItemModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <form
            onSubmit={saveItem}
            className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl p-8"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-bold">{editingId ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
                <p className="text-zinc-400 mt-2">
                  {editingId ? "Update the inventory record." : "Create a new inventory record."}
                </p>
              </div>
              <button type="button" onClick={() => setShowItemModal(false)} className="p-2 rounded-xl hover:bg-white/5">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm mb-2 text-zinc-400">Name</label>
                <input
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">SKU</label>
                <input
                  required
                  value={itemForm.sku}
                  onChange={(e) => setItemForm((p) => ({ ...p, sku: normalizeSku(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Category</label>
                <input
                  value={itemForm.category}
                  onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Supplier</label>
                <input
                  value={itemForm.supplier}
                  onChange={(e) => setItemForm((p) => ({ ...p, supplier: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Reorder Level</label>
                <input
                  type="number"
                  min="0"
                  value={itemForm.reorder_level}
                  onChange={(e) => setItemForm((p) => ({ ...p, reorder_level: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Unit Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.cost}
                  onChange={(e) => setItemForm((p) => ({ ...p, cost: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Sell Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.sell_price}
                  onChange={(e) => setItemForm((p) => ({ ...p, sell_price: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-2 text-zinc-400">Notes</label>
                <textarea
                  value={itemForm.notes}
                  onChange={(e) => setItemForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={4}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 hover:bg-white/5"
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold">
                {editingId ? "Update Item" : "Save Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-zinc-950 border-l border-white/10 z-50 p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">{selected.name}</h2>
              <div className="text-zinc-400 font-mono mt-1">{selected.sku}</div>
            </div>
            <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-white/5">
              <X size={22} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">On Hand</div>
              <div className="text-2xl font-bold">{selected.quantity}</div>
            </div>
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Unit Cost</div>
              <div className="text-2xl font-bold">{money(selected.cost)}</div>
            </div>
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Sell Price</div>
              <div className="text-2xl font-bold">{money(selected.sell_price)}</div>
            </div>
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Supplier</div>
              <div className="text-lg font-semibold">{selected.supplier || "-"}</div>
            </div>
          </div>

          <div className="flex gap-4 mb-8">
            <button
              onClick={() => adjustQuantity(selected, 1)}
              className="px-4 py-3 rounded-2xl bg-white text-black font-semibold"
            >
              +1 Quantity
            </button>
            <button
              onClick={() => adjustQuantity(selected, -1)}
              className="px-4 py-3 rounded-2xl border border-white/10 font-semibold"
            >
              -1 Quantity
            </button>
            <button
              onClick={openSaleModal}
              className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Record Sale
            </button>
            <button
              onClick={() => openEditItem(selected)}
              className="px-4 py-3 rounded-2xl border border-white/10 font-semibold"
            >
              Edit Item
            </button>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Gross</div>
              <div className="text-xl font-bold">{money(selectedSalesSummary.gross)}</div>
            </div>
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Shipping Cost</div>
              <div className="text-xl font-bold">{money(selectedSalesSummary.shipping)}</div>
            </div>
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Fees</div>
              <div className="text-xl font-bold">{money(selectedSalesSummary.fees)}</div>
            </div>
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">COGS</div>
              <div className="text-xl font-bold">{money(selectedSalesSummary.cogs)}</div>
            </div>
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Net</div>
              <div className="text-xl font-bold">{money(selectedSalesSummary.net)}</div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 text-lg font-semibold">Sales History</div>

            {salesLoading ? (
              <div className="p-6 text-zinc-400">Loading sales...</div>
            ) : sales.length === 0 ? (
              <div className="p-6 text-zinc-400">No sales recorded for this item yet.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-zinc-800 text-xs uppercase text-zinc-400">
                  <tr>
                    <th className="p-4">When</th>
                    <th className="p-4">Where</th>
                    <th className="p-4">Qty</th>
                    <th className="p-4">Sale</th>
                    <th className="p-4">Shipping</th>
                    <th className="p-4">Fees</th>
                    <th className="p-4">Net</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const gross = Number(sale.sale_price || 0) + Number(sale.shipping_charged || 0);
                    const fees = Number(sale.platform_fee || 0) + Number(sale.other_fee || 0);
                    const cogs = Number(selected.cost || 0) * Number(sale.quantity || 0);
                    const net = gross - Number(sale.shipping_cost || 0) - fees - cogs;

                    return (
                      <tr key={sale.id} className="border-t border-zinc-800">
                        <td className="p-4">
                          {new Date(sale.sold_at).toLocaleString()}
                          <div className="text-xs text-zinc-500">{sale.order_number || "-"}</div>
                        </td>
                        <td className="p-4">
                          {sale.channel}
                          <div className="text-xs text-zinc-500">{sale.customer_name || "-"}</div>
                        </td>
                        <td className="p-4">{sale.quantity}</td>
                        <td className="p-4">{money(sale.sale_price)}</td>
                        <td className="p-4">
                          charged {money(sale.shipping_charged)}
                          <div className="text-xs text-zinc-500">cost {money(sale.shipping_cost)}</div>
                        </td>
                        <td className="p-4">
                          {money(Number(sale.platform_fee || 0) + Number(sale.other_fee || 0))}
                        </td>
                        <td className="p-4">{money(net)}</td>
                        <td className="p-4">
                          <button
                            onClick={() => removeSale(sale.id)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showSaleModal && selected && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <form
            onSubmit={saveSale}
            className="w-full max-w-3xl bg-zinc-900 border border-white/10 rounded-3xl p-8"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-bold">Record Sale</h2>
                <p className="text-zinc-400 mt-2">{selected.name}</p>
              </div>
              <button type="button" onClick={() => setShowSaleModal(false)} className="p-2 rounded-xl hover:bg-white/5">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Sold At</label>
                <input
                  type="datetime-local"
                  value={saleForm.sold_at}
                  onChange={(e) => setSaleForm((p) => ({ ...p, sold_at: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Where Sold</label>
                <input
                  value={saleForm.channel}
                  onChange={(e) => setSaleForm((p) => ({ ...p, channel: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                  placeholder="Walmart, eBay, Amazon, Local, Website"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Order Number</label>
                <input
                  value={saleForm.order_number}
                  onChange={(e) => setSaleForm((p) => ({ ...p, order_number: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Customer</label>
                <input
                  value={saleForm.customer_name}
                  onChange={(e) => setSaleForm((p) => ({ ...p, customer_name: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Quantity Sold</label>
                <input
                  type="number"
                  min="1"
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Sale Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.sale_price}
                  onChange={(e) => setSaleForm((p) => ({ ...p, sale_price: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Shipping Charged</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.shipping_charged}
                  onChange={(e) => setSaleForm((p) => ({ ...p, shipping_charged: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Actual Shipping Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.shipping_cost}
                  onChange={(e) => setSaleForm((p) => ({ ...p, shipping_cost: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Platform Fee</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.platform_fee}
                  onChange={(e) => setSaleForm((p) => ({ ...p, platform_fee: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-400">Other Fee</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.other_fee}
                  onChange={(e) => setSaleForm((p) => ({ ...p, other_fee: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-2 text-zinc-400">Notes</label>
                <textarea
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={4}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 hover:bg-white/5"
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold">
                Save Sale
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
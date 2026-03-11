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
  Sparkles,
  Image as ImageIcon,
  Bot,
  ArrowUpRight,
  TrendingUp,
  Boxes,
  ReceiptText,
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
  image_url?: string | null;
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
  image_url: string;
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
  image_url: "",
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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getFallbackImage(seed: string) {
  return `https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80&sig=${encodeURIComponent(
    seed || "inventory"
  )}`;
}

function SmartImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-cyan-100 via-white to-violet-100",
          className
        )}
      >
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-slate-200">
            <ImageIcon size={24} />
          </div>
          <span className="text-xs font-medium">No image</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  );
}

function StatCard({
  title,
  value,
  icon,
  tone = "indigo",
  subtext,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "indigo" | "cyan" | "amber" | "emerald";
  subtext?: string;
}) {
  const toneMap = {
    indigo: "from-indigo-500 to-violet-500 text-indigo-700 bg-indigo-50 ring-indigo-100",
    cyan: "from-cyan-500 to-sky-500 text-cyan-700 bg-cyan-50 ring-cyan-100",
    amber: "from-amber-500 to-orange-500 text-amber-700 bg-amber-50 ring-amber-100",
    emerald: "from-emerald-500 to-teal-500 text-emerald-700 bg-emerald-50 ring-emerald-100",
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-[0_12px_40px_rgba(20,25,40,0.08)] backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90" />
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl ring-1 shadow-sm",
            toneMap[tone].split(" ").slice(2).join(" ")
          )}
        >
          {icon}
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Live
        </div>
      </div>

      <div className="mt-7">
        <div className="text-4xl font-semibold tracking-tight text-slate-950">{value}</div>
        <div className="mt-1 text-sm font-medium text-slate-600">{title}</div>
        {subtext ? <div className="mt-2 text-xs text-slate-400">{subtext}</div> : null}
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
      image_url: item.image_url || "",
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
      image_url: itemForm.image_url.trim(),
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

    return items.filter(
      (i) =>
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(129,140,248,0.16),_transparent_26%),linear-gradient(180deg,#eef4ff_0%,#f7fbff_38%,#f8f6ff_100%)] text-slate-900">
      <div className="mx-auto max-w-[1700px] px-6 py-8 lg:px-10">
        <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/75 shadow-[0_18px_70px_rgba(36,45,80,0.12)] backdrop-blur-xl">
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(120deg,rgba(99,102,241,0.06),rgba(34,211,238,0.04),rgba(255,255,255,0.3))]" />

          <div className="relative border-b border-slate-200/80 px-6 py-6 lg:px-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  <Bot size={14} />
                  AI Inventory Engine
                </div>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
                  Inventory Intelligence
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  High-visibility inventory control with image-based cataloging, sales history,
                  fee tracking, shipping math, and a more advanced command-surface feel.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={openNewItem}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-5 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(79,70,229,0.28)] transition hover:scale-[1.01]"
                >
                  <Plus size={18} />
                  Add Inventory
                </button>
              </div>
            </div>

            {(errorMsg || successMsg) && (
              <div className="mt-6 space-y-3">
                {errorMsg && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMsg}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative px-6 py-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_360px]">
              <div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title="Tracked Items"
                    value={stats.total}
                    icon={<Boxes size={22} className="text-indigo-600" />}
                    tone="indigo"
                    subtext="Cataloged inventory assets"
                  />
                  <StatCard
                    title="Low Stock"
                    value={stats.low}
                    icon={<AlertTriangle size={22} className="text-amber-600" />}
                    tone="amber"
                    subtext="At or below threshold"
                  />
                  <StatCard
                    title="Out of Stock"
                    value={stats.out}
                    icon={<Package size={22} className="text-cyan-600" />}
                    tone="cyan"
                    subtext="Currently unavailable"
                  />
                  <StatCard
                    title="Inventory Value"
                    value={money(stats.value)}
                    icon={<DollarSign size={22} className="text-emerald-600" />}
                    tone="emerald"
                    subtext="Based on unit cost × quantity"
                  />
                </div>

                <div className="mt-6 rounded-[30px] border border-slate-200 bg-white/80 p-4 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-lg">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white"
                        placeholder="Search name, SKU, category, supplier..."
                      />
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
                      <Sparkles size={16} />
                      AI-powered catalog view
                    </div>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-[32px] border border-slate-200 bg-white/85 shadow-sm">
                  <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 2xl:grid-cols-3">
                    {loading ? (
                      <div className="col-span-full rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-500">
                        Loading inventory...
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="col-span-full rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-500">
                        No inventory found.
                      </div>
                    ) : (
                      filtered.map((item) => {
                        const isLow = item.quantity <= item.reorder_level && item.quantity > 0;
                        const isOut = item.quantity === 0;

                        return (
                          <div
                            key={item.id}
                            className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(30,41,59,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(30,41,59,0.12)]"
                          >
                            <div
                              className="cursor-pointer"
                              onClick={() => selectItem(item)}
                            >
                              <SmartImage
                                src={item.image_url || getFallbackImage(item.name)}
                                alt={item.name}
                                className="h-52 w-full object-cover"
                              />
                            </div>

                            <div className="p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-lg font-semibold text-slate-950">
                                    {item.name}
                                  </div>
                                  <div className="mt-1 font-mono text-xs text-slate-500">
                                    {item.sku}
                                  </div>
                                </div>

                                <div
                                  className={cn(
                                    "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                                    isOut
                                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                                      : isLow
                                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  )}
                                >
                                  {isOut ? "Out" : isLow ? "Low" : "Healthy"}
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-3">
                                <div className="rounded-2xl bg-slate-50 p-3">
                                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                    Qty
                                  </div>
                                  <div className="mt-1 text-lg font-semibold text-slate-950">
                                    {item.quantity}
                                  </div>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3">
                                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                    Cost
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-950">
                                    {money(item.cost)}
                                  </div>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3">
                                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                    Price
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-950">
                                    {money(item.sell_price)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between">
                                <div className="text-xs text-slate-500">
                                  {item.category || "No category"} {item.supplier ? `• ${item.supplier}` : ""}
                                </div>

                                <button
                                  onClick={() => selectItem(item)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                                >
                                  Open
                                  <ArrowUpRight size={14} />
                                </button>
                              </div>

                              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                                <button
                                  onClick={() => adjustQuantity(item, 1)}
                                  className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                                >
                                  +1
                                </button>
                                <button
                                  onClick={() => adjustQuantity(item, -1)}
                                  className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
                                >
                                  -1
                                </button>
                                <button
                                  onClick={() => openEditItem(item)}
                                  className="ml-auto rounded-xl bg-slate-50 p-2 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="rounded-xl bg-slate-50 p-2 text-rose-600 ring-1 ring-slate-200 transition hover:bg-rose-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/85 shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <Bot size={16} className="text-cyan-600" />
                      Intelligence Panel
                    </div>
                  </div>
                  <div className="p-5">
                    {selected ? (
                      <>
                        <SmartImage
                          src={selected.image_url || getFallbackImage(selected.name)}
                          alt={selected.name}
                          className="h-56 w-full rounded-[24px] object-cover"
                        />

                        <div className="mt-5">
                          <div className="text-2xl font-semibold tracking-tight text-slate-950">
                            {selected.name}
                          </div>
                          <div className="mt-1 font-mono text-sm text-slate-500">{selected.sku}</div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              On Hand
                            </div>
                            <div className="mt-1 text-2xl font-semibold text-slate-950">
                              {selected.quantity}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              Reorder
                            </div>
                            <div className="mt-1 text-2xl font-semibold text-slate-950">
                              {selected.reorder_level}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              Unit Cost
                            </div>
                            <div className="mt-1 text-lg font-semibold text-slate-950">
                              {money(selected.cost)}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              Sell Price
                            </div>
                            <div className="mt-1 text-lg font-semibold text-slate-950">
                              {money(selected.sell_price)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 rounded-[24px] bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 ring-1 ring-cyan-100">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                              <Sparkles size={20} className="text-cyan-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-950">AI readout</div>
                              <div className="mt-1 text-sm leading-6 text-slate-600">
                                {selected.quantity === 0
                                  ? "This item is out of stock and needs immediate attention."
                                  : selected.quantity <= selected.reorder_level
                                  ? "This item is near threshold. Review replenishment timing."
                                  : "Stock position looks healthy based on current quantity."}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3">
                          <button
                            onClick={() => adjustQuantity(selected, 1)}
                            className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
                          >
                            +1 Quantity
                          </button>
                          <button
                            onClick={() => adjustQuantity(selected, -1)}
                            className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
                          >
                            -1 Quantity
                          </button>
                          <button
                            onClick={openSaleModal}
                            className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(79,70,229,0.28)] transition hover:scale-[1.01]"
                          >
                            Record Sale
                          </button>
                          <button
                            onClick={() => openEditItem(selected)}
                            className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
                          >
                            Edit Item
                          </button>
                          <button
                            onClick={() => {
                              setSelected(null);
                              setSales([]);
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Close Panel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="py-10 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-100 to-violet-100 ring-1 ring-slate-200">
                          <Bot size={28} className="text-cyan-700" />
                        </div>
                        <div className="mt-4 text-lg font-semibold text-slate-950">
                          Select an inventory item
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Open any item to view image, financial metrics, sales history, and AI summary.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selected && (
                  <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/85 shadow-sm">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <TrendingUp size={16} className="text-emerald-600" />
                        Sales Summary
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-5">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Gross</div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">{money(selectedSalesSummary.gross)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Shipping Cost</div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">{money(selectedSalesSummary.shipping)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Fees</div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">{money(selectedSalesSummary.fees)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">COGS</div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">{money(selectedSalesSummary.cogs)}</div>
                      </div>
                      <div className="col-span-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-cyan-50 p-4 ring-1 ring-emerald-100">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Net</div>
                        <div className="mt-1 text-2xl font-semibold text-slate-950">{money(selectedSalesSummary.net)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selected && (
              <div className="mt-6 overflow-hidden rounded-[32px] border border-slate-200 bg-white/85 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                    <ReceiptText size={18} className="text-indigo-600" />
                    Sales History
                  </div>
                </div>

                {salesLoading ? (
                  <div className="p-6 text-slate-500">Loading sales...</div>
                ) : sales.length === 0 ? (
                  <div className="p-6 text-slate-500">No sales recorded for this item yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                        <tr>
                          <th className="p-4">When</th>
                          <th className="p-4">Where</th>
                          <th className="p-4">Qty</th>
                          <th className="p-4">Sale</th>
                          <th className="p-4">Shipping</th>
                          <th className="p-4">Fees</th>
                          <th className="p-4">Net</th>
                          <th className="p-4" />
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale) => {
                          const gross = Number(sale.sale_price || 0) + Number(sale.shipping_charged || 0);
                          const fees = Number(sale.platform_fee || 0) + Number(sale.other_fee || 0);
                          const cogs = Number(selected.cost || 0) * Number(sale.quantity || 0);
                          const net = gross - Number(sale.shipping_cost || 0) - fees - cogs;

                          return (
                            <tr key={sale.id} className="border-t border-slate-100">
                              <td className="p-4">
                                <div className="font-medium text-slate-950">
                                  {new Date(sale.sold_at).toLocaleString()}
                                </div>
                                <div className="text-xs text-slate-500">{sale.order_number || "-"}</div>
                              </td>
                              <td className="p-4">
                                <div className="font-medium text-slate-950">{sale.channel}</div>
                                <div className="text-xs text-slate-500">{sale.customer_name || "-"}</div>
                              </td>
                              <td className="p-4 text-slate-700">{sale.quantity}</td>
                              <td className="p-4 text-slate-700">{money(sale.sale_price)}</td>
                              <td className="p-4">
                                <div className="text-slate-700">charged {money(sale.shipping_charged)}</div>
                                <div className="text-xs text-slate-500">cost {money(sale.shipping_cost)}</div>
                              </td>
                              <td className="p-4 text-slate-700">
                                {money(Number(sale.platform_fee || 0) + Number(sale.other_fee || 0))}
                              </td>
                              <td className="p-4 font-semibold text-slate-950">{money(net)}</td>
                              <td className="p-4">
                                <button
                                  onClick={() => removeSale(sale.id)}
                                  className="rounded-xl bg-rose-50 p-2 text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showItemModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 p-6 backdrop-blur-md">
          <form
            onSubmit={saveItem}
            className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(36,45,80,0.18)]"
          >
            <div className="border-b border-slate-200 px-8 py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                    <Sparkles size={14} />
                    Catalog Intelligence
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {editingId ? "Edit Inventory Item" : "Add Inventory Item"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Build a richer inventory record with direct image URL support.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="grid gap-6 p-8 lg:grid-cols-[1fr_320px]">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-600">Name</label>
                  <input
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">SKU</label>
                  <input
                    required
                    value={itemForm.sku}
                    onChange={(e) => setItemForm((p) => ({ ...p, sku: normalizeSku(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Category</label>
                  <input
                    value={itemForm.category}
                    onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Supplier</label>
                  <input
                    value={itemForm.supplier}
                    onChange={(e) => setItemForm((p) => ({ ...p, supplier: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.reorder_level}
                    onChange={(e) => setItemForm((p) => ({ ...p, reorder_level: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Unit Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.cost}
                    onChange={(e) => setItemForm((p) => ({ ...p, cost: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Sell Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.sell_price}
                    onChange={(e) => setItemForm((p) => ({ ...p, sell_price: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-600">Image URL</label>
                  <input
                    value={itemForm.image_url}
                    onChange={(e) => setItemForm((p) => ({ ...p, image_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-600">Notes</label>
                  <textarea
                    value={itemForm.notes}
                    onChange={(e) => setItemForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Image Preview
                  </div>
                  <div className="p-5">
                    <SmartImage
                      src={itemForm.image_url || getFallbackImage(itemForm.name)}
                      alt={itemForm.name || "Preview"}
                      className="h-72 w-full rounded-[24px] object-cover"
                    />
                    <div className="mt-4 rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 ring-1 ring-cyan-100">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                          <Bot size={18} className="text-cyan-700" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-950">AI surface preview</div>
                          <div className="mt-1 text-sm leading-6 text-slate-600">
                            This image becomes part of the catalog display and detail panel.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 border-t border-slate-200 px-8 py-6">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(79,70,229,0.28)] transition hover:scale-[1.01]"
              >
                {editingId ? "Update Item" : "Save Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showSaleModal && selected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/40 p-6 backdrop-blur-md">
          <form
            onSubmit={saveSale}
            className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(36,45,80,0.18)]"
          >
            <div className="border-b border-slate-200 px-8 py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    <TrendingUp size={14} />
                    Sale Capture
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    Record Sale
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">{selected.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-8 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Sold At</label>
                <input
                  type="datetime-local"
                  value={saleForm.sold_at}
                  onChange={(e) => setSaleForm((p) => ({ ...p, sold_at: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Where Sold</label>
                <input
                  value={saleForm.channel}
                  onChange={(e) => setSaleForm((p) => ({ ...p, channel: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  placeholder="Walmart, eBay, Amazon, Local, Website"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Order Number</label>
                <input
                  value={saleForm.order_number}
                  onChange={(e) => setSaleForm((p) => ({ ...p, order_number: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Customer</label>
                <input
                  value={saleForm.customer_name}
                  onChange={(e) => setSaleForm((p) => ({ ...p, customer_name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Quantity Sold</label>
                <input
                  type="number"
                  min="1"
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Sale Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.sale_price}
                  onChange={(e) => setSaleForm((p) => ({ ...p, sale_price: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Shipping Charged</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.shipping_charged}
                  onChange={(e) => setSaleForm((p) => ({ ...p, shipping_charged: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Actual Shipping Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.shipping_cost}
                  onChange={(e) => setSaleForm((p) => ({ ...p, shipping_cost: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Platform Fee</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.platform_fee}
                  onChange={(e) => setSaleForm((p) => ({ ...p, platform_fee: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Other Fee</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.other_fee}
                  onChange={(e) => setSaleForm((p) => ({ ...p, other_fee: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-600">Notes</label>
                <textarea
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex gap-4 border-t border-slate-200 px-8 py-6">
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(79,70,229,0.28)] transition hover:scale-[1.01]"
              >
                Save Sale
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
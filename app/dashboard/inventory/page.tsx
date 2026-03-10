"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, RefreshCcw, DownloadCloud, FileSpreadsheet, Filter, 
  MoreHorizontal, ArrowUpDown, ChevronRight, LayoutGrid, List, 
  Bell, User, X, Edit3, Trash2, Eye, TrendingUp, TrendingDown, 
  Sparkles, Package, Truck, AlertTriangle, CheckCircle 
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────
interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  warehouse: string;
  stock: number;
  minStock: number;
  price: number;
  cost: number;
  status: 'healthy' | 'low' | 'out';
  lastUpdated: string;
  supplier: string;
  platforms: ('shopify' | 'amazon' | 'etsy' | 'walmart' | 'tiktok')[];
  velocity: number;
  daysToStockout: number;
  image: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  shopify: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amazon: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  etsy: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  walmart: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  tiktok: 'bg-slate-700/50 text-slate-300 border-white/20',
};

// ──────────────────────────────────────────────────────────────
// COMPONENTS
// ──────────────────────────────────────────────────────────────
function StatCard({ title, value, change, icon, color = "emerald" }: any) {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-white/10 transition-all group">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : color === 'amber' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {React.cloneElement(icon, { size: 22 })}
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {change}
        </div>
      </div>
      <div className="mt-8">
        <div className="text-5xl font-light tabular-nums tracking-tighter text-white">{value}</div>
        <div className="text-sm text-slate-400 mt-1">{title}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// MAIN APPLICATION
// ──────────────────────────────────────────────────────────────
export default function LuminaVaultInventory() {
  // 1. DATA STATE (The "Brain")
  const [data, setData] = useState<InventoryItem[]>([
    { id: '1', name: "Sony WH-1000XM5 Noise Cancelling Headphones", sku: "SONY-XM5-BLK", category: "Electronics", warehouse: "NYC-01", stock: 187, minStock: 40, price: 398, cost: 189, status: 'healthy', lastUpdated: "37m ago", supplier: "Sony Direct", platforms: ["shopify", "amazon"], velocity: 42, daysToStockout: 18, image: "https://picsum.photos/id/1015/600/600" },
    { id: '2', name: "Organic Cotton Oversized Hoodie – Midnight", sku: "HOOD-ORG-MID", category: "Apparel", warehouse: "LA-02", stock: 23, minStock: 60, price: 68, cost: 21, status: 'low', lastUpdated: "4h ago", supplier: "EcoThread Co", platforms: ["shopify", "etsy"], velocity: 91, daysToStockout: 3, image: "https://picsum.photos/id/106/600/600" },
    { id: '3', name: "Stainless Steel Tumbler 40oz – Matte Black", sku: "TUM-40-BLK", category: "Home", warehouse: "CHI-03", stock: 0, minStock: 30, price: 42, cost: 14, status: 'out', lastUpdated: "Yesterday", supplier: "HydroPure", platforms: ["amazon", "walmart"], velocity: 134, daysToStockout: 0, image: "https://picsum.photos/id/201/600/600" }
  ]);

  // 2. UI STATE
  const [view, setView] = useState<'table' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof InventoryItem>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 3. FORM STATE (For Adding)
  const [form, setForm] = useState({ name: '', sku: '', stock: '', price: '' });

  // ──────────────────────────────────────────────────────────────
  // LOGIC FUNCTIONS
  // ──────────────────────────────────────────────────────────────
  
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: form.name,
      sku: form.sku.toUpperCase(),
      category: "General",
      warehouse: "Main-01",
      stock: Number(form.stock),
      minStock: 10,
      price: Number(form.price),
      cost: Number(form.price) * 0.4,
      status: Number(form.stock) === 0 ? 'out' : Number(form.stock) < 10 ? 'low' : 'healthy',
      lastUpdated: "Just now",
      supplier: "Default Supplier",
      platforms: ["shopify"],
      velocity: 0,
      daysToStockout: 30,
      image: `https://picsum.photos/seed/${form.sku}/600/600`
    };
    setData([newItem, ...data]);
    setShowNewModal(false);
    setForm({ name: '', sku: '', stock: '', price: '' });
  };

  const deleteProduct = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm("Are you sure you want to remove this item?")) {
      setData(data.filter(item => item.id !== id));
      if(selectedProduct?.id === id) setSelectedProduct(null);
    }
  };

  const adjustStock = (id: string, amount: number) => {
    setData(prev => prev.map(item => {
      if (item.id === id) {
        const newStock = Math.max(0, item.stock + amount);
        return { 
          ...item, 
          stock: newStock,
          status: newStock === 0 ? 'out' : newStock < item.minStock ? 'low' : 'healthy'
        };
      }
      return item;
    }));
  };

  const processedData = useMemo(() => {
    let result = data.filter(i => 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      i.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
    result.sort((a: any, b: any) => {
      if (a[sortColumn] < b[sortColumn]) return sortDir === 'asc' ? -1 : 1;
      if (a[sortColumn] > b[sortColumn]) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [data, searchQuery, sortColumn, sortDir]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden flex flex-col">
      
      {/* TOP SYNC BAR */}
      <div className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-8 py-3 flex items-center justify-between text-[10px] font-bold tracking-widest uppercase">
          <div className="flex items-center gap-8 text-emerald-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM LIVE
            </div>
            <div className="flex gap-6 text-slate-400">
              {['Shopify', 'Amazon', 'TikTok Shop'].map(p => (
                <div key={p} className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" />{p}</div>
              ))}
            </div>
          </div>
          <button onClick={() => { setIsSyncing(true); setTimeout(() => setIsSyncing(false), 1000); }} className="flex items-center gap-2 hover:text-white transition-colors">
            <RefreshCcw size={14} className={isSyncing ? "animate-spin" : ""} /> REFRESH CHANNELS
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-72 border-r border-white/5 bg-slate-950 hidden lg:flex flex-col p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Package size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-black text-2xl tracking-tighter">LUMINA</h1>
              <p className="text-[10px] text-slate-500 font-mono">VAULT ENGINE</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            {['Dashboard', 'Inventory', 'Orders', 'Analytics', 'Suppliers'].map(label => (
              <button key={label} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-medium transition-all ${label === 'Inventory' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
                {label === 'Inventory' ? <Package size={18} /> : <LayoutGrid size={18} />}
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN AREA */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950">
          
          <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 bg-slate-950/80 backdrop-blur-xl z-30">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Find anything..." 
                className="w-full bg-slate-900 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-indigo-500 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowNewModal(true)} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2">
                <Plus size={20} /> NEW PRODUCT
              </button>
              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center cursor-pointer hover:border-white/30 transition-all">
                <User size={20} />
              </div>
            </div>
          </header>

          <div className="p-10">
            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <StatCard title="Active SKUs" value={data.length} change="+12.5%" icon={<Package />} />
              <StatCard title="Low Stock" value={data.filter(i => i.status === 'low').length} change="-2" icon={<AlertTriangle />} color="amber" />
              <StatCard title="Out of Stock" value={data.filter(i => i.status === 'out').length} change="+1" icon={<X />} color="rose" />
              <StatCard title="Vault Value" value={`$${(data.reduce((acc, i) => acc + (i.stock * i.price), 0) / 1000).toFixed(1)}k`} change="+4.2%" icon={<TrendingUp />} />
            </div>

            {/* AI INSIGHT */}
            <div className="mb-10 bg-slate-900 border border-indigo-500/20 rounded-[32px] p-6 flex items-center gap-6">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                <Sparkles size={28} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-300">
                  <span className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] block mb-1">AI Recommendation</span>
                  Based on velocity, restock <span className="text-white font-bold">{data[0]?.sku}</span> within 48 hours to prevent $4.2k in missed sales.
                </p>
              </div>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-1 rounded-2xl border border-white/5 flex">
                  <button onClick={() => setView('grid')} className={`px-4 py-2 rounded-xl transition-all ${view === 'grid' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid size={18}/></button>
                  <button onClick={() => setView('table')} className={`px-4 py-2 rounded-xl transition-all ${view === 'table' ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}><List size={18}/></button>
                </div>
              </div>
            </div>

            {/* GRID VIEW */}
            {view === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                {processedData.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedProduct(item)}
                    className="group bg-slate-900 border border-white/5 rounded-[40px] overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer relative"
                  >
                    <button 
                      onClick={(e) => deleteProduct(item.id, e)}
                      className="absolute top-6 left-6 z-10 p-3 bg-black/50 backdrop-blur-md rounded-2xl text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="h-64 overflow-hidden bg-slate-800">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <div className="p-8">
                      <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{item.name}</h3>
                      <p className="text-xs font-mono text-slate-500 mb-6 uppercase tracking-widest">{item.sku}</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Availability</p>
                          <p className={`text-xl font-black ${item.status === 'healthy' ? 'text-emerald-400' : 'text-rose-400'}`}>{item.stock} UNITS</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">MSRP</p>
                          <p className="text-xl font-black text-white">${item.price}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TABLE VIEW */}
            {view === 'table' && (
              <div className="bg-slate-900 border border-white/5 rounded-[32px] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5">
                    <tr>
                      <th className="px-8 py-6">Product</th>
                      <th className="px-8 py-6">Stock</th>
                      <th className="px-8 py-6">Price</th>
                      <th className="px-8 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {processedData.map(item => (
                      <tr key={item.id} onClick={() => setSelectedProduct(item)} className="group hover:bg-white/[0.02] cursor-pointer transition-colors">
                        <td className="px-8 py-6 flex items-center gap-4">
                          <img src={item.image} className="w-12 h-12 rounded-2xl object-cover" />
                          <div>
                            <p className="font-bold text-white">{item.name}</p>
                            <p className="text-xs font-mono text-slate-500">{item.sku}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`font-mono font-bold ${item.status === 'healthy' ? 'text-emerald-400' : 'text-rose-400'}`}>{item.stock}</span>
                        </td>
                        <td className="px-8 py-6 font-bold text-white">${item.price}</td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={(e) => deleteProduct(item.id, e)} className="p-2 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* DETAIL DRAWER */}
        {selectedProduct && (
          <div className="fixed inset-y-0 right-0 w-[500px] bg-slate-900 border-l border-white/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-black italic">PRODUCT_INTEL</h2>
              <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-white/5 rounded-2xl"><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10">
              <img src={selectedProduct.image} className="w-full aspect-square object-cover rounded-[48px] mb-10 shadow-2xl" />
              <h3 className="text-3xl font-bold text-white leading-tight mb-2">{selectedProduct.name}</h3>
              <div className="flex gap-2 mb-10">
                {selectedProduct.platforms.map(p => (
                  <span key={p} className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase ${PLATFORM_COLORS[p]}`}>{p}</span>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Current Stock</p>
                  <p className="text-5xl font-black text-white">{selectedProduct.stock}</p>
                </div>
                <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Days to Out</p>
                  <p className="text-5xl font-black text-emerald-400">{selectedProduct.daysToStockout}</p>
                </div>
              </div>

              <div className="space-y-4">
                <button onClick={() => adjustStock(selectedProduct.id, 1)} className="w-full py-5 bg-white text-black font-black rounded-3xl hover:bg-slate-200 transition-all">MANUAL RESTOCK (+1)</button>
                <button onClick={() => adjustStock(selectedProduct.id, -1)} className="w-full py-5 border border-white/10 text-white font-bold rounded-3xl hover:bg-white/5 transition-all">MARK AS SOLD (-1)</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW PRODUCT MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <form onSubmit={handleAddProduct} className="bg-slate-900 border border-white/10 p-12 rounded-[56px] w-full max-w-xl shadow-2xl">
            <h2 className="text-4xl font-black text-white mb-10 tracking-tighter">VAULT ADDITION</h2>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Title</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-2xl p-5 outline-none focus:border-indigo-500 transition-all" placeholder="Sony Alpha a7 IV" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">SKU ID</label>
                  <input required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-2xl p-5 outline-none focus:border-indigo-500 transition-all" placeholder="SON-A7-4" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Initial Qty</label>
                  <input type="number" required value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-2xl p-5 outline-none focus:border-indigo-500 transition-all" placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">MSRP ($)</label>
                <input type="number" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-2xl p-5 outline-none focus:border-indigo-500 transition-all" placeholder="2499.00" />
              </div>
            </div>
            <div className="mt-12 flex gap-4">
              <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 py-5 border border-white/10 rounded-3xl font-bold text-slate-500 hover:text-white transition-all">CANCEL</button>
              <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">SECURE TO VAULT</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
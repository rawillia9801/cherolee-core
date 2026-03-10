"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Search, Plus, RefreshCcw, DownloadCloud, FileSpreadsheet, Filter, 
  MoreHorizontal, ArrowUpDown, ChevronRight, LayoutGrid, List, 
  Bell, User, X, Edit3, Trash2, Eye, TrendingUp, TrendingDown, 
  Sparkles, Package, Truck, AlertTriangle, CheckCircle 
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// SUPABASE CLIENT
// ──────────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  min_stock: number;
  price: number;
  cost: number;
  status: 'healthy' | 'low' | 'out';
  last_updated: string;
  supplier: string;
  platforms: string[];
  velocity: number;
  days_to_stockout: number;
  image: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  shopify: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amazon: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  etsy: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  walmart: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  tiktok: 'bg-black/10 text-zinc-300 border-white/30',
};

// ──────────────────────────────────────────────────────────────
// UI COMPONENTS
// ──────────────────────────────────────────────────────────────
function StatCard({ title, value, change, icon, color = "emerald" }: any) {
  const isPositive = change?.startsWith('+');
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-white/20 transition-all group">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : color === 'amber' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {React.cloneElement(icon, { size: 22 })}
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {change}
          </div>
        )}
      </div>
      <div className="mt-8">
        <div className="text-5xl font-light tabular-nums tracking-tighter text-white">{value}</div>
        <div className="text-sm text-zinc-400 mt-1">{title}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────
export default function LuminaVaultInventory() {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof InventoryItem>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ name: '', sku: '', stock: 0, price: 0, category: 'Electronics' });

  // 1. FETCH DATA (AI Chatbot ready)
  const fetchInventory = async () => {
    setIsSyncing(true);
    const { data: items, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && items) setData(items);
    setTimeout(() => setIsSyncing(false), 800);
    setLoading(false);
  };

  useEffect(() => { fetchInventory(); }, []);

  // 2. CRUD OPERATIONS
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      ...formData,
      warehouse: 'NYC-01',
      min_stock: 20,
      cost: formData.price * 0.45,
      status: formData.stock > 20 ? 'healthy' : 'low',
      platforms: ['shopify'],
      image: `https://picsum.photos/seed/${formData.sku}/600/600`,
      days_to_stockout: 30
    };

    const { error } = await supabase.from('inventory').insert([newItem]);
    if (!error) {
      setShowNewModal(false);
      fetchInventory();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently delete this item from the Vault?")) {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (!error) {
        setData(data.filter(i => i.id !== id));
        if (selectedProduct?.id === id) setSelectedProduct(null);
      }
    }
  };

  const handleUpdateStock = async (id: string, newStock: number) => {
    const { error } = await supabase.from('inventory').update({ stock: newStock }).eq('id', id);
    if (!error) fetchInventory();
  };

  // 3. FILTER & SORT
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

  const stats = useMemo(() => ({
    total: data.length,
    low: data.filter(i => i.stock <= i.min_stock).length,
    out: data.filter(i => i.stock === 0).length,
    value: data.reduce((acc, i) => acc + (i.stock * i.price), 0)
  }), [data]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden flex flex-col font-sans">
      
      {/* --- TOP MULTI-PLATFORM BAR --- */}
      <div className="border-b border-white/5 bg-zinc-900/40 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto px-8 py-2.5 flex items-center justify-between text-[10px] font-bold tracking-[2px] uppercase">
          <div className="flex items-center gap-8 text-emerald-400">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-emerald-400 ${isSyncing ? 'animate-ping' : ''}`} />
              LIVE SYNCED TO SUPABASE
            </div>
            <div className="flex gap-6 text-zinc-500">
              {['Shopify', 'Amazon', 'TikTok Shop'].map(p => (
                <div key={p} className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" />{p}</div>
              ))}
            </div>
          </div>
          <button onClick={fetchInventory} className="flex items-center gap-2 hover:text-white transition-colors">
            <RefreshCcw size={14} className={isSyncing ? "animate-spin" : ""} /> REFRESH HUB
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- SIDEBAR --- */}
        <aside className="w-72 border-r border-white/5 bg-black hidden lg:flex flex-col p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center">
              <Package size={22} />
            </div>
            <div>
              <div className="font-black text-2xl tracking-tighter italic">LUMINA</div>
              <div className="text-[10px] text-zinc-600 font-mono tracking-widest">VAULT_ENGINE</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {['Dashboard', 'Inventory', 'Orders', 'Analytics', 'Suppliers', 'Reports'].map((label) => (
              <button key={label} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-semibold transition-all ${label === 'Inventory' ? 'bg-white/10 text-white shadow-xl' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'}`}>
                {label === 'Inventory' ? <Package size={18} /> : label === 'Orders' ? <Truck size={18} /> : <LayoutGrid size={18} />}
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* --- MAIN AREA --- */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#050505]">
          
          {/* Header */}
          <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 sticky top-0 bg-black/60 backdrop-blur-xl z-30">
            <div className="relative w-[450px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query database..." 
                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-3.5 pl-14 pr-4 text-sm focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="relative cursor-pointer group">
                <Bell size={22} className="text-zinc-400 group-hover:text-white transition-colors" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 rounded-full text-[9px] flex items-center justify-center font-bold">4</div>
              </div>
              <button onClick={() => setShowNewModal(true)} className="bg-indigo-600 hover:bg-indigo-500 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-3">
                <Plus size={20} /> NEW PRODUCT
              </button>
              <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center">
                <User size={20} />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            
            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              <StatCard title="Active SKUs" value={stats.total} change="+4%" icon={<Package />} />
              <StatCard title="Low Stock" value={stats.low} change="-12" icon={<AlertTriangle />} color="amber" />
              <StatCard title="Out of Stock" value={stats.out} change="+2" icon={<X />} color="rose" />
              <StatCard title="Total Valuation" value={`$${(stats.value / 1000).toFixed(1)}k`} change="+6.8%" icon={<TrendingUp />} />
            </div>

            {/* AI BAR */}
            <div className="mb-10 p-1 rounded-[32px] bg-gradient-to-r from-indigo-500/30 via-violet-500/30 to-transparent">
              <div className="bg-zinc-950 rounded-[30px] p-6 flex items-center gap-6 border border-white/5">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
                  <Sparkles size={28} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    <span className="text-indigo-400 font-black uppercase text-[10px] tracking-widest block mb-1">Vault Intelligence</span>
                    AI predicts a stockout on <span className="text-white font-bold">Organic Hoodie</span> in 48 hours. Suggesting a 150 unit restock to maintain TikTok Shop momentum.
                  </p>
                </div>
                <button className="px-6 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl text-xs font-bold transition-all border border-indigo-500/20">Execute</button>
              </div>
            </div>

            {/* VIEW TOGGLE */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold tracking-tighter">Live Inventory</h2>
              <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/5">
                <button onClick={() => setView('grid')} className={`px-5 py-2.5 rounded-xl transition-all ${view === 'grid' ? 'bg-white text-black shadow-2xl' : 'text-zinc-500 hover:text-white'}`}><LayoutGrid size={20}/></button>
                <button onClick={() => setView('table')} className={`px-5 py-2.5 rounded-xl transition-all ${view === 'table' ? 'bg-white text-black shadow-2xl' : 'text-zinc-500 hover:text-white'}`}><List size={20}/></button>
              </div>
            </div>

            {/* GRID DISPLAY */}
            {view === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                {processedData.map(item => (
                  <div key={item.id} onClick={() => setSelectedProduct(item)} className="group bg-zinc-900/50 border border-white/5 rounded-[48px] overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer relative flex flex-col">
                    <button onClick={(e) => handleDelete(item.id, e)} className="absolute top-6 left-6 z-10 p-3 bg-black/60 backdrop-blur-md rounded-2xl text-zinc-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={20} />
                    </button>
                    <div className="h-64 overflow-hidden bg-zinc-800">
                      <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{item.sku}</span>
                        <div className="flex gap-1.5">
                          {item.platforms.map(p => <div key={p} className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />)}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-6 line-clamp-2 leading-tight">{item.name}</h3>
                      <div className="mt-auto flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Availability</p>
                          <p className={`text-2xl font-black ${item.stock > 10 ? 'text-white' : 'text-rose-500'}`}>{item.stock} <span className="text-xs font-normal text-zinc-500">units</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">MSRP</p>
                          <p className="text-2xl font-black text-indigo-400">${item.price}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TABLE DISPLAY */}
            {view === 'table' && (
              <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[2px] text-zinc-500 border-b border-white/5">
                    <tr>
                      <th className="px-10 py-8">Product Name / Identifier</th>
                      <th className="px-10 py-8">Stock Level</th>
                      <th className="px-10 py-8">Price Point</th>
                      <th className="px-10 py-8 text-right">Operational Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {processedData.map(item => (
                      <tr key={item.id} onClick={() => setSelectedProduct(item)} className="group hover:bg-white/[0.02] cursor-pointer transition-colors">
                        <td className="px-10 py-8 flex items-center gap-6">
                          <img src={item.image} className="w-14 h-14 rounded-2xl object-cover" />
                          <div>
                            <p className="font-bold text-white text-lg">{item.name}</p>
                            <p className="text-xs font-mono text-zinc-500">{item.sku}</p>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <span className={`text-lg font-black ${item.stock > 10 ? 'text-white' : 'text-rose-500'}`}>{item.stock}</span>
                          <span className="text-zinc-600 text-xs ml-2 font-bold">QTY</span>
                        </td>
                        <td className="px-10 py-8 font-black text-indigo-400 text-lg">${item.price}</td>
                        <td className="px-10 py-8 text-right">
                          <button onClick={(e) => handleDelete(item.id, e)} className="p-3 hover:bg-rose-500/10 hover:text-rose-500 rounded-2xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* --- DETAIL DRAWER --- */}
        {selectedProduct && (
          <div className="fixed inset-y-0 right-0 w-[550px] bg-zinc-950 border-l border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] z-50 flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-black/40">
              <div>
                <h2 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">System Intel</h2>
                <p className="text-2xl font-black italic">PRODUCT_PROFILE</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-4 hover:bg-white/5 rounded-3xl transition-all"><X size={28}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              <img src={selectedProduct.image} className="w-full aspect-square object-cover rounded-[60px] mb-12 shadow-2xl border border-white/5" />
              <div className="flex items-center gap-3 mb-4">
                {selectedProduct.platforms.map(p => (
                  <span key={p} className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${PLATFORM_COLORS[p] || 'border-white/10 text-zinc-500'}`}>{p}</span>
                ))}
              </div>
              <h3 className="text-4xl font-bold text-white leading-tight mb-4 tracking-tighter">{selectedProduct.name}</h3>
              <p className="text-zinc-500 font-mono text-sm mb-12 uppercase tracking-widest">{selectedProduct.sku}</p>
              
              <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="bg-zinc-900 p-8 rounded-[40px] border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase mb-2 tracking-widest">Inventory</p>
                  <p className="text-6xl font-black text-white">{selectedProduct.stock}</p>
                </div>
                <div className="bg-zinc-900 p-8 rounded-[40px] border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase mb-2 tracking-widest">Burn Rate</p>
                  <p className="text-6xl font-black text-emerald-400">+{selectedProduct.velocity || 0}%</p>
                </div>
              </div>

              <div className="space-y-4">
                <button onClick={() => handleUpdateStock(selectedProduct.id, selectedProduct.stock + 50)} className="w-full py-6 bg-white text-black font-black rounded-[24px] hover:bg-zinc-200 transition-all text-sm uppercase tracking-widest">Add 50 Units to Vault</button>
                <button onClick={() => handleUpdateStock(selectedProduct.id, Math.max(0, selectedProduct.stock - 1))} className="w-full py-6 border border-white/10 text-white font-bold rounded-[24px] hover:bg-white/5 transition-all text-sm uppercase tracking-widest">Simulate Sale (-1)</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- NEW PRODUCT MODAL --- */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-8">
          <form onSubmit={handleAddProduct} className="bg-zinc-900 border border-white/10 p-14 rounded-[60px] w-full max-w-2xl shadow-2xl">
            <h2 className="text-5xl font-black text-white mb-4 tracking-tighter italic">VAULT_ENTRY</h2>
            <p className="text-zinc-500 mb-12 font-mono text-sm">SECURELY CATALOG NEW INVENTORY ASSETS</p>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[3px] ml-2">Product Descriptor</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-white/5 rounded-[20px] p-6 outline-none focus:border-indigo-500 transition-all font-bold text-lg" placeholder="e.g. Sony Alpha a7R V" />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[3px] ml-2">Unique SKU</label>
                  <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/5 rounded-[20px] p-6 outline-none focus:border-indigo-500 transition-all font-mono" placeholder="SON-A7R5-BLK" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[3px] ml-2">Initial Qty</label>
                  <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full bg-black border border-white/5 rounded-[20px] p-6 outline-none focus:border-indigo-500 transition-all font-black text-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[3px] ml-2">MSRP ($)</label>
                <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-black border border-white/5 rounded-[20px] p-6 outline-none focus:border-indigo-500 transition-all font-black text-xl text-indigo-400" placeholder="0.00" />
              </div>
            </div>
            <div className="mt-14 flex gap-6">
              <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 py-6 border border-white/10 rounded-[24px] font-bold text-zinc-500 hover:text-white transition-all uppercase tracking-widest">Abort</button>
              <button type="submit" className="flex-1 py-6 bg-indigo-600 text-white font-black rounded-[24px] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all uppercase tracking-widest">Authorize Entry</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, RefreshCcw, DownloadCloud, FileSpreadsheet, Filter, 
  MoreHorizontal, ArrowUpDown, ChevronRight, LayoutGrid, List, 
  Bell, User, X, Edit3, Trash2, Eye, TrendingUp, TrendingDown, 
  Sparkles, Package, Truck, AlertTriangle, CheckCircle 
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// TYPES – Multi-platform e-commerce ready
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
  velocity: number;          // units sold last 30d
  daysToStockout: number;
  image: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  shopify: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amazon: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  etsy: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  walmart: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  tiktok: 'bg-black/10 text-zinc-300 border-white/30',
};

// Rich, realistic e-commerce mock data (24 items)
const mockInventory: InventoryItem[] = [
  { id: '1', name: "Sony WH-1000XM5 Noise Cancelling Headphones", sku: "SONY-XM5-BLK", category: "Electronics", warehouse: "NYC-01", stock: 187, minStock: 40, price: 398, cost: 189, status: 'healthy', lastUpdated: "37m ago", supplier: "Sony Direct", platforms: ["shopify", "amazon"], velocity: 42, daysToStockout: 18, image: "https://picsum.photos/id/1015/600/600" },
  { id: '2', name: "Organic Cotton Oversized Hoodie – Midnight", sku: "HOOD-ORG-MID", category: "Apparel", warehouse: "LA-02", stock: 23, minStock: 60, price: 68, cost: 21, status: 'low', lastUpdated: "4h ago", supplier: "EcoThread Co", platforms: ["shopify", "etsy"], velocity: 91, daysToStockout: 3, image: "https://picsum.photos/id/106/600/600" },
  { id: '3', name: "Stainless Steel Tumbler 40oz – Matte Black", sku: "TUM-40-BLK", category: "Home", warehouse: "CHI-03", stock: 0, minStock: 30, price: 42, cost: 14, status: 'out', lastUpdated: "Yesterday", supplier: "HydroPure", platforms: ["amazon", "walmart"], velocity: 134, daysToStockout: 0, image: "https://picsum.photos/id/201/600/600" },
  { id: '4', name: "Wireless RGB Mechanical Keyboard", sku: "KEY-RGB-PRO", category: "Electronics", warehouse: "NYC-01", stock: 64, minStock: 25, price: 129, cost: 47, status: 'healthy', lastUpdated: "11m ago", supplier: "Keychron", platforms: ["shopify", "amazon", "tiktok"], velocity: 27, daysToStockout: 31, image: "https://picsum.photos/id/133/600/600" },
  // ... (20 more realistic products would be here – abbreviated for brevity)
];

// Premium Stat Card
function StatCard({ title, value, change, icon, color = "emerald" }: any) {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-white/20 transition-all group">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl ${color === 'emerald' ? 'bg-emerald-500/10' : color === 'amber' ? 'bg-amber-500/10' : 'bg-rose-500/10'}`}>
          {React.cloneElement(icon, { size: 22 })}
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {change}
        </div>
      </div>
      <div className="mt-8">
        <div className="text-5xl font-light tabular-nums tracking-tighter">{value}</div>
        <div className="text-sm text-zinc-400 mt-1">{title}</div>
      </div>
    </div>
  );
}

export default function LuminaVaultInventory() {
  const [data] = useState<InventoryItem[]>(mockInventory);
  const [view, setView] = useState<'table' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof InventoryItem>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifications] = useState(7);

  // ──────────────────────────────────────────────────────────────
  // FILTER + SORT + SEARCH
  // ──────────────────────────────────────────────────────────────
  const processedData = useMemo(() => {
    let result = [...data];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchQuery, sortColumn, sortDir]);

  const lowStockCount = data.filter(i => i.stock <= i.minStock).length;
  const outOfStockCount = data.filter(i => i.stock === 0).length;

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1450);
  };

  const toggleSort = (column: keyof InventoryItem) => {
    if (sortColumn === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDir('desc');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* ─────── TOP MULTI-PLATFORM BAR ─────── */}
      <div className="border-b border-white/10 bg-zinc-900/80 backdrop-blur-lg">
        <div className="max-w-screen-2xl mx-auto px-8 py-3 flex items-center justify-between text-xs uppercase tracking-[0.5px]">
          <div className="flex items-center gap-8 text-emerald-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE SYNCED
            </div>
            <div className="flex gap-6">
              {['Shopify', 'Amazon', 'Etsy', 'Walmart', 'TikTok Shop'].map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 text-white/70">
                  <CheckCircle size={13} className="text-emerald-400" />
                  {p}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSync}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl hover:bg-white/5 transition-all active:scale-95"
          >
            <RefreshCcw size={16} className={isSyncing ? "animate-spin" : ""} />
            SYNC ALL CHANNELS
          </button>
        </div>
      </div>

      <div className="flex max-w-screen-2xl mx-auto">
        {/* Sidebar */}
        <aside className="w-72 border-r border-white/10 bg-zinc-950 hidden lg:flex flex-col">
          <div className="p-8 border-b border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 via-indigo-500 to-fuchsia-500 rounded-2xl flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div className="font-bold tracking-[-1px] text-3xl">LUMINA</div>
            <div className="text-[10px] text-zinc-500 font-mono -mb-1">VAULT</div>
          </div>

          <nav className="flex-1 p-6 space-y-1 text-sm">
            {['Dashboard', 'Inventory', 'Orders', 'Analytics', 'Suppliers', 'Integrations', 'Reports'].map((label, i) => (
              <button
                key={i}
                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all ${label === 'Inventory' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}
              >
                {label === 'Inventory' ? <Package size={18} /> : label === 'Orders' ? <Truck size={18} /> : <LayoutGrid size={18} />}
                {label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-white/10">
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <div className="flex-1 h-px bg-white/10" />
              SUPPORT
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <main className="flex-1 min-w-0">
          {/* Top Header */}
          <header className="h-16 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <Search className="text-zinc-500" size={20} />
              <input
                type="text"
                placeholder="Search products, SKUs, or suppliers..."
                className="bg-transparent outline-none text-sm placeholder-zinc-500 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handleSync} className="p-2.5 hover:bg-white/5 rounded-2xl transition-colors">
                <RefreshCcw size={19} className={isSyncing ? "animate-spin" : ""} />
              </button>

              <div className="relative">
                <button className="p-2.5 hover:bg-white/5 rounded-2xl transition-colors relative">
                  <Bell size={19} />
                  {notifications > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-bold">
                      {notifications}
                    </div>
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-6 h-11 rounded-2xl font-semibold text-sm shadow-lg shadow-violet-500/30 active:scale-[0.985] transition-all"
              >
                <Plus size={18} /> New Product
              </button>

              <div className="w-8 h-8 bg-zinc-800 rounded-2xl flex items-center justify-center cursor-pointer hover:ring-1 hover:ring-white/30 transition-all">
                <User size={17} />
              </div>
            </div>
          </header>

          <div className="p-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard title="Total SKUs" value={data.length.toLocaleString()} change="+24 this week" icon={<Package />} />
              <StatCard title="Low Stock Alerts" value={lowStockCount} change="−3 from yesterday" icon={<AlertTriangle />} color="amber" />
              <StatCard title="Out of Stock" value={outOfStockCount} change="+2" icon={<X />} color="rose" />
              <StatCard title="Inventory Value" value="$1.84M" change="+6.8%" icon={<TrendingUp />} />
            </div>

            {/* AI Insights Bar */}
            <div className="mb-8 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-violet-500/20 rounded-3xl p-6 flex items-center gap-6">
              <Sparkles className="text-violet-400 flex-shrink-0" size={28} />
              <div className="flex-1 text-sm">
                <span className="font-medium text-violet-300">AI suggests:</span> Restock <span className="font-mono text-emerald-400">SONY-XM5-BLK</span> by 120 units and increase safety stock on Organic Hoodie by 40% — projected sell-out in 3 days on Etsy.
              </div>
              <button className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-2xl text-sm font-medium whitespace-nowrap transition-colors">
                Review All Insights
              </button>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-sm transition-colors">
                  <Filter size={17} /> Advanced Filters
                </button>

                <div className="flex bg-zinc-900 rounded-2xl p-1">
                  <button
                    onClick={() => setView('table')}
                    className={`px-5 py-2 rounded-[14px] text-sm transition-all ${view === 'table' ? 'bg-white text-black shadow' : 'hover:bg-white/5'}`}
                  >
                    <List size={17} />
                  </button>
                  <button
                    onClick={() => setView('grid')}
                    className={`px-5 py-2 rounded-[14px] text-sm transition-all ${view === 'grid' ? 'bg-white text-black shadow' : 'hover:bg-white/5'}`}
                  >
                    <LayoutGrid size={17} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-2xl transition-colors">
                  <FileSpreadsheet size={17} /> CSV
                </button>
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-2xl transition-colors">
                  <DownloadCloud size={17} /> PDF Report
                </button>
              </div>
            </div>

            {/* ─────── GRID VIEW (default – premium feel) ─────── */}
            {view === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {processedData.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedProduct(item)}
                    className="group bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden hover:border-violet-500/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative h-60 bg-zinc-950">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 right-4 flex flex-wrap gap-1 justify-end">
                        {item.platforms.map((p) => (
                          <span
                            key={p}
                            className={`text-[9px] font-mono px-2.5 py-px border rounded tracking-widest ${PLATFORM_COLORS[p]}`}
                          >
                            {p.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="font-medium line-clamp-2 leading-tight mb-3 text-lg">{item.name}</div>
                      <div className="font-mono text-xs text-zinc-500 mb-4">{item.sku}</div>

                      <div className="flex items-center justify-between text-sm mb-4">
                        <div>
                          <span className="font-mono text-emerald-400 tabular-nums">{item.stock}</span>
                          <span className="text-zinc-500"> units</span>
                        </div>
                        <div className="font-semibold text-right">${item.price}</div>
                      </div>

                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all"
                          style={{ width: `${Math.min(100, (item.stock / (item.minStock * 4)) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>Stock health</span>
                        <span>{item.daysToStockout}d left</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table View – kept for completeness */}
            {view === 'table' && (
              <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-zinc-500">
                      <th className="px-8 py-5 text-left font-normal">Product</th>
                      <th className="px-8 py-5 text-left font-normal cursor-pointer" onClick={() => toggleSort('stock')}>
                        Stock <ArrowUpDown size={12} className="inline ml-1" />
                      </th>
                      <th className="px-8 py-5 text-left font-normal cursor-pointer" onClick={() => toggleSort('price')}>
                        Price <ArrowUpDown size={12} className="inline ml-1" />
                      </th>
                      <th className="px-8 py-5 text-left font-normal">Platforms</th>
                      <th className="px-8 py-5 text-center font-normal">Status</th>
                      <th className="px-8 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-sm">
                    {processedData.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 group cursor-pointer" onClick={() => setSelectedProduct(item)}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img src={item.image} className="w-11 h-11 rounded-2xl object-cover" />
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="font-mono text-xs text-zinc-500">{item.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-mono tabular-nums">{item.stock}</td>
                        <td className="px-8 py-6 font-medium">${item.price}</td>
                        <td className="px-8 py-6">
                          <div className="flex gap-1">
                            {item.platforms.map(p => (
                              <span key={p} className={`text-[10px] px-3 py-0.5 border rounded-full ${PLATFORM_COLORS[p]}`}>{p}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          {item.status === 'healthy' && <span className="px-4 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">HEALTHY</span>}
                          {item.status === 'low' && <span className="px-4 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium">LOW</span>}
                          {item.status === 'out' && <span className="px-4 py-1 bg-rose-500/10 text-rose-400 rounded-full text-xs font-medium">OUT</span>}
                        </td>
                        <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-white/10 rounded-xl"><MoreHorizontal size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Product Detail Drawer */}
        {selectedProduct && (
          <div className="fixed inset-y-0 right-0 w-[440px] bg-zinc-900 border-l border-white/10 shadow-2xl z-50 flex flex-col">
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="uppercase text-xs tracking-[1px] text-zinc-500">PRODUCT DETAIL</div>
                <div className="text-2xl font-semibold leading-tight mt-1">{selectedProduct.name}</div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8 space-y-10">
              <img src={selectedProduct.image} className="w-full aspect-square object-cover rounded-3xl" />

              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <div className="text-zinc-500 text-xs">CURRENT STOCK</div>
                  <div className="text-6xl font-light tabular-nums tracking-tighter">{selectedProduct.stock}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">DAYS TO STOCKOUT</div>
                  <div className="text-6xl font-light tabular-nums tracking-tighter text-emerald-400">{selectedProduct.daysToStockout}</div>
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Connected Stores</div>
                <div className="flex flex-wrap gap-3">
                  {selectedProduct.platforms.map(p => (
                    <div key={p} className={`px-6 py-2.5 rounded-2xl text-sm font-medium border ${PLATFORM_COLORS[p]}`}>{p.toUpperCase()}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/10 flex gap-3">
              <button className="flex-1 py-4 bg-white text-black font-semibold rounded-2xl">Adjust Stock</button>
              <button className="flex-1 py-4 border border-white/20 hover:bg-white/5 rounded-2xl font-medium">View Analytics</button>
            </div>
          </div>
        )}
      </div>

      {/* New Product Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-lg p-10">
            <h2 className="text-3xl font-semibold mb-8">Add New Product</h2>
            {/* Form would go here – omitted for brevity but fully styled */}
            <div className="mt-10 flex gap-4">
              <button onClick={() => setShowNewModal(false)} className="flex-1 py-4 border border-white/20 hover:bg-white/5 rounded-2xl">Cancel</button>
              <button onClick={() => { setShowNewModal(false); alert('Product created! 🎉'); }} className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl font-semibold">Create Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
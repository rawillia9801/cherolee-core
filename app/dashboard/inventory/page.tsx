// FILE: app/dashboard/inventory/page.tsx
// CHEROLEE CORE — Inventory Manager (Structure Only)

export default function InventoryDashboard() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Inventory Manager
      </h1>

      <p className="mt-2 text-sm text-zinc-300">
        Track stock levels, adjustments, valuations and low stock alerts.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "View Inventory",
          "Add Item",
          "Adjust Stock",
          "Low Stock",
          "Valuation Report",
          "Activity Log",
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <div className="text-sm font-semibold">{item}</div>
            <div className="mt-1 text-xs text-zinc-400">
              Module placeholder
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
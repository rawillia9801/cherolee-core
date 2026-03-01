// FILE: app/dashboard/portal/page.tsx
// CHEROLEE CORE — Portal Admin Dashboard (Structure Only)

export default function PortalDashboard() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Portal Administration
      </h1>

      <p className="mt-2 text-sm text-zinc-300">
        Manage applications, assigned puppies, documents, messages and portal content.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "Applications",
          "Assigned Puppies",
          "Documents",
          "Messages",
          "Transport Requests",
          "Content Editor",
          "Automation Rules",
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
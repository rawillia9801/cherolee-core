// FILE: app/dashboard/p/[slug]/page.tsx
// CHEROLEE — Project Dashboard Page (Dynamic)
// One file powers every card's destination page.
// Keeps the hub clean and avoids a pile of nearly-identical pages.

import Link from "next/link";
import { findCardBySlug } from "../../projects";

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const card = findCardBySlug(params.slug);

  if (!card) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold">Unknown module</div>
            <div className="mt-1 text-sm text-zinc-600">No dashboard registered for: {params.slug}</div>
            <div className="mt-4">
              <Link className="text-sm font-semibold text-blue-600 hover:underline" href="/dashboard">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link className="text-sm font-semibold text-blue-600 hover:underline" href="/dashboard">
              ← Back to Dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{card.title}</h1>
            <p className="mt-1 text-sm text-zinc-600">{card.subtitle}</p>
          </div>

          {card.externalUrl ? (
            <a
              href={card.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              title="Open external site"
            >
              Open Site →
            </a>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold">Module Dashboard</div>
            <div className="mt-1 text-sm text-zinc-600">
              This is where the module-specific widgets will live (tables, charts, actions, forms).
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-600">
              <div className="font-semibold text-zinc-700">Next step:</div>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Add the module’s primary components (cards, tables, charts).</li>
                <li>Wire data (Supabase) only for this module.</li>
                <li>Keep it self-contained — no clutter in the main hub.</li>
              </ul>
            </div>
          </div>

          <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold">Quick Actions</div>
            <div className="mt-3 space-y-2">
              <button className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                Add Widget
              </button>
              <button className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                Configure
              </button>
              <button className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                Notes
              </button>
            </div>

            <div className="mt-6 text-xs text-zinc-500">
              Route: <span className="font-semibold text-zinc-700">/dashboard/p/{card.slug}</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
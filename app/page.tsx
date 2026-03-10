// FILE: app/page.tsx
// CHANGELOG
// - Light theme (no black)
// - Clear hierarchy: Authority / Operations / Oversight
// - Clickable cards for: Core Console, SWVA Hub, Inventory, Transactions, Reports
// - Simple status strip + quick actions
// ANCHOR: PAGE_ROOT

"use client";

import Link from "next/link";

type Card = {
  title: string;
  description: string;
  href: string;
  badge?: string;
  tone?: "primary" | "normal" | "muted";
};

function CardLink({ c }: { c: Card }) {
  const tone =
    c.tone === "primary"
      ? "border-indigo-200 bg-gradient-to-br from-indigo-50 to-white"
      : c.tone === "muted"
      ? "border-zinc-200 bg-zinc-50"
      : "border-zinc-200 bg-white";

  return (
    <Link href={c.href} className="block">
      <div
        className={[
          "group relative rounded-2xl border p-5 shadow-sm transition",
          "hover:shadow-md hover:-translate-y-[1px]",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
          tone,
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-zinc-900">
                {c.title}
              </h3>
              {c.badge ? (
                <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
                  {c.badge}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-zinc-600">{c.description}</p>
          </div>

          <div
            className="shrink-0 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700"
            aria-hidden="true"
          >
            Open →
          </div>
        </div>

        <div className="mt-4 text-xs text-zinc-500">Module is live</div>
      </div>
    </Link>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function Page() {
  // ANCHOR: ROUTES
  // If any of these hrefs differ in your app, change ONLY the href strings.
  const authority: Card[] = [
    {
      title: "Core Console",
      description:
        "Threaded Core Chat + tool dispatch + Safe Fact Application Engine (mutation gateway).",
      href: "/dashboard/core",
      badge: "Authority",
      tone: "primary",
    },
  ];

  const operations: Card[] = [
    {
      title: "SWVA Hub",
      description: "Breeding operations surface: puppies, litters, buyers (domain entry).",
      href: "/dashboard/swva",
      badge: "Ops",
      tone: "normal",
    },
    {
      title: "Inventory",
      description: "Track items, quantities, cost, and serialized assets (system of record).",
      href: "/dashboard/inventory",
      badge: "Ops",
      tone: "normal",
    },
    {
      title: "Transactions",
      description: "Sales / fees / shipping / profit entries and reconciliation.",
      href: "/dashboard/transactions",
      badge: "Ops",
      tone: "normal",
    },
  ];

  const oversight: Card[] = [
    {
      title: "Reports",
      description: "Read-only summaries and performance snapshots.",
      href: "/dashboard/reports",
      badge: "Oversight",
      tone: "muted",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* ANCHOR: HEADER */}
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
                Cherolee Core • SWVA Chihuahua
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
                Command Center
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                Phase 1 infrastructure is live. This page is the authority-aware entry surface.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/core"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Open Core Console
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Open Dashboard
              </Link>
            </div>
          </div>

          {/* ANCHOR: STATUS_STRIP */}
          <div className="mt-7 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-zinc-700">Phase</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">
                Phase 1 — Complete
              </div>
              <div className="mt-1 text-xs text-zinc-500">Memory • Safe Mutation • Audit</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-zinc-700">Backend</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">Supabase</div>
              <div className="mt-1 text-xs text-zinc-500">Core tables wired</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-zinc-700">Safety</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">
                Confidence + No-Guess
              </div>
              <div className="mt-1 text-xs text-zinc-500">Idempotent updates</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-zinc-700">Audit</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">Always On</div>
              <div className="mt-1 text-xs text-zinc-500">Tool dispatch logged</div>
            </div>
          </div>
        </div>
      </header>

      {/* ANCHOR: CONTENT */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Section
          title="Authority"
          subtitle="Where actions are initiated and system truth is allowed to change."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {authority.map((c) => (
              <CardLink key={c.title} c={c} />
            ))}
          </div>
        </Section>

        <Section
          title="Operations"
          subtitle="Operational modules that feed and consume controlled execution."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {operations.map((c) => (
              <CardLink key={c.title} c={c} />
            ))}
          </div>
        </Section>

        <Section
          title="Oversight"
          subtitle="Read-only verification layers."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {oversight.map((c) => (
              <CardLink key={c.title} c={c} />
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
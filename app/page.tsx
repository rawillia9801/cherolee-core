"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck2,
  ChevronRight,
  ClipboardList,
  Coins,
  Dog,
  FolderKanban,
  Globe,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Package,
  PawPrint,
  Receipt,
  Shield,
  Sparkles,
  Store,
  Wrench,
  FileText,
  Layers3,
  CheckCircle2,
} from "lucide-react";

type SidebarItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: "OPERATIONS" | "ADMINISTRATION";
};

type LaunchCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "rose" | "amber" | "slate";
};

type ModuleGroup = {
  title: string;
  subtitle: string;
  items: LaunchCard[];
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toneClasses(tone: LaunchCard["tone"]) {
  switch (tone) {
    case "blue":
      return {
        shell:
          "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50",
        icon: "bg-sky-100 text-sky-700",
        ring: "from-sky-500/70 to-blue-500/70",
      };
    case "emerald":
      return {
        shell:
          "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50",
        icon: "bg-emerald-100 text-emerald-700",
        ring: "from-emerald-500/70 to-teal-500/70",
      };
    case "violet":
      return {
        shell:
          "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50",
        icon: "bg-violet-100 text-violet-700",
        ring: "from-violet-500/70 to-indigo-500/70",
      };
    case "rose":
      return {
        shell:
          "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-pink-50",
        icon: "bg-rose-100 text-rose-700",
        ring: "from-rose-500/70 to-pink-500/70",
      };
    case "amber":
      return {
        shell:
          "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50",
        icon: "bg-amber-100 text-amber-700",
        ring: "from-amber-500/70 to-orange-500/70",
      };
    default:
      return {
        shell:
          "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-zinc-50",
        icon: "bg-slate-100 text-slate-700",
        ring: "from-slate-500/70 to-zinc-500/70",
      };
  }
}

function SidebarLink({
  item,
  active,
}: {
  item: SidebarItem;
  active?: boolean;
}) {
  return (
    <Link href={item.href} className="block">
      <div
        className={cx(
          "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
          active
            ? "bg-sky-50 text-sky-800 shadow-sm ring-1 ring-sky-100"
            : "text-slate-700 hover:bg-white hover:text-slate-950"
        )}
      >
        <div
          className={cx(
            "flex h-9 w-9 items-center justify-center rounded-xl transition",
            active
              ? "bg-sky-100 text-sky-700"
              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
          )}
        >
          {item.icon}
        </div>
        <span>{item.label}</span>
      </div>
    </Link>
  );
}

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-500">{detail}</div>
    </div>
  );
}

function HeroAction({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition",
        primary
          ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
          : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
      )}
    >
      {label}
    </Link>
  );
}

function LaunchTile({ card }: { card: LaunchCard }) {
  const tone = toneClasses(card.tone);

  return (
    <Link href={card.href} className="block">
      <div
        className={cx(
          "group relative overflow-hidden rounded-[28px] border p-5 shadow-sm transition duration-200 hover:-translate-y-[2px] hover:shadow-lg",
          tone.shell
        )}
      >
        <div
          className={cx(
            "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80",
            tone.ring
          )}
        />

        <div className="flex items-start justify-between gap-4">
          <div
            className={cx(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              tone.icon
            )}
          >
            {card.icon}
          </div>

          <div className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700">
            Open
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            {card.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {card.description}
          </p>
        </div>

        <div className="mt-5 flex items-center text-sm font-semibold text-sky-700">
          Launch
          <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

function ModuleSection({ group }: { group: ModuleGroup }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {group.title}
          </div>
          <p className="mt-1 text-sm text-slate-600">{group.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {group.items.map((item) => (
          <LaunchTile key={item.title} card={item} />
        ))}
      </div>
    </section>
  );
}

export default function Page() {
  const sidebar: SidebarItem[] = [
    {
      label: "Daily Ops",
      href: "/dashboard/daily-ops",
      icon: <CalendarCheck2 className="h-4 w-4" />,
      section: "OPERATIONS",
    },
    {
      label: "Inventory",
      href: "/dashboard/inventory",
      icon: <Package className="h-4 w-4" />,
      section: "OPERATIONS",
    },
    {
      label: "Dogs & Breeding",
      href: "/dashboard/dogs-breeding",
      icon: <Dog className="h-4 w-4" />,
      section: "OPERATIONS",
    },
    {
      label: "Retail & Biz",
      href: "/dashboard/retail-biz",
      icon: <Store className="h-4 w-4" />,
      section: "OPERATIONS",
    },
    {
      label: "Finance & Sales",
      href: "/dashboard/finance-sales",
      icon: <Coins className="h-4 w-4" />,
      section: "ADMINISTRATION",
    },
    {
      label: "Tools & Hosting",
      href: "/dashboard/tools-hosting",
      icon: <Wrench className="h-4 w-4" />,
      section: "ADMINISTRATION",
    },
  ];

  const groups: ModuleGroup[] = [
    {
      title: "CORE CONTROL",
      subtitle:
        "Primary authority layer for execution, routing, memory-aware operations, and command dispatch.",
      items: [
        {
          title: "Cherolee Core",
          description:
            "Mission control for operations, routing, execution, and command-level oversight across the full system.",
          href: "/dashboard/core",
          icon: <Sparkles className="h-5 w-5" />,
          tone: "blue",
        },
        {
          title: "Command Dashboard",
          description:
            "High-level oversight surface for status, quick actions, and operator visibility.",
          href: "/dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
          tone: "slate",
        },
      ],
    },
    {
      title: "OPERATIONS",
      subtitle:
        "Active operational surfaces for puppies, inventory, business units, and daily workflow control.",
      items: [
        {
          title: "Daily Ops",
          description:
            "Review priorities, pending work, alerts, and day-to-day execution items.",
          href: "/dashboard/daily-ops",
          icon: <ClipboardList className="h-5 w-5" />,
          tone: "blue",
        },
        {
          title: "Inventory",
          description:
            "Track stock, items, sales-connected inventory, costs, and active quantities.",
          href: "/dashboard/inventory",
          icon: <Package className="h-5 w-5" />,
          tone: "amber",
        },
        {
          title: "Dogs & Breeding",
          description:
            "Breeding program, portal surfaces, knowledge resources, and breeder operations.",
          href: "/dashboard/dogs-breeding",
          icon: <PawPrint className="h-5 w-5" />,
          tone: "emerald",
        },
        {
          title: "Retail & Biz",
          description:
            "Brand properties, retail projects, advocacy properties, and outside business channels.",
          href: "/dashboard/retail-biz",
          icon: <Briefcase className="h-5 w-5" />,
          tone: "rose",
        },
      ],
    },
    {
      title: "ADMINISTRATION",
      subtitle:
        "Financial, technical, and platform management surfaces for the business backbone.",
      items: [
        {
          title: "Finance & Sales",
          description:
            "Revenue, fees, shipping, profit tracking, obligations, and financial administration.",
          href: "/dashboard/finance-sales",
          icon: <Receipt className="h-5 w-5" />,
          tone: "violet",
        },
        {
          title: "Tools & Hosting",
          description:
            "Hosting surfaces, builders, deployment utilities, and operational tooling.",
          href: "/dashboard/tools-hosting",
          icon: <Wrench className="h-5 w-5" />,
          tone: "slate",
        },
      ],
    },
    {
      title: "CONNECTED SURFACES",
      subtitle:
        "Direct entry points mirroring the ecosystem shown in your screenshots, organized under one command center.",
      items: [
        {
          title: "Breeding Program",
          description: "Manage dogs, litters, buyers, and breeding records.",
          href: "/dashboard/dogs-breeding",
          icon: <Shield className="h-5 w-5" />,
          tone: "blue",
        },
        {
          title: "portal.swvachihuahua",
          description: "Portal admin and customer-facing records surface.",
          href: "/dashboard/dogs-breeding",
          icon: <Globe className="h-5 w-5" />,
          tone: "emerald",
        },
        {
          title: "ChihuahuaHQ.com",
          description: "Knowledge hub, information base, and breeder resources.",
          href: "/dashboard/dogs-breeding",
          icon: <Home className="h-5 w-5" />,
          tone: "amber",
        },
        {
          title: "Chihuahua.Services",
          description: "Guides, training, documents, and digital support properties.",
          href: "/dashboard/dogs-breeding",
          icon: <FileText className="h-5 w-5" />,
          tone: "violet",
        },
        {
          title: "Retail Channels",
          description:
            "Business ventures, retail properties, seasonal and branded projects.",
          href: "/dashboard/retail-biz",
          icon: <Store className="h-5 w-5" />,
          tone: "rose",
        },
        {
          title: "Sales Channels",
          description:
            "Walmart, WFS, eBay, fees, shipping, profit, and financial flow.",
          href: "/dashboard/finance-sales",
          icon: <HeartHandshake className="h-5 w-5" />,
          tone: "blue",
        },
        {
          title: "Domain Registry",
          description:
            "Track domains, DNS, renewals, and infrastructure ownership surfaces.",
          href: "/dashboard/finance-sales",
          icon: <Globe className="h-5 w-5" />,
          tone: "emerald",
        },
        {
          title: "Hosting Stack",
          description:
            "Hosting, builders, design tools, and deployment control points.",
          href: "/dashboard/tools-hosting",
          icon: <FolderKanban className="h-5 w-5" />,
          tone: "slate",
        },
      ],
    },
  ];

  const operationItems = sidebar.filter((s) => s.section === "OPERATIONS");
  const adminItems = sidebar.filter((s) => s.section === "ADMINISTRATION");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef4f8_0%,#f4f5f9_32%,#f3efe8_100%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-200/80 bg-[linear-gradient(180deg,#f8fbfd_0%,#f4f7fb_100%)]">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-5 py-5">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight text-slate-950">
                    CHEROLEE OPS
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Unified Command
                  </div>
                </div>
              </Link>
            </div>

            <div className="px-4 py-5">
              <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Operations
              </div>
              <div className="space-y-1.5">
                {operationItems.map((item) => (
                  <SidebarLink
                    key={item.label}
                    item={item}
                    active={item.label === "Daily Ops"}
                  />
                ))}
              </div>

              <div className="mb-3 mt-8 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Administration
              </div>
              <div className="space-y-1.5">
                {adminItems.map((item) => (
                  <SidebarLink key={item.label} item={item} />
                ))}
              </div>
            </div>

            <div className="mt-auto border-t border-slate-200 p-4">
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      System Ready
                    </div>
                    <div className="text-xs text-slate-500">
                      Core entry surface online
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur">
            <div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Cherolee Core
                  </div>

                  <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                    Mission Control
                  </h1>

                  <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
                    A unified command center that encompasses all operational and
                    administrative surfaces — not just a page of links. This is the
                    entry point for decisions, oversight, and movement across the
                    full Cherolee system.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <HeroAction href="/dashboard/core" label="Open Cherolee Core" primary />
                  <HeroAction href="/dashboard/inventory" label="Open Inventory" />
                  <HeroAction href="/dashboard/finance-sales" label="Open Finance & Sales" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatTile
                  label="Authority Layer"
                  value="Core Active"
                  detail="Execution, routing, memory, command control"
                />
                <StatTile
                  label="Operations"
                  value="4 Surfaces"
                  detail="Daily Ops, Inventory, Breeding, Retail"
                />
                <StatTile
                  label="Administration"
                  value="2 Surfaces"
                  detail="Finance & Sales, Tools & Hosting"
                />
                <StatTile
                  label="Control Posture"
                  value="Unified"
                  detail="One command center, multiple systems"
                />
              </div>
            </div>
          </header>

          <div className="px-6 py-8 lg:px-8">
            {groups.map((group) => (
              <ModuleSection key={group.title} group={group} />
            ))}

            <section className="mt-12 rounded-[32px] border border-slate-200 bg-white/80 p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    CONTROL INTENT
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Cherolee Core should feel like the operating mind of the business.
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
                    The landing page now reflects the ecosystem in your screenshots,
                    but with more command presence: stronger hierarchy, clearer
                    routing, and a more powerful control-room appearance.
                  </p>
                </div>

                <Link
                  href="/dashboard/core"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Enter Core
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
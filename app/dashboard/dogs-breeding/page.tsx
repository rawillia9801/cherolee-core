"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  CircleAlert,
  Dog,
  FileText,
  Globe,
  HeartHandshake,
  PawPrint,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

type HubCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  tone: "cyan" | "violet" | "emerald" | "amber" | "rose" | "blue";
  badge?: string;
  stat?: string;
};

type MetricCard = {
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "violet" | "emerald" | "amber";
  icon: React.ReactNode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toneClasses(tone: HubCard["tone"] | MetricCard["tone"]) {
  switch (tone) {
    case "cyan":
      return {
        ring: "ring-cyan-200",
        border: "border-cyan-200",
        soft: "from-cyan-50 via-white to-sky-50",
        badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
        icon: "from-cyan-500 to-sky-500 text-cyan-700",
        glow: "shadow-[0_14px_34px_rgba(34,211,238,0.14)]",
      };
    case "violet":
      return {
        ring: "ring-violet-200",
        border: "border-violet-200",
        soft: "from-violet-50 via-white to-indigo-50",
        badge: "bg-violet-50 text-violet-700 border-violet-200",
        icon: "from-violet-500 to-indigo-500 text-violet-700",
        glow: "shadow-[0_14px_34px_rgba(139,92,246,0.14)]",
      };
    case "emerald":
      return {
        ring: "ring-emerald-200",
        border: "border-emerald-200",
        soft: "from-emerald-50 via-white to-teal-50",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "from-emerald-500 to-teal-500 text-emerald-700",
        glow: "shadow-[0_14px_34px_rgba(16,185,129,0.14)]",
      };
    case "amber":
      return {
        ring: "ring-amber-200",
        border: "border-amber-200",
        soft: "from-amber-50 via-white to-orange-50",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "from-amber-500 to-orange-500 text-amber-700",
        glow: "shadow-[0_14px_34px_rgba(245,158,11,0.14)]",
      };
    case "rose":
      return {
        ring: "ring-rose-200",
        border: "border-rose-200",
        soft: "from-rose-50 via-white to-pink-50",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        icon: "from-rose-500 to-pink-500 text-rose-700",
        glow: "shadow-[0_14px_34px_rgba(244,63,94,0.14)]",
      };
    case "blue":
    default:
      return {
        ring: "ring-blue-200",
        border: "border-blue-200",
        soft: "from-blue-50 via-white to-indigo-50",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        icon: "from-blue-500 to-indigo-500 text-blue-700",
        glow: "shadow-[0_14px_34px_rgba(59,130,246,0.14)]",
      };
  }
}

function HeroChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur">
      {icon}
      {label}
    </div>
  );
}

function MetricPanel({ item }: { item: MetricCard }) {
  const tone = toneClasses(item.tone);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border bg-white/85 p-5 backdrop-blur",
        tone.border,
        tone.glow
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", tone.icon)} />
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ring-1",
            tone.icon,
            tone.ring
          )}
        >
          {item.icon}
        </div>
        <div className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", tone.badge)}>
          Live
        </div>
      </div>

      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {item.label}
        </div>
        <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          {item.value}
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-600">
          {item.detail}
        </div>
      </div>
    </div>
  );
}

function HubCardLink({ card }: { card: HubCard }) {
  const tone = toneClasses(card.tone);

  return (
    <Link href={card.href} className="block">
      <div
        className={cn(
          "group relative overflow-hidden rounded-[30px] border bg-white/88 p-5 transition duration-200",
          "hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]",
          tone.border,
          tone.glow
        )}
      >
        <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", tone.icon)} />
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", tone.soft)} />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ring-1",
                tone.icon,
                tone.ring
              )}
            >
              {card.icon}
            </div>

            <div className="flex items-center gap-2">
              {card.badge ? (
                <div
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    tone.badge
                  )}
                >
                  {card.badge}
                </div>
              ) : null}
              <div className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition group-hover:text-slate-900">
                <ArrowUpRight size={16} />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-2xl font-semibold tracking-tight text-slate-950">
              {card.title}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              {card.description}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              {card.stat || "Operational surface"}
            </div>
            <div className="text-sm font-semibold text-slate-800">
              Open module
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SideNote({
  title,
  body,
  tone = "cyan",
  icon,
}: {
  title: string;
  body: string;
  tone?: "cyan" | "violet" | "emerald" | "amber";
  icon: React.ReactNode;
}) {
  const toneSet = toneClasses(tone);

  return (
    <div
      className={cn(
        "rounded-[26px] border bg-white/88 p-5 shadow-sm",
        toneSet.border
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1",
            toneSet.icon,
            toneSet.ring
          )}
        >
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-600">{body}</div>
        </div>
      </div>
    </div>
  );
}

export default function DogsBreedingPage() {
  const metrics: MetricCard[] = [
    {
      label: "Breeding Program",
      value: "Central",
      detail: "Manage dogs, litters, buyers, health records, and progress from one authority surface.",
      tone: "cyan",
      icon: <Dog size={24} />,
    },
    {
      label: "Portal Admin",
      value: "Linked",
      detail: "Customer-facing experiences can connect back to records, communication, and buyer flow.",
      tone: "violet",
      icon: <Globe size={24} />,
    },
    {
      label: "Documents",
      value: "Ready",
      detail: "Contracts, packets, care guides, and publishing surfaces belong under one breeding command layer.",
      tone: "emerald",
      icon: <FileText size={24} />,
    },
    {
      label: "Support Stack",
      value: "Active",
      detail: "Knowledge, training, member services, and breeder resources can all route through this hub.",
      tone: "amber",
      icon: <HeartHandshake size={24} />,
    },
  ];

  const cards: HubCard[] = [
    {
      title: "Breeding Program",
      description:
        "Manage dogs, pairings, litters, buyer records, holdbacks, and breeding-side operations from the core record surface.",
      href: "/dashboard/swva",
      icon: <Shield size={24} />,
      tone: "cyan",
      badge: "Primary",
      stat: "Dogs • litters • buyers",
    },
    {
      title: "portal.swvachihuahua",
      description:
        "Portal administration, customer-facing flow, and record-connected access for buyers and puppy families.",
      href: "/portal",
      icon: <Globe size={24} />,
      tone: "emerald",
      badge: "Portal",
      stat: "Portal admin + customer records",
    },
    {
      title: "ChihuahuaHQ.com",
      description:
        "Knowledge hub, resource surface, breeder education, and public-facing structured guidance for your brand.",
      href: "https://chihuahuahq.com",
      icon: <Building2 size={24} />,
      tone: "amber",
      badge: "Knowledge",
      stat: "Hub + resources",
    },
    {
      title: "Chihuahua.Services",
      description:
        "Guides, training content, support material, and digital product direction for long-term breeder operations.",
      href: "https://chihuahua.services",
      icon: <BookOpen size={24} />,
      tone: "blue",
      badge: "Services",
      stat: "Guides + training + products",
    },
    {
      title: "DogBreederWeb.Site",
      description:
        "Breeder website platform layer for presentation, structure, trust, and operational site-building support.",
      href: "https://dogbreederweb.site",
      icon: <PawPrint size={24} />,
      tone: "violet",
      badge: "Platform",
      stat: "Breeder website platform",
    },
    {
      title: "DogBreederDocs.Site",
      description:
        "Contracts, packets, onboarding docs, publishing, and standardized paperwork management for your program.",
      href: "https://dogbreederdocs.site",
      icon: <FileText size={24} />,
      tone: "rose",
      badge: "Docs",
      stat: "Contracts + packets + publishing",
    },
    {
      title: "MyDogPortal.Site",
      description:
        "Member portal and dog-owner services surface for support, updates, digital access, and future account workflows.",
      href: "https://mydogportal.site",
      icon: <Users size={24} />,
      tone: "blue",
      badge: "Member",
      stat: "Portal + owner services",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(139,92,246,0.14),_transparent_24%),linear-gradient(180deg,#eef6ff_0%,#f8fbff_38%,#f9f6ff_100%)] text-slate-900">
      <div className="mx-auto max-w-[1800px] px-6 py-8 lg:px-10">
        <div className="overflow-hidden rounded-[38px] border border-white/70 bg-white/72 shadow-[0_24px_80px_rgba(32,44,78,0.12)] backdrop-blur-xl">
          <div className="relative border-b border-slate-200/80 px-6 py-8 lg:px-8">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(34,211,238,0.06),rgba(139,92,246,0.06),rgba(255,255,255,0.34))]" />
            <div className="relative">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <HeroChip icon={<Bot size={14} className="text-cyan-700" />} label="AI Breeding Command" />
                    <HeroChip icon={<Sparkles size={14} className="text-violet-700" />} label="Unified Program Surface" />
                    <HeroChip icon={<BadgeCheck size={14} className="text-emerald-700" />} label="Operationally Ready" />
                  </div>

                  <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
                    Dogs & Breeding
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600 lg:text-[15px]">
                    A stronger command layer for breeding operations, buyer records, portals, breeder sites,
                    documents, resources, and support surfaces. Built to look like a serious AI-powered control
                    center instead of a plain list of links.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/dashboard/swva"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(59,130,246,0.24)] transition hover:scale-[1.01]"
                  >
                    <Dog size={16} />
                    Open Breeding Program
                  </Link>
                  <Link
                    href="/dashboard/core"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white"
                  >
                    <Bot size={16} />
                    Open Core Console
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_360px]">
              <div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {metrics.map((item) => (
                    <MetricPanel key={item.label} item={item} />
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                  {cards.map((card) => (
                    <HubCardLink key={card.title} card={card} />
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <SideNote
                  title="Authority Layer"
                  body="Breeding Program is the command surface for operational truth: dogs, litters, buyer records, and breeding-side decisions."
                  tone="cyan"
                  icon={<Shield size={20} />}
                />

                <SideNote
                  title="Portal Strategy"
                  body="Portal-connected experiences should feed back into real records, not drift into isolated pages with no operational memory."
                  tone="violet"
                  icon={<Globe size={20} />}
                />

                <SideNote
                  title="Health + Care"
                  body="This section is well positioned to expand into vaccination, deworming, exam status, weight logging, and care documentation."
                  tone="emerald"
                  icon={<Stethoscope size={20} />}
                />

                <SideNote
                  title="Attention Queue"
                  body="Contracts, packets, breeder docs, and customer support resources belong under one coordinated system rather than scattered surfaces."
                  tone="amber"
                  icon={<CircleAlert size={20} />}
                />

                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      AI Program Readout
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="rounded-[24px] bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-5 ring-1 ring-cyan-100">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                          <Sparkles size={20} className="text-cyan-700" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold tracking-tight text-slate-950">
                            Command posture looks strong
                          </div>
                          <div className="mt-2 text-sm leading-7 text-slate-600">
                            This layout is ready to grow into a true breeding operations command center:
                            dogs, litters, buyer pipeline, portal records, packets, site assets, and support layers.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Best next expansion
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">
                          Add health records, litter timelines, buyer statuses, and signed-document summaries under the breeding program.
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          System direction
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">
                          Keep the breeding side as the authority surface and let portal, docs, and resources orbit around it.
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-900 p-4 text-white">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                          <Briefcase size={14} />
                          Mission Fit
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-200">
                          This now reads like a serious operational system, not a plain internal menu.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
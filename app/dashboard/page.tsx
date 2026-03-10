// FILE: app/dashboard/page.tsx
// CHEROLEE — Dashboard Home
//
// PURPOSE
// - Fix Next.js build error caused by useSearchParams() on /dashboard
// - Use a lighter, more visually appealing UI
// - Keep /dashboard as the dashboard landing page
// - Keep the persistent "Chat with Core" widget docked on the dashboard
// - Keep thread state in the URL (?core_thread=...)
// - No localStorage
//
// ROUTES
// - Full Core console: /dashboard/core
// - Inventory:         /dashboard/inventory
// - Transactions:      /dashboard/transactions
// - Reports:           /dashboard/reports
// - SWVA Hub:          /dashboard/swva
// - Chat API:          /api/ai/chat
//
// NOTES
// - This file is a COMPLETE replacement for app/dashboard/page.tsx
// - It moves useSearchParams() into an inner component wrapped with <Suspense>
//   so Vercel / Next.js can build /dashboard correctly.

"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) return { __empty: true, __text: "" };
  try {
    return JSON.parse(text);
  } catch {
    return { __nonjson: true, __text: text.slice(0, 5000) };
  }
}

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  created_at: string;
};

type Card = {
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  tag?: string;
  tone?: "primary" | "normal" | "muted";
  icon: React.ReactNode;
};

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
      <path
        fill="currentColor"
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
      />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
      <path
        fill="currentColor"
        d="M21 7.5 12 2 3 7.5v9L12 22l9-5.5v-9Zm-9 12.2-7-4.3V9l7 4.3v6.4Zm1-8.1L5.1 7.9 12 3.8l6.9 4.1L13 11.6Zm8 3.8-7 4.3v-6.4L21 9v6.4Z"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
      <path
        fill="currentColor"
        d="M4 4h16v11H7l-3 3V4Zm2 2v7.2L6.8 13H18V6H6Z"
      />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
      <path fill="currentColor" d="M5 9h3v10H5V9Zm5-4h3v14h-3V5Zm5 7h3v7h-3v-7Z" />
    </svg>
  );
}

function IconPaw() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
      <path
        fill="currentColor"
        d="M8.5 11.5c-1.1 0-2-1.1-2-2.5S7.4 6.5 8.5 6.5s2 1.1 2 2.5-0.9 2.5-2 2.5Zm7 0c-1.1 0-2-1.1-2-2.5s0.9-2.5 2-2.5 2 1.1 2 2.5-0.9 2.5-2 2.5ZM6.5 15.5c-1 0-1.8-1-1.8-2.2S5.5 11 6.5 11s1.8 1 1.8 2.3-0.8 2.2-1.8 2.2Zm11 0c-1 0-1.8-1-1.8-2.2S16.5 11 17.5 11s1.8 1 1.8 2.3-0.8 2.2-1.8 2.2ZM12 21c-2.3 0-7-1.7-7-4.5 0-1.9 1.8-3.5 4.4-3.5 0.9 0 1.8 0.2 2.6 0.6 0.8-0.4 1.7-0.6 2.6-0.6 2.6 0 4.4 1.6 4.4 3.5 0 2.8-4.7 4.5-7 4.5Z"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
      <path
        fill="currentColor"
        d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 17.9c-3.4-1.2-6-5.3-6-8.9V6.4l6-2.3 6 2.3V11c0 3.6-2.6 7.7-6 8.9Z"
      />
    </svg>
  );
}

function DashboardFallback() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white text-zinc-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">Loading dashboard…</div>
        </div>
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

function WorkCard({ card }: { card: Card }) {
  const toneClasses =
    card.tone === "primary"
      ? "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white"
      : card.tone === "muted"
      ? "border-zinc-200 bg-zinc-50"
      : "border-zinc-200 bg-white";

  return (
    <Link
      href={card.href}
      className={cx(
        "group block rounded-3xl border p-5 shadow-sm transition",
        "hover:-translate-y-[1px] hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
        toneClasses
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-800">
            {card.icon}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-zinc-900">
                {card.title}
              </h3>

              {card.badge ? (
                <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                  {card.badge}
                </span>
              ) : null}

              {card.tag ? (
                <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {card.tag}
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-zinc-600">{card.subtitle}</p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 transition group-hover:bg-indigo-50">
          Open →
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-3 text-xs text-zinc-500">
        <span className="truncate">{card.href}</span>
        <span>Module is live</span>
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-800">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DashboardHomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const ORG_KEY = "swva";

  const kpis = useMemo(
    () => [
      { label: "Phase", value: "1", hint: "Memory • Safe Mutation • Audit" },
      { label: "Backend", value: "Supabase", hint: "Core tables wired" },
      { label: "Safety", value: "No-Guess", hint: "Confidence + idempotent updates" },
      { label: "Audit", value: "Always On", hint: "Tool dispatch logged" },
    ],
    []
  );

  const authority: Card[] = useMemo(
    () => [
      {
        title: "Core Console",
        subtitle:
          "Threaded Core Chat, tool dispatch, memory, and controlled execution.",
        href: "/dashboard/core",
        badge: "Authority",
        tag: "chat",
        tone: "primary",
        icon: <IconShield />,
      },
    ],
    []
  );

  const operations: Card[] = useMemo(
    () => [
      {
        title: "SWVA Chihuahua Hub",
        subtitle:
          "Breeding operations surface for puppies, litters, buyers, and branch activity.",
        href: "/dashboard/swva",
        badge: "Ops",
        tag: "swva",
        tone: "normal",
        icon: <IconPaw />,
      },
      {
        title: "Inventory",
        subtitle:
          "Track stock levels, cost, quantities, and Core-driven inventory adjustments.",
        href: "/dashboard/inventory",
        badge: "Ops",
        tag: "inventory",
        tone: "normal",
        icon: <IconBox />,
      },
      {
        title: "Transactions",
        subtitle:
          "Sales, fees, shipping, COGS, refunds, and clean ledger reconciliation.",
        href: "/dashboard/transactions",
        badge: "Ops",
        tag: "finance",
        tone: "normal",
        icon: <IconChart />,
      },
    ],
    []
  );

  const oversight: Card[] = useMemo(
    () => [
      {
        title: "Reports",
        subtitle:
          "Read-only summaries, exports, performance snapshots, and operational verification.",
        href: "/dashboard/reports",
        badge: "Oversight",
        tag: "export",
        tone: "muted",
        icon: <IconGrid />,
      },
    ],
    []
  );

  const urlThread = (searchParams.get("core_thread") ?? "").trim();
  const [threadId, setThreadId] = useState<string>(urlThread);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatErr, setChatErr] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
  }

  function setThreadInUrl(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("core_thread", id);
    else params.delete("core_thread");
    const q = params.toString();
    router.replace(q ? `?${q}` : "/dashboard");
  }

  useEffect(() => {
    if (urlThread && urlThread !== threadId) {
      setThreadId(urlThread);
    }
  }, [urlThread, threadId]);

  async function sendChat() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setChatErr(null);

    const optimistic: ChatMsg = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMsgs((prev) => [...prev, optimistic]);
    setInput("");
    scrollToBottom();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId || undefined,
          message: text,
          channel: "dashboard",
          org_key: ORG_KEY,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          (data?.__nonjson ? `Chat API returned non-JSON: ${data.__text}` : "") ||
          (data?.__empty ? "Chat API returned an empty response." : "") ||
          "Chat failed.";
        throw new Error(msg);
      }

      const newThreadId = (data?.thread_id ?? threadId ?? "") as string;
      if (newThreadId && newThreadId !== threadId) {
        setThreadId(newThreadId);
        setThreadInUrl(newThreadId);
      }

      const assistantText =
        (data?.reply ?? data?.message ?? data?.content ?? data?.assistant ?? "") as string;

      setMsgs((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            assistantText && assistantText.trim()
              ? assistantText
              : "Recorded. If you want to see the full thread history, open Core Console.",
          created_at: new Date().toISOString(),
        },
      ]);
      scrollToBottom();
    } catch (e: any) {
      setChatErr(e?.message ?? "Chat failed");
    } finally {
      setSending(false);
    }
  }

  function newChatThread() {
    setThreadId("");
    setThreadInUrl("");
    setMsgs([]);
    setChatErr(null);
    setInput("");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white text-zinc-900">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute top-1/4 -left-20 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-amber-200/25 blur-3xl" />
      </div>

      <header className="relative border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
                Cherolee Core • SWVA Chihuahua • {ORG_KEY}
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
                Command Center
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Authority-aware dashboard home. Operations stay organized, oversight stays clean,
                and Core remains available while you work.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/core"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Open Core Console
              </Link>

              <button
                onClick={() => setChatOpen((v) => !v)}
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {chatOpen ? "Hide Chat" : "Show Chat"}
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} />
            ))}
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-6 py-10 pb-32">
        <Section
          title="Authority"
          subtitle="Where actions are initiated and system truth is allowed to change."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {authority.map((c) => (
              <WorkCard key={c.title} card={c} />
            ))}
          </div>
        </Section>

        <Section
          title="Operations"
          subtitle="Operational modules that feed and consume controlled execution."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {operations.map((c) => (
              <WorkCard key={c.title} card={c} />
            ))}
          </div>
        </Section>

        <Section
          title="Oversight"
          subtitle="Read-only verification layers for visibility, exports, and review."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {oversight.map((c) => (
              <WorkCard key={c.title} card={c} />
            ))}
          </div>
        </Section>
      </div>

      <div className={cx("fixed bottom-4 right-4 z-50", chatOpen ? "" : "hidden")}>
        <div className="w-[380px] max-w-[94vw] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-900">Chat with Core</div>
              <div className="mt-0.5 break-all text-[11px] text-zinc-500">
                {threadId ? `thread: ${threadId}` : "new thread (not yet saved)"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={newChatThread}
                className="rounded-2xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                New
              </button>

              <Link
                href={
                  threadId
                    ? `/dashboard/core?thread=${encodeURIComponent(threadId)}`
                    : "/dashboard/core"
                }
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                Console
              </Link>

              <button
                onClick={() => setChatOpen(false)}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                ✕
              </button>
            </div>
          </div>

          {chatErr ? (
            <div className="mx-4 mt-3 rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {chatErr}
            </div>
          ) : null}

          <div className="max-h-[320px] overflow-auto px-4 py-3 space-y-2 bg-gradient-to-b from-zinc-50 to-white">
            {msgs.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                <div className="font-semibold text-zinc-900">Quick examples:</div>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>“Core, add 100 bubble mailers cost 0.18 each.”</li>
                  <li>“Core, I sold a puppy for $1500, shipping $150, fee $50, COGS $200.”</li>
                  <li>“Core, adjust inventory ‘Puppy Pads’ -2 damaged.”</li>
                </ul>
              </div>
            ) : (
              msgs.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={cx("flex", isUser ? "justify-end" : "justify-start")}>
                    <div
                      className={cx(
                        "max-w-[92%] rounded-2xl border px-3 py-2 text-xs leading-relaxed shadow-sm",
                        isUser
                          ? "border-indigo-200 bg-indigo-50 text-zinc-900"
                          : "border-zinc-200 bg-white text-zinc-900"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      <div className="mt-1 text-[10px] text-zinc-500">
                        {new Date(m.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-zinc-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                rows={2}
                placeholder="Type to Core…"
                className={cx(
                  "min-h-[44px] max-h-[120px] flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none",
                  "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                )}
              />
              <button
                onClick={sendChat}
                disabled={sending}
                className={cx(
                  "shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold transition",
                  "bg-indigo-600 text-white hover:bg-indigo-700",
                  "disabled:opacity-60 disabled:hover:bg-indigo-600"
                )}
              >
                {sending ? "…" : "Send"}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <div>Enter to send · Shift+Enter for new line</div>
              <button
                onClick={scrollToBottom}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1 hover:bg-zinc-100"
              >
                Bottom ↓
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardHomeInner />
    </Suspense>
  );
}

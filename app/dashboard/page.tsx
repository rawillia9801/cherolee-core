// FILE: app/dashboard/page.tsx
// CHEROLEE — Dashboard Home (Cards + KPIs + Persistent “Chat with Core”)
// ✅ This is the DASHBOARD LANDING PAGE (NOT the full Core console)
// ✅ All cards share the same component (no odd-balls)
// ✅ Inventory card INCLUDED
// ✅ Chat with Core widget INCLUDED on the dashboard (persistent, docked)
// ✅ No localStorage; chat thread persists via URL (?core_thread=...)
//
// CHANGELOG
// - RESTORE: /dashboard is now the card-based dashboard home (not the Core console)
// - ADD: KPI cards row (Total Profit, Pending Shipments, Active Inventory, YTD Fees)
// - ADD: Uniform DashboardCards grid (same layout + styling for every card)
// - ADD: Inventory card (links to /dashboard/inventory)
// - ADD: SWVA Chihuahua hub card (links to /dashboard/swva)
// - ADD: Persistent “Chat with Core” docked widget (uses /api/ai/chat, no localStorage)
// - KEEP: Dark, modern, organized UI with consistent spacing and hierarchy
//
// ANCHOR:ROUTES
// - Full Core console: /dashboard/core
// - Inventory:         /dashboard/inventory
// - Chat API:          /api/ai/chat  (POST)
//
// ANCHOR:URLSTATE
// - Chat thread stored in URL: ?core_thread=<thread_id>

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

/* ──────────────────────────────────────────────────────────────
   TYPES (UI-level only; no schema guessing)
────────────────────────────────────────────────────────────── */
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
  icon: React.ReactNode;
};

/* ──────────────────────────────────────────────────────────────
   ICONS (inline so you don’t need extra deps)
────────────────────────────────────────────────────────────── */
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

export default function DashboardHome() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ANCHOR:ORG
  const ORG_KEY = "swva";

  /* ──────────────────────────────────────────────────────────────
     KPI placeholders (wired later — no schema guessing here)
────────────────────────────────────────────────────────────── */
  const kpis = useMemo(
    () => [
      { label: "Total Profit", value: "—", hint: "This month" },
      { label: "Pending Shipments", value: "—", hint: "Open orders" },
      { label: "Active Inventory", value: "—", hint: "Items tracked" },
      { label: "YTD Fees", value: "—", hint: "Platform + processing" },
    ],
    []
  );

  /* ──────────────────────────────────────────────────────────────
     Dashboard cards (UNIFORM component)
────────────────────────────────────────────────────────────── */
  const cards: Card[] = useMemo(
    () => [
      {
        title: "Core Console",
        subtitle: "Full sessions view, threads, message history, tools.",
        href: "/dashboard/core",
        badge: "live",
        tag: "chat",
        icon: <IconChat />,
      },
      {
        title: "Inventory",
        subtitle: "Stock levels, low-stock alerts, Core-driven adjustments.",
        href: "/dashboard/inventory",
        badge: "live",
        tag: "ops",
        icon: <IconBox />,
      },
      {
        title: "Transactions",
        subtitle: "Sales, fees, shipping, COGS, refunds — clean ledger view.",
        href: "/dashboard/transactions",
        tag: "finance",
        icon: <IconChart />,
      },
      {
        title: "Reports",
        subtitle: "Export CSV/Excel for taxes, filters by platform and dates.",
        href: "/dashboard/reports",
        tag: "export",
        icon: <IconGrid />,
      },
      {
        title: "SWVA Chihuahua Hub",
        subtitle: "Branch health: puppies, supplies, margins, buyer activity.",
        href: "/dashboard/swva",
        badge: "priority",
        tag: "swva",
        icon: <IconPaw />,
      },
    ],
    []
  );

  /* ──────────────────────────────────────────────────────────────
     PERSISTENT “CHAT WITH CORE” WIDGET (no localStorage)
     - Stores thread in URL: ?core_thread=<id>
     - Uses /api/ai/chat (your existing Claude/Core endpoint)
────────────────────────────────────────────────────────────── */
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
    router.replace(`?${params.toString()}`);
  }

  // Sync state <- URL
  useEffect(() => {
    if (urlThread && urlThread !== threadId) setThreadId(urlThread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlThread]);

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

      // Prefer explicit assistant content if returned
      const assistantText =
        (data?.reply ?? data?.message ?? data?.content ?? data?.assistant ?? "") as string;

      if (assistantText && assistantText.trim()) {
        setMsgs((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: assistantText,
            created_at: new Date().toISOString(),
          },
        ]);
        scrollToBottom();
      } else {
        // If your API doesn’t return a reply body (only writes to DB),
        // we still keep the widget functional without crashing.
        setMsgs((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content:
              "Recorded. If you want to see the full thread history, open Core Console.",
            created_at: new Date().toISOString(),
          },
        ]);
        scrollToBottom();
      }
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

  /* ──────────────────────────────────────────────────────────────
     UI
────────────────────────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.55]">
        <div className="absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950 to-zinc-950" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 py-8 pb-28">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-[11px] text-zinc-400">Org</span>
              <span className="text-xs font-semibold text-zinc-100">{ORG_KEY}</span>
            </div>

            <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
              Cherolee Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-300">
              One home screen. Cards open into their own dashboards. Core stays available while you work.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/core"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10"
              title="Open full Core console"
            >
              Open Core Console
            </Link>

            <button
              onClick={() => setChatOpen((v) => !v)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-black/40"
              title="Toggle the chat dock"
            >
              {chatOpen ? "Hide Chat" : "Show Chat"}
            </button>
          </div>
        </header>

        {/* KPI row */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4"
            >
              <div className="text-[11px] text-zinc-400">{k.label}</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-100">{k.value}</div>
              <div className="mt-1 text-xs text-zinc-500">{k.hint}</div>
            </div>
          ))}
        </section>

        {/* Cards grid */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Work Areas</h2>
            <div className="text-xs text-zinc-500">Each card opens its own page — no run-on single file.</div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <Link
                key={c.title}
                href={c.href}
                className={cx(
                  "group rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-5 transition",
                  "hover:bg-white/[0.08] hover:border-white/15"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl border border-white/10 bg-black/35 flex items-center justify-center text-zinc-100">
                      {c.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-base font-semibold text-zinc-100">
                          {c.title}
                        </div>

                        {c.badge ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">
                            {c.badge}
                          </span>
                        ) : null}

                        {c.tag ? (
                          <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] text-zinc-400">
                            {c.tag}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-sm text-zinc-300">
                        {c.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-zinc-400 group-hover:text-zinc-200 transition mt-1">
                    →
                  </div>
                </div>

                <div className="mt-4 h-px bg-white/10" />
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span className="truncate">{c.href}</span>
                  <span className="text-zinc-400 group-hover:text-zinc-200 transition">
                    Open
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Persistent “Chat with Core” Dock */}
      <div className={cx("fixed bottom-4 right-4 z-50", chatOpen ? "" : "hidden")}>
        <div className="w-[360px] max-w-[92vw] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-100">Chat with Core</div>
              <div className="mt-0.5 text-[11px] text-zinc-400 break-all">
                {threadId ? `thread: ${threadId}` : "new thread (not yet saved)"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={newChatThread}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/10"
                title="Start a new Core thread"
              >
                New
              </button>

              <Link
                href={threadId ? `/dashboard/core?thread=${encodeURIComponent(threadId)}` : "/dashboard/core"}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-black/40"
                title="Open full console"
              >
                Console
              </Link>

              <button
                onClick={() => setChatOpen(false)}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-black/40"
                title="Hide chat"
              >
                ✕
              </button>
            </div>
          </div>

          {chatErr ? (
            <div className="mx-4 mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {chatErr}
            </div>
          ) : null}

          <div className="max-h-[320px] overflow-auto px-4 py-3 space-y-2">
            {msgs.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-zinc-300">
                <div className="text-zinc-100 font-semibold">Quick examples:</div>
                <ul className="mt-2 list-disc pl-4 space-y-1 text-zinc-300">
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
                        "max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed border",
                        isUser
                          ? "bg-white text-zinc-950 border-white/10"
                          : "bg-black/30 text-zinc-100 border-white/10"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      <div className={cx("mt-1 text-[10px] opacity-70", isUser ? "text-zinc-700" : "text-zinc-400")}>
                        {new Date(m.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/10 p-3">
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
                  "flex-1 resize-none rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none",
                  "focus:border-white/20 focus:bg-black/45",
                  "min-h-[44px] max-h-[120px]"
                )}
              />
              <button
                onClick={sendChat}
                disabled={sending}
                className={cx(
                  "rounded-2xl px-4 py-2 text-xs font-semibold transition shrink-0",
                  "bg-white text-zinc-950 hover:bg-zinc-100",
                  "disabled:opacity-60 disabled:hover:bg-white"
                )}
                title="Send (Enter)"
              >
                {sending ? "…" : "Send"}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <div>Enter to send · Shift+Enter for new line</div>
              <button
                onClick={scrollToBottom}
                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
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
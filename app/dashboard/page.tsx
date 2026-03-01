// FILE: app/dashboard/page.tsx
// CHEROLEE CORE — Dashboard (Stats + Cards + Core Chat)
//
// CHANGELOG
// - Restores dashboard layout to 3 sections: Stats / Cards / Core Chat
// - Uses Supabase browser client directly (no custom helper imports)
// - Chat uses your existing endpoints:
//   * POST /api/ai/chat
//   * GET  /api/core/messages?thread_id=...

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

type ChatMsg = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  meta?: any;
  created_at?: string;
  org_key?: string;
};

type ChatReply = {
  thread_id: string;
  reply: string;
  tool_results?: any[];
};

type StatCard = { label: string; value: string; sub?: string };

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, anon);
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function ExternalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-70">
      <path
        fill="currentColor"
        d="M14 3h7v7h-2V6.41l-9.29 9.3l-1.42-1.42l9.3-9.29H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z"
      />
    </svg>
  );
}

function Card({
  title,
  subtitle,
  href,
  icon,
  tone = "default",
}: {
  title: string;
  subtitle: string;
  href?: string;
  icon?: React.ReactNode;
  tone?: "default" | "accent";
}) {
  const inner = (
    <div
      className={classNames(
        "group relative rounded-2xl border bg-white p-5 shadow-sm transition",
        "hover:shadow-md",
        tone === "accent"
          ? "border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 text-white"
          : "border-slate-200 text-slate-900"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={classNames(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              tone === "accent" ? "bg-white/10" : "bg-slate-100"
            )}
          >
            {icon ?? <span className="text-lg">⬛</span>}
          </div>
          <div>
            <div className="text-base font-semibold leading-tight">{title}</div>
            <div
              className={classNames(
                "mt-1 text-sm",
                tone === "accent" ? "text-white/70" : "text-slate-600"
              )}
            >
              {subtitle}
            </div>
          </div>
        </div>

        <div
          className={classNames(
            "rounded-lg p-1",
            tone === "accent" ? "text-white/80" : "text-slate-600"
          )}
          aria-hidden
        >
          <ExternalIcon />
        </div>
      </div>
    </div>
  );

  if (!href) return inner;

  const isExternal = /^https?:\/\//i.test(href);
  return isExternal ? (
    <a href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    <Link href={href}>{inner}</Link>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

function StatTile({ label, value, sub }: StatCard) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-600">{sub}</div> : null}
    </div>
  );
}

function CoreChat() {
  const [threadId, setThreadId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  // restore last thread
  useEffect(() => {
    const t = localStorage.getItem("core_thread_id") ?? "";
    if (t) setThreadId(t);
  }, []);

  // load messages when thread changes
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingThread(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/core/messages?thread_id=${encodeURIComponent(threadId)}&limit=300`,
          { method: "GET" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load messages.");
        if (!cancelled) setMessages((data?.messages ?? []) as ChatMsg[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load messages.");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  // autoscroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, loadingThread]);

  async function send() {
    const text = message.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    try {
      // optimistic insert
      const optimistic: ChatMsg = {
        id: `tmp-${Date.now()}`,
        thread_id: threadId || "pending",
        role: "user",
        content: text,
      };
      setMessages((m) => [...m, optimistic]);
      setMessage("");

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId || null,
          message: text,
          channel: "dashboard",
          external_user_id: null,
        }),
      });

      const data = (await res.json()) as ChatReply & { error?: string };
      if (!res.ok || (data as any)?.error) {
        throw new Error((data as any)?.error ?? "Chat request failed.");
      }

      if (data.thread_id && data.thread_id !== threadId) {
        setThreadId(data.thread_id);
        localStorage.setItem("core_thread_id", data.thread_id);
      }

      // reload thread messages so we stay consistent with DB
      const useThread = data.thread_id ?? threadId;
      if (useThread) {
        const res2 = await fetch(
          `/api/core/messages?thread_id=${encodeURIComponent(useThread)}&limit=300`,
          { method: "GET" }
        );
        const data2 = await res2.json();
        if (res2.ok) setMessages((data2?.messages ?? []) as ChatMsg[]);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  function newThread() {
    setThreadId("");
    localStorage.removeItem("core_thread_id");
    setMessages([]);
    setError(null);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <SectionHeader
          title="Core Chat"
          subtitle="Memory-backed conversation (threads + messages stored in Supabase)."
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={newThread}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                New Thread
              </button>
            </div>
          }
        />

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Thread ID
            </label>
            <input
              value={threadId}
              onChange={(e) => setThreadId(e.target.value.trim())}
              placeholder="(empty = create new thread)"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
            />
          </div>
          <div className="flex items-end justify-end gap-2">
            <div className="text-xs text-slate-500">
              {loadingThread ? "Loading thread…" : threadId ? "Thread loaded." : "New thread will be created on send."}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div
          ref={listRef}
          className="h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          {messages.length === 0 ? (
            <div className="text-sm text-slate-600">
              No messages yet. Say hello to Core.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={classNames(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                    m.role === "user"
                      ? "ml-auto bg-slate-900 text-white"
                      : "mr-auto bg-white text-slate-900 border border-slate-200"
                  )}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  <div
                    className={classNames(
                      "mt-2 text-[11px] opacity-70",
                      m.role === "user" ? "text-white/70" : "text-slate-500"
                    )}
                  >
                    {m.role}
                    {m.created_at ? ` • ${new Date(m.created_at).toLocaleString()}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='Try: "Remember this: Purple Girl was 3 oz at birth"'
            className="min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            onClick={send}
            disabled={sending}
            className="h-[48px] rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([
    { label: "Available Puppies", value: "—", sub: "status = available" },
    { label: "Reserved Puppies", value: "—", sub: "status = reserved" },
    { label: "Sold Puppies", value: "—", sub: "status = sold" },
    { label: "Litters", value: "—", sub: "total litters" },
  ]);

  const cards = useMemo(
    () => [
      {
        title: "Breeding Program",
        subtitle: "Manage dogs, litters, buyers, and records.",
        href: "/breeding",
        icon: <span className="text-lg">🛡️</span>,
      },
      {
        title: "portal.swvachihuahua",
        subtitle: "Portal admin + customer records.",
        href: "/portal",
        icon: <span className="text-lg">🌐</span>,
      },
      {
        title: "ChihuahuaHQ.com",
        subtitle: "Knowledge hub & resources.",
        href: "/chihuahua-services",
        icon: <span className="text-lg">🏠</span>,
      },
      {
        title: "Chihuahua.Services",
        subtitle: "Guides, training, and digital products.",
        href: "/chihuahua-services",
        icon: <span className="text-lg">📘</span>,
      },
      {
        title: "DogBreederWeb.Site",
        subtitle: "Breeder website platform.",
        href: "#",
        icon: <span className="text-lg">🐾</span>,
      },
      {
        title: "DogBreederDocs.Site",
        subtitle: "Contracts, packets, docs publishing.",
        href: "#",
        icon: <span className="text-lg">📄</span>,
      },
      {
        title: "MyDogPortal.Site",
        subtitle: "Member portal & dog-owner services.",
        href: "#",
        icon: <span className="text-lg">🧩</span>,
      },
      {
        title: "HOSTMYWEB.CO",
        subtitle: "Reseller hosting console.",
        href: "https://hostmyweb.co",
        icon: <span className="text-lg">🖥️</span>,
        tone: "accent" as const,
      },
      {
        title: "Build.io",
        subtitle: "AI site builder & deployments.",
        href: "https://buildlio.site",
        icon: <span className="text-lg">🧠</span>,
      },
      {
        title: "LogoCreator.Site",
        subtitle: "Brand + logo generator.",
        href: "#",
        icon: <span className="text-lg">🎨</span>,
      },
      {
        title: "eSignVirginia.com",
        subtitle: "e-sign workflows & templates.",
        href: "#",
        icon: <span className="text-lg">✍️</span>,
      },
    ],
    []
  );

  // lightweight stat loader (client-side) using anon key (RLS must allow your logged-in admin to read)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sb = supa();

        // Puppies by status
        const statuses = ["available", "reserved", "sold"] as const;
        const counts: Record<string, number> = {};

        for (const st of statuses) {
          const { count, error } = await sb
            .from("puppies")
            .select("id", { count: "exact", head: true })
            .eq("status", st);

          if (error) throw error;
          counts[st] = count ?? 0;
        }

        // Litters total
        const { count: litterCount, error: litErr } = await sb
          .from("litters")
          .select("id", { count: "exact", head: true });

        if (litErr) throw litErr;

        if (cancelled) return;

        setStats([
          { label: "Available Puppies", value: String(counts.available ?? 0), sub: "status = available" },
          { label: "Reserved Puppies", value: String(counts.reserved ?? 0), sub: "status = reserved" },
          { label: "Sold Puppies", value: String(counts.sold ?? 0), sub: "status = sold" },
          { label: "Litters", value: String(litterCount ?? 0), sub: "total litters" },
        ]);
      } catch {
        // keep placeholders; dashboard still renders
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Cherolee Core</h1>
            <p className="mt-1 text-sm text-slate-600">
              Your operations dashboard — stats, quick links, and Core chat.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/breeding"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Breeding Program
            </Link>
            <Link
              href="/portal"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Portal
            </Link>
          </div>
        </div>

        {/* SECTION 1: STATS */}
        <div className="mt-8">
          <SectionHeader
            title="Operational Snapshot"
            subtitle="Quick numbers to keep you oriented."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <StatTile key={s.label} {...s} />
            ))}
          </div>
        </div>

        {/* SECTION 2: CARDS */}
        <div className="mt-10">
          <SectionHeader
            title="Quick Access"
            subtitle="Jump into the areas you use most."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <Card key={c.title} {...c} />
            ))}
          </div>
        </div>

        {/* SECTION 3: CORE CHAT */}
        <div className="mt-10">
          <CoreChat />
        </div>

        <div className="mt-10 text-xs text-slate-500">
          Tip: Keep the same thread to preserve memory. Click “New Thread” when you want a clean slate.
        </div>
      </div>
    </main>
  );
}
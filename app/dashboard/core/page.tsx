// FILE: app/dashboard/core/page.tsx
// CHANGELOG
// - Rebuilt Core Console UI as a true multi-surface Core (NOT “just a chat app”)
// - BOTH modes included: Unified Inbox (all surfaces) + Chat Console (threads/messages)
// - No localStorage anywhere
// - Light, premium UI (no black backgrounds)
// - Fix: guarded polling + AbortError swallowed (no refresh-loop / no dev overlay spam)
// - Works with your existing endpoints:
//   - GET  /api/core/threads?org_key=swva&limit=200&q=&channel=&only_linked=1
//   - GET  /api/core/messages?thread_id=...&org_key=swva&limit=500
//   - POST /api/core/chat  { org_key, thread_id, message }
//
// ANCHOR: CORE_MISSION_CONTROL

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Thread = {
  id: string;
  channel: string;
  external_user_id: string | null;
  display_name: string | null;
  created_at: string;
  buyer_id: string | null;
  puppy_id: string | null;
  org_key: string;
};

type Msg = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  meta: any;
  created_at: string;
  org_key: string;
};

const DEFAULT_ORG = "swva";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function fmtTime(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function isAbortError(err: unknown) {
  if (!err) return false;
  const anyErr = err as any;
  if (anyErr?.name === "AbortError") return true;
  const msg = String(anyErr?.message ?? "");
  return msg.toLowerCase().includes("aborted") || msg.toLowerCase().includes("abort");
}

function surfaceLabel(channel: string) {
  const c = (channel || "").toLowerCase();
  if (c.includes("web")) return "Website Chat";
  if (c.includes("portal")) return "Portal Chat";
  if (c.includes("email")) return "Email";
  if (c.includes("sms") || c.includes("text")) return "Messages";
  if (c.includes("core")) return "Core";
  return channel || "Unknown";
}

function surfaceTone(channel: string) {
  const c = (channel || "").toLowerCase();
  if (c.includes("web")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (c.includes("portal")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (c.includes("email")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (c.includes("sms") || c.includes("text")) return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
  if (c.includes("core")) return "bg-zinc-50 text-zinc-800 border-zinc-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function IconDot({ className }: { className?: string }) {
  return <span className={cx("inline-block h-2.5 w-2.5 rounded-full", className)} />;
}

function Segmented({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={cx(
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export default function CoreConsolePage() {
  // ===== State =====
  const [orgKey, setOrgKey] = useState(DEFAULT_ORG);

  const [mode, setMode] = useState<"inbox" | "chat">("inbox"); // BOTH: unified inbox + chat console
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // filters (applies to unified inbox list & thread list)
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("all");
  const [onlyLinked, setOnlyLinked] = useState(false);

  // composer
  const [composer, setComposer] = useState("");

  // refresh guards
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const safeRefresh = useCallback(async (fn: (signal: AbortSignal) => Promise<void>) => {
    if (inFlightRef.current) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    inFlightRef.current = true;
    setIsRefreshing(true);
    try {
      await fn(ac.signal);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error("refresh error:", err);
        throw err;
      }
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  // ===== API =====
  const loadThreads = useCallback(
    async (signal?: AbortSignal) => {
      setThreadsLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("org_key", orgKey);
        qs.set("limit", "200");
        if (q.trim()) qs.set("q", q.trim());
        if (channel !== "all") qs.set("channel", channel);
        if (onlyLinked) qs.set("only_linked", "1");

        const res = await fetch(`/api/core/threads?${qs.toString()}`, {
          method: "GET",
          signal,
          headers: { "Cache-Control": "no-store" },
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Failed to load threads.");

        const next: Thread[] = Array.isArray(json.threads) ? json.threads : [];
        setThreads(next);

        // keep selection if valid, otherwise pick first
        setSelectedThreadId((prev) => {
          if (prev && next.some((t) => t.id === prev)) return prev;
          return next[0]?.id ?? "";
        });
      } catch (err) {
        if (!isAbortError(err)) console.error("loadThreads error:", err);
      } finally {
        setThreadsLoading(false);
      }
    },
    [orgKey, q, channel, onlyLinked]
  );

  const loadMessages = useCallback(
    async (threadId: string, signal?: AbortSignal) => {
      if (!threadId) {
        setMessages([]);
        return;
      }
      setMessagesLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("thread_id", threadId);
        qs.set("org_key", orgKey);
        qs.set("limit", "500");

        const res = await fetch(`/api/core/messages?${qs.toString()}`, {
          method: "GET",
          signal,
          headers: { "Cache-Control": "no-store" },
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Failed to load messages.");

        const next: Msg[] = Array.isArray(json.messages) ? json.messages : [];
        setMessages(next);
      } catch (err) {
        if (!isAbortError(err)) console.error("loadMessages error:", err);
      } finally {
        setMessagesLoading(false);
      }
    },
    [orgKey]
  );

  const createThread = useCallback(async () => {
    // If your create-thread endpoint differs, change ONLY this fetch URL.
    const res = await fetch(`/api/core/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ org_key: orgKey, channel: "core", display_name: "New Case" }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Failed to create thread.");

    const id = String(json.thread?.id ?? "");
    if (id) {
      setSelectedThreadId(id);
      setMode("chat");
      await safeRefresh(async (signal) => {
        await loadThreads(signal);
        await loadMessages(id, signal);
      });
    }
  }, [orgKey, loadThreads, loadMessages, safeRefresh]);

  const sendMessage = useCallback(async () => {
    const text = composer.trim();
    if (!text || !selectedThreadId) return;

    setComposer("");

    const optimistic: Msg = {
      id: `optimistic-${Date.now()}`,
      thread_id: selectedThreadId,
      role: "user",
      content: text,
      meta: null,
      created_at: new Date().toISOString(),
      org_key: orgKey,
    };
    setMessages((prev) => [...prev, optimistic]);

    // If your send endpoint differs, change ONLY this fetch URL.
    const res = await fetch(`/api/core/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ org_key: orgKey, thread_id: selectedThreadId, message: text }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setComposer(text);
      throw new Error(json?.error ?? "Failed to send message.");
    }

    await safeRefresh(async (signal) => {
      await loadMessages(selectedThreadId, signal);
      await loadThreads(signal); // keep inbox fresh (new activity)
    });
  }, [composer, selectedThreadId, orgKey, loadMessages, loadThreads, safeRefresh]);

  // ===== Lifecycle =====
  useEffect(() => {
    safeRefresh(async (signal) => {
      await loadThreads(signal);
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [loadThreads, safeRefresh]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }
    safeRefresh(async (signal) => {
      await loadMessages(selectedThreadId, signal);
    });
  }, [selectedThreadId, loadMessages, safeRefresh]);

  useEffect(() => {
    let timer: any = null;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;

      if (document.visibilityState !== "visible") {
        timer = setTimeout(tick, 8000);
        return;
      }

      await safeRefresh(async (signal) => {
        await loadThreads(signal);
        if (selectedThreadId) await loadMessages(selectedThreadId, signal);
      });

      timer = setTimeout(tick, 15000);
    };

    tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [selectedThreadId, loadThreads, loadMessages, safeRefresh]);

  // ===== Derived =====
  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );

  const msgCounts = useMemo(() => {
    let user = 0,
      assistant = 0,
      tool = 0,
      system = 0;
    for (const m of messages) {
      if (m.role === "user") user++;
      else if (m.role === "assistant") assistant++;
      else if (m.role === "tool") tool++;
      else system++;
    }
    return { user, assistant, tool, system, total: messages.length };
  }, [messages]);

  const inboxItems = useMemo(() => {
    // “Unified Inbox” is derived from threads until you add a cases/event table.
    // This still matches your reality: Core lives across surfaces (channel).
    const items = [...threads];
    // newest first for inbox
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items;
  }, [threads]);

  // ===== UI =====
  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_0%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(900px_500px_at_90%_10%,rgba(16,185,129,0.14),transparent_55%),linear-gradient(to_bottom,rgba(250,250,250,1),rgba(255,255,255,1))] text-zinc-900">
      {/* Topbar */}
      <div className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm">
              <span className="text-sm font-black">C</span>
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">Cherolee Core</div>
              <div className="text-xs text-zinc-600">
                Multi-surface AI • Unified operations • Controlled execution
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Segmented
              value={mode}
              onChange={(v) => setMode(v as any)}
              items={[
                { id: "inbox", label: "Unified Inbox" },
                { id: "chat", label: "Chat Console" },
              ]}
            />

            <div className="hidden items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm md:flex">
              <span className="opacity-70">Org</span>
              <input
                value={orgKey}
                onChange={(e) => setOrgKey(e.target.value.trim() || DEFAULT_ORG)}
                className="w-24 bg-transparent text-zinc-900 outline-none"
              />
              <span className="opacity-40">|</span>
              <span className="opacity-70">Threads</span>
              <span className="font-semibold">{threads.length}</span>
            </div>

            <button
              onClick={() => createThread().catch((e) => alert(e.message))}
              className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
            >
              New
            </button>

            <button
              onClick={() =>
                safeRefresh(async (signal) => {
                  await loadThreads(signal);
                  if (selectedThreadId) await loadMessages(selectedThreadId, signal);
                }).catch((e) => {
                  if (!isAbortError(e)) alert(e.message);
                })
              }
              className={cx(
                "rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition",
                isRefreshing
                  ? "border border-indigo-200 bg-indigo-50 text-indigo-800"
                  : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
              )}
            >
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-6 px-6 py-6">
        {/* Left rail (Surfaces + filters + quick actions) */}
        <aside className="col-span-12 md:col-span-3">
          <div className="rounded-3xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Surfaces</div>
              <div className="text-xs text-zinc-500">Core lives everywhere</div>
            </div>

            <div className="mt-3 grid gap-2">
              <Link
                href="/dashboard"
                className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Back to Dashboard
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/swva"
                  className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  SWVA Hub
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Reports
                </Link>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="text-xs font-semibold text-zinc-700">Operational filters</div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search (name, id, external user)…"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />

              <div className="mt-2 grid gap-2">
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="all">All surfaces</option>
                  <option value="website">website</option>
                  <option value="portal">portal</option>
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                  <option value="core">core</option>
                </select>

                <label className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm">
                  <span className="text-zinc-700">Only linked</span>
                  <input
                    type="checkbox"
                    checked={onlyLinked}
                    onChange={(e) => setOnlyLinked(e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </label>

                <button
                  onClick={() =>
                    safeRefresh(async (signal) => {
                      await loadThreads(signal);
                    }).catch((e) => {
                      if (!isAbortError(e)) alert(e.message);
                    })
                  }
                  className="rounded-2xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="text-xs font-semibold text-zinc-700">System signals</div>
              <div className="mt-2 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Phase</span>
                  <span className="font-semibold text-zinc-900">1 (live)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Safe mutation</span>
                  <span className="inline-flex items-center gap-2 font-semibold text-emerald-700">
                    <IconDot className="bg-emerald-500" />
                    On
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Polling</span>
                  <span className="font-semibold text-zinc-900">15s</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center (Inbox or Chat) */}
        <section className="col-span-12 md:col-span-6">
          <div className="rounded-3xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            {mode === "inbox" ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">Unified Inbox</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      One place for Website + Portal + Email + Messages. (Derived from threads for now.)
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-2xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
                      Items: {inboxItems.length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 h-[720px] overflow-auto pr-1">
                  {threadsLoading ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                      Loading inbox…
                    </div>
                  ) : inboxItems.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                      No items match your filters.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inboxItems.map((t) => {
                        const active = t.id === selectedThreadId;
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedThreadId(t.id);
                              // Stay in inbox but load inspector on right; also allow jump to chat
                            }}
                            className={cx(
                              "w-full rounded-2xl border p-4 text-left shadow-sm transition",
                              active
                                ? "border-indigo-200 bg-indigo-50"
                                : "border-zinc-200 bg-white hover:bg-zinc-50"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cx(
                                      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                                      surfaceTone(t.channel)
                                    )}
                                  >
                                    {surfaceLabel(t.channel)}
                                  </span>
                                  {t.buyer_id || t.puppy_id ? (
                                    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
                                      Linked
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-500">
                                      Unlinked
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <div className="truncate text-sm font-semibold text-zinc-900">
                                    {t.display_name ?? "Unnamed conversation"}
                                  </div>
                                  <div className="shrink-0 text-xs text-zinc-500">
                                    {fmtTime(t.created_at)}
                                  </div>
                                </div>

                                <div className="mt-1 truncate text-xs text-zinc-500">
                                  Thread: {t.id}
                                </div>
                              </div>

                              <div className="shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedThreadId(t.id);
                                    setMode("chat");
                                  }}
                                  className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                                >
                                  Open chat →
                                </button>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">Chat Console</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Deep thread view. Same Core brain, different surface.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-2xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
                      Messages: {msgCounts.total}
                    </span>
                  </div>
                </div>

                {/* Thread picker inside chat mode */}
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-zinc-700">Active thread</div>
                    <div className="text-xs text-zinc-500">{selectedThreadId ? "Selected" : "None"}</div>
                  </div>

                  <select
                    value={selectedThreadId}
                    onChange={(e) => setSelectedThreadId(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  >
                    {threads.length === 0 ? (
                      <option value="">No threads</option>
                    ) : null}
                    {threads.map((t) => (
                      <option key={t.id} value={t.id}>
                        {(t.display_name ?? "Unnamed") + " — " + surfaceLabel(t.channel)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Messages */}
                <div className="mt-4 h-[520px] overflow-auto rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                  {!selectedThreadId ? (
                    <div className="text-sm text-zinc-600">Select a thread to view messages.</div>
                  ) : messagesLoading && messages.length === 0 ? (
                    <div className="text-sm text-zinc-600">Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-zinc-600">No messages yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((m) => {
                        const isUser = m.role === "user";
                        const isAssistant = m.role === "assistant";
                        const bubbleTone = isUser
                          ? "border-indigo-200 bg-indigo-50"
                          : isAssistant
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-zinc-200 bg-zinc-50";

                        return (
                          <div
                            key={m.id}
                            className={cx("flex", isUser ? "justify-end" : "justify-start")}
                          >
                            <div className={cx("max-w-[78%] rounded-3xl border px-4 py-3", bubbleTone)}>
                              <div className="mb-1 flex items-center justify-between gap-3">
                                <span className="text-[11px] font-semibold text-zinc-700">
                                  {m.role}
                                </span>
                                <span className="text-[11px] text-zinc-500">{fmtTime(m.created_at)}</span>
                              </div>
                              <div className="whitespace-pre-wrap text-sm text-zinc-900">
                                {m.content}
                              </div>

                              {m.meta ? (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-[11px] text-zinc-600">
                                    meta
                                  </summary>
                                  <pre className="mt-2 overflow-auto rounded-2xl border border-zinc-200 bg-white p-2 text-[11px] text-zinc-800">
                                    {typeof m.meta === "string"
                                      ? m.meta
                                      : JSON.stringify(m.meta, null, 2)}
                                  </pre>
                                </details>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <textarea
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        placeholder={selectedThreadId ? "Send to Core…" : "Select a thread first…"}
                        disabled={!selectedThreadId}
                        rows={2}
                        className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage().catch((err) => alert(err.message));
                          }
                        }}
                      />
                      <div className="mt-1 text-[11px] text-zinc-500">Enter to send • Shift+Enter for new line</div>
                    </div>
                    <button
                      onClick={() => sendMessage().catch((e) => alert(e.message))}
                      disabled={!selectedThreadId || !composer.trim()}
                      className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Right inspector (Case / Conversation Inspector) */}
        <aside className="col-span-12 md:col-span-3">
          <div className="rounded-3xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Inspector</div>
              <span className="text-xs text-zinc-500">Operational truth</span>
            </div>

            {!selectedThread ? (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                Select an inbox item or thread to inspect.
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cx(
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                            surfaceTone(selectedThread.channel)
                          )}
                        >
                          {surfaceLabel(selectedThread.channel)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
                          {selectedThread.org_key}
                        </span>
                      </div>

                      <div className="mt-2 truncate text-sm font-semibold text-zinc-900">
                        {selectedThread.display_name ?? "Unnamed conversation"}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        Created: {fmtTime(selectedThread.created_at)}
                      </div>

                      <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 text-[11px] text-zinc-700">
                        Thread ID: {selectedThread.id}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-zinc-700">Entity linkage</div>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600">Buyer</span>
                      <span className="font-semibold text-zinc-900">
                        {selectedThread.buyer_id ? "Linked" : "—"}
                      </span>
                    </div>
                    {selectedThread.buyer_id ? (
                      <div className="rounded-2xl border border-zinc-200 bg-white p-2 text-[11px] text-zinc-700">
                        buyer_id: {selectedThread.buyer_id}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600">Puppy</span>
                      <span className="font-semibold text-zinc-900">
                        {selectedThread.puppy_id ? "Linked" : "—"}
                      </span>
                    </div>
                    {selectedThread.puppy_id ? (
                      <div className="rounded-2xl border border-zinc-200 bg-white p-2 text-[11px] text-zinc-700">
                        puppy_id: {selectedThread.puppy_id}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600">External user</span>
                      <span className="font-semibold text-zinc-900">
                        {selectedThread.external_user_id ?? "—"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href="/dashboard/swva"
                      className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                    >
                      Open SWVA Ops
                    </Link>
                    <Link
                      href="/dashboard/transactions"
                      className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                    >
                      Payments/Trans
                    </Link>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-zinc-700">Core signals</div>
                  <div className="mt-2 grid gap-2">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="text-xs font-semibold text-zinc-800">Safe Fact Engine</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        This inspector is where “why it acted” belongs (confidence, facts applied, rules triggered).
                      </div>
                      <div className="mt-2 text-[11px] text-zinc-500">
                        Next: wire audit_log + tool results into this panel.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="text-xs font-semibold text-zinc-800">Activity</div>
                      <div className="mt-1 text-xs text-zinc-600">
                        Messages: <span className="font-semibold text-zinc-900">{msgCounts.total}</span>{" "}
                        • User: <span className="font-semibold text-zinc-900">{msgCounts.user}</span>{" "}
                        • Assistant: <span className="font-semibold text-zinc-900">{msgCounts.assistant}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
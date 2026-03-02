// FILE: app/dashboard/core/page.tsx
// CHEROLEE CORE — Full Console (Threads + Messages)
//
// CHANGELOG
// - No localStorage.
// - No auto-refresh loops.
// - Eliminated URL replace “thrash” that can cause flicker.
// - Proper AbortController cleanup + abort previous request when a new one starts.
// - Stable selection logic: URL thread (optional) -> otherwise first thread.
//
// ANCHOR:ROUTES
// - Threads:  /api/core/threads?limit=150&org_key=swva
// - Messages: /api/core/messages?thread_id=...&limit=400
// - Chat:     /api/ai/chat  (POST)
//
// ANCHOR:URLSTATE
// - Optional: ?thread=<thread_id> (shareable)

"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function initials(name?: string | null) {
  const s = (name ?? "").trim();
  if (!s) return "CC";
  const words = s.split(/\s+/).slice(0, 2);
  const chars = words.map((w) => w[0]?.toUpperCase() ?? "").join("");
  return chars || "CC";
}

function niceTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function shortId(id: string) {
  if (!id) return "";
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
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

export default function CoreConsolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const ORG_KEY = "swva";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [message, setMessage] = useState<string>("");

  const [loadingThreads, setLoadingThreads] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [onlyLinked, setOnlyLinked] = useState(false);
  const [channelFilter, setChannelFilter] =
    useState<"all" | "dashboard" | "facebook" | "salesiq" | "other">("all");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  const threadsAbortRef = useRef<AbortController | null>(null);
  const msgsAbortRef = useRef<AbortController | null>(null);

  const urlThread = (searchParams.get("thread") ?? "").trim();

  const selectedThread = useMemo<Thread | null>(
    () => threads.find((t) => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );

  const channels = useMemo(() => {
    const set = new Set<string>();
    for (const t of threads) if (t.channel) set.add(t.channel);
    return Array.from(set).sort();
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return threads.filter((t) => {
      if (onlyLinked && !(t.buyer_id || t.puppy_id)) return false;

      const ch = (t.channel || "").toLowerCase();
      if (channelFilter !== "all") {
        if (channelFilter === "other") {
          if (ch === "dashboard" || ch === "facebook" || ch === "salesiq") return false;
        } else {
          if (ch !== channelFilter) return false;
        }
      }

      if (!needle) return true;

      const title = (t.display_name ?? "").toLowerCase();
      const id = t.id.toLowerCase();
      const ext = (t.external_user_id ?? "").toLowerCase();
      return title.includes(needle) || id.includes(needle) || ext.includes(needle) || ch.includes(needle);
    });
  }, [threads, q, onlyLinked, channelFilter]);

  const selectedStats = useMemo(() => {
    const total = messages.length;
    const userCount = messages.filter((m) => m.role === "user").length;
    const assistantCount = messages.filter((m) => m.role === "assistant").length;
    const last = messages[messages.length - 1];
    const lastPreview = last?.content?.trim()?.slice(0, 120) ?? "";
    return { total, userCount, assistantCount, lastPreview };
  }, [messages]);

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
  }

  const setThreadInUrl = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("thread", id);
      else params.delete("thread");
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const loadThreads = useCallback(async () => {
    // abort any in-flight
    threadsAbortRef.current?.abort();
    const ac = new AbortController();
    threadsAbortRef.current = ac;

    setLoadingThreads(true);
    setError(null);

    try {
      const res = await fetch(`/api/core/threads?limit=150&org_key=${encodeURIComponent(ORG_KEY)}`, {
        cache: "no-store",
        signal: ac.signal,
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          (data?.__nonjson ? `Threads API did not return JSON: ${data.__text}` : "") ||
          (data?.__empty ? "Threads API returned an empty response." : "") ||
          "Failed to load threads.";
        throw new Error(msg);
      }

      const list: Thread[] = (data?.threads ?? []) as Thread[];
      if (!mountedRef.current) return;

      setThreads(list);

      // selection:
      // 1) urlThread if exists in list
      // 2) keep previous if still exists
      // 3) first item
      setSelectedThreadId((prev) => {
        if (urlThread && list.some((t) => t.id === urlThread)) return urlThread;
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list.length ? list[0].id : "";
      });

      // normalize URL if empty and we have a default selection
      if (!urlThread && list.length) {
        setThreadInUrl(list[0].id);
      }
      if (urlThread && !list.some((t) => t.id === urlThread)) {
        // urlThread invalid
        setThreadInUrl(list.length ? list[0].id : "");
      }
    } catch (e: any) {
      if (!mountedRef.current) return;
      if (e?.name === "AbortError") return;
      setError(e?.message ?? "Failed to load threads");
    } finally {
      if (mountedRef.current) setLoadingThreads(false);
    }
  }, [ORG_KEY, urlThread, setThreadInUrl]);

  const loadMessages = useCallback(async (threadId: string) => {
    if (!threadId) return;

    // abort any in-flight
    msgsAbortRef.current?.abort();
    const ac = new AbortController();
    msgsAbortRef.current = ac;

    setLoadingMessages(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/core/messages?thread_id=${encodeURIComponent(threadId)}&limit=400`,
        { cache: "no-store", signal: ac.signal }
      );

      const data = await safeJson(res);

      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          (data?.__nonjson ? `Messages API did not return JSON: ${data.__text}` : "") ||
          (data?.__empty ? "Messages API returned an empty response." : "") ||
          "Failed to load messages.";
        throw new Error(msg);
      }

      if (!mountedRef.current) return;
      setMessages((data?.messages ?? []) as Msg[]);
      scrollToBottom();
    } catch (e: any) {
      if (!mountedRef.current) return;
      if (e?.name === "AbortError") return;
      setError(e?.message ?? "Failed to load messages");
    } finally {
      if (mountedRef.current) setLoadingMessages(false);
    }
  }, []);

  async function createThreadAndSend(firstMessage: string) {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        org_key: ORG_KEY,
        message: firstMessage,
        channel: "dashboard",
      }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) ||
        (data?.__nonjson ? `Chat API did not return JSON: ${data.__text}` : "") ||
        (data?.__empty ? "Chat API returned an empty response." : "") ||
        "Failed to create thread";
      throw new Error(msg);
    }

    const newThreadId = (data?.thread_id ?? "") as string;
    if (!newThreadId) throw new Error("Chat API did not return thread_id.");

    setSelectedThreadId(newThreadId);
    setThreadInUrl(newThreadId);

    // refresh lists once
    await loadThreads();
    await loadMessages(newThreadId);
  }

  async function send() {
    const text = message.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    try {
      if (!selectedThreadId) {
        setMessage("");
        await createThreadAndSend(text);
        return;
      }

      // optimistic
      const optimisticId = `optimistic-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          thread_id: selectedThreadId,
          role: "user",
          content: text,
          meta: {},
          created_at: new Date().toISOString(),
          org_key: ORG_KEY,
        },
      ]);
      setMessage("");
      scrollToBottom();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          org_key: ORG_KEY,
          thread_id: selectedThreadId,
          message: text,
          channel: selectedThread?.channel ?? "dashboard",
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          (data?.__nonjson ? `Chat API did not return JSON: ${data.__text}` : "") ||
          (data?.__empty ? "Chat API returned an empty response." : "") ||
          "Chat failed";
        throw new Error(msg);
      }

      // reload once after response
      await loadMessages(selectedThreadId);
      await loadThreads();
    } catch (e: any) {
      setError(e?.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  }

  function newConversation() {
    setSelectedThreadId("");
    setThreadInUrl("");
    setMessages([]);
    setMessage("");
    setError(null);
  }

  function formatThreadTitle(t: Thread) {
    const label = t.display_name?.trim() || "Conversation";
    const channel = t.channel ? ` · ${t.channel}` : "";
    return `${label}${channel}`;
  }

  function RolePill({ role }: { role: Msg["role"] }) {
    const cls =
      role === "user"
        ? "bg-white text-zinc-950"
        : role === "assistant"
        ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/20"
        : role === "tool"
        ? "bg-amber-500/15 text-amber-200 border border-amber-500/20"
        : "bg-zinc-500/15 text-zinc-200 border border-zinc-500/20";

    return (
      <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>
        {role}
      </span>
    );
  }

  useEffect(() => {
    mountedRef.current = true;

    // initial load
    loadThreads();

    return () => {
      mountedRef.current = false;
      threadsAbortRef.current?.abort();
      msgsAbortRef.current?.abort();
    };
  }, [loadThreads]);

  // when thread selection changes -> set URL + load messages (single shot)
  useEffect(() => {
    if (!selectedThreadId) return;
    setThreadInUrl(selectedThreadId);
    loadMessages(selectedThreadId);
  }, [selectedThreadId, loadMessages, setThreadInUrl]);

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

      <div className="relative mx-auto max-w-[1400px] px-4 py-6">
        <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/10 bg-zinc-950/75 px-4 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white/90">CC</span>
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl md:text-2xl font-semibold tracking-tight">
                    Cherolee Core Console
                  </h1>
                  <p className="mt-0.5 text-xs md:text-sm text-zinc-300">
                    Full sessions + message history.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[11px] text-zinc-400">Org</span>
                <span className="text-xs font-semibold text-zinc-100">{ORG_KEY}</span>
                <span className="mx-1 h-4 w-px bg-white/10" />
                <span className="text-[11px] text-zinc-400">Threads</span>
                <span className="text-xs font-semibold text-zinc-100">{threads.length}</span>
              </div>

              <button
                onClick={newConversation}
                className={cx(
                  "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                  "bg-black/40 border border-white/10 text-zinc-100 hover:bg-black/55"
                )}
                title="Start a new conversation"
              >
                New
              </button>

              <button
                onClick={loadThreads}
                disabled={loadingThreads}
                className={cx(
                  "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                  "bg-white text-zinc-950 hover:bg-zinc-100",
                  "disabled:opacity-60 disabled:hover:bg-white"
                )}
              >
                {loadingThreads ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </header>

        <div className="grid grid-cols-12 gap-4">
          {/* Threads */}
          <section className="col-span-12 lg:col-span-4 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-100">Sessions</h2>
                <span className="text-xs text-zinc-400">{filteredThreads.length}</span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="relative">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search (name, channel, id, external user)…"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-white/20"
                  />
                  {q ? (
                    <button
                      onClick={() => setQ("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-zinc-300 hover:bg-white/5"
                      aria-label="Clear search"
                      title="Clear"
                      type="button"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value as any)}
                    className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-white/20"
                    title="Channel filter"
                  >
                    <option value="all">All channels</option>
                    <option value="dashboard">dashboard</option>
                    <option value="facebook">facebook</option>
                    <option value="salesiq">salesiq</option>
                    <option value="other">other</option>
                  </select>

                  {channels.length > 0 ? (
                    <div className="hidden xl:flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="opacity-70">Detected:</span>
                      <span className="truncate max-w-[240px]">{channels.join(", ")}</span>
                    </div>
                  ) : null}

                  <label className="ml-auto inline-flex cursor-pointer select-none items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 hover:bg-black/40">
                    <input
                      type="checkbox"
                      checked={onlyLinked}
                      onChange={(e) => setOnlyLinked(e.target.checked)}
                      className="h-4 w-4 accent-white"
                    />
                    Only linked
                  </label>
                </div>
              </div>
            </div>

            <div className="max-h-[68vh] overflow-auto">
              {loadingThreads ? (
                <div className="p-4 text-sm text-zinc-300">Loading sessions…</div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-4 text-sm text-zinc-300">
                  No matching sessions. Adjust filters or click <span className="text-zinc-100 font-semibold">New</span>.
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {filteredThreads.map((t) => {
                    const active = t.id === selectedThreadId;
                    const name = t.display_name?.trim() || "Conversation";
                    const chip = initials(t.display_name);
                    const linked = Boolean(t.buyer_id || t.puppy_id);

                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => setSelectedThreadId(t.id)}
                          className={cx("w-full text-left px-4 py-3 transition relative", active ? "bg-white/10" : "hover:bg-white/5")}
                          type="button"
                        >
                          <div className={cx("absolute left-0 top-0 h-full w-1 transition", active ? "bg-cyan-400/70" : "bg-transparent")} />

                          <div className="flex items-start gap-3">
                            <div className={cx("mt-0.5 h-10 w-10 rounded-2xl flex items-center justify-center shrink-0", "border border-white/10 bg-black/30")}>
                              <span className="text-xs font-semibold text-zinc-100">{chip}</span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-sm font-semibold text-zinc-100">{name}</div>
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">
                                  {t.channel || "unknown"}
                                </span>
                                {linked ? (
                                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                                    linked
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                                <span>{niceTime(t.created_at)}</span>
                                {t.buyer_id ? <span className="text-emerald-200/90">buyer</span> : null}
                                {t.puppy_id ? <span className="text-emerald-200/90">puppy</span> : null}
                                {t.external_user_id ? (
                                  <span className="truncate max-w-[240px] text-zinc-400/90">ext: {t.external_user_id}</span>
                                ) : null}
                              </div>

                              <div className="mt-1 text-[11px] text-zinc-500 break-all">
                                {shortId(t.id)} <span className="text-zinc-600">·</span> {t.id}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Messages */}
          <section className="col-span-12 lg:col-span-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden flex flex-col">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-zinc-100 truncate">
                      {selectedThread ? formatThreadTitle(selectedThread) : "New conversation (not yet saved)"}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400 break-all">
                    {selectedThreadId ? selectedThreadId : "Send a message to create a new thread."}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                    <div className="text-[10px] text-zinc-400">Messages</div>
                    <div className="text-sm font-semibold text-zinc-100">{selectedStats.total}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                    <div className="text-[10px] text-zinc-400">User</div>
                    <div className="text-sm font-semibold text-zinc-100">{selectedStats.userCount}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                    <div className="text-[10px] text-zinc-400">Assistant</div>
                    <div className="text-sm font-semibold text-zinc-100">{selectedStats.assistantCount}</div>
                  </div>
                </div>
              </div>

              {selectedStats.lastPreview ? (
                <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                  <span className="text-zinc-400">Last:</span>{" "}
                  <span className="text-zinc-200">{selectedStats.lastPreview}</span>
                </div>
              ) : null}
            </div>

            <div className="flex-1 max-h-[62vh] overflow-auto px-4 py-4 space-y-3">
              {loadingMessages ? (
                <div className="text-sm text-zinc-300">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-zinc-300">
                  <div className="text-zinc-100 font-semibold">No messages yet.</div>
                  <div className="mt-1">Type below and press <span className="text-zinc-100 font-semibold">Enter</span> to begin.</div>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === "user";
                  const isAssistant = m.role === "assistant";

                  const bubble = isUser
                    ? "bg-white text-zinc-950"
                    : isAssistant
                    ? "bg-black/35 border border-white/10 text-zinc-50"
                    : "bg-zinc-900/45 border border-white/10 text-zinc-200";

                  const align = isUser ? "justify-end" : "justify-start";

                  return (
                    <div key={m.id} className={cx("flex", align)}>
                      <div className={cx("max-w-[94%] md:max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-sm", bubble)}>
                        <div className="flex items-center justify-between gap-3">
                          <RolePill role={m.role} />
                          <div className="text-[11px] opacity-70 whitespace-nowrap">{niceTime(m.created_at)}</div>
                        </div>
                        <div className="mt-2 whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        {m.meta ? (
                          <div className="mt-2 text-[11px] text-zinc-500/90">
                            <span className="opacity-70">id:</span> {shortId(m.id)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/10 p-4 bg-zinc-950/30">
              <div className="flex flex-col gap-2">
                <div className="flex items-end gap-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!sending) send();
                      }
                    }}
                    rows={2}
                    placeholder="Type to Core…"
                    className={cx(
                      "flex-1 resize-none rounded-3xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none",
                      "focus:border-white/20 focus:bg-black/45",
                      "min-h-[52px] max-h-[180px]"
                    )}
                  />

                  <button
                    onClick={send}
                    disabled={sending}
                    className={cx(
                      "rounded-3xl px-5 py-3 text-sm font-semibold transition shrink-0",
                      "bg-white text-zinc-950 hover:bg-zinc-100",
                      "disabled:opacity-60 disabled:hover:bg-white"
                    )}
                    title="Send (Enter)"
                    type="button"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                  <div>Enter to send · Shift+Enter for new line</div>
                  <button
                    onClick={scrollToBottom}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 text-xs"
                    title="Jump to bottom"
                    type="button"
                  >
                    Bottom ↓
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 text-center text-[11px] text-zinc-500">
          Core Console · sessions from <span className="text-zinc-400">/api/core/threads</span> · messages from{" "}
          <span className="text-zinc-400">/api/core/messages</span> · chat via{" "}
          <span className="text-zinc-400">/api/ai/chat</span>
        </div>
      </div>
    </main>
  );
}
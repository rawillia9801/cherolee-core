"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const STORAGE_KEY = "cherolee_core_selected_thread";

export default function CoreConsolePage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [message, setMessage] = useState<string>("");
  const [loadingThreads, setLoadingThreads] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedThread = useMemo<Thread | null>(
    () => threads.find((t) => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
  }

  function persistSelectedThread(id: string) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  function readPersistedThread(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  }

  async function loadThreads() {
    setLoadingThreads(true);
    setError(null);
    try {
      const res = await fetch("/api/core/threads?limit=150&org_key=swva", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load threads");

      const list: Thread[] = data.threads ?? [];
      setThreads(list);

      // Choose best thread:
      // 1) previously selected if still exists
      // 2) most recent thread
      const saved = readPersistedThread();
      const savedStillExists = saved && list.some((t) => t.id === saved);

      if (!selectedThreadId) {
        if (savedStillExists) {
          setSelectedThreadId(saved);
        } else if (list.length > 0) {
          setSelectedThreadId(list[0].id);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load threads");
    } finally {
      setLoadingThreads(false);
    }
  }

  async function loadMessages(threadId: string) {
    if (!threadId) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(`/api/core/messages?thread_id=${encodeURIComponent(threadId)}&limit=400`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load messages");

      setMessages((data.messages ?? []) as Msg[]);
      scrollToBottom();
    } catch (e: any) {
      setError(e?.message ?? "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }

  // Creates a new thread by sending a first message through /api/ai/chat
  // Your chat route should create a thread if thread_id is omitted.
  async function createThreadAndSend(firstMessage: string) {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: firstMessage,
        channel: "dashboard",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Failed to create thread");

    const newThreadId = data.thread_id as string;
    if (newThreadId) {
      setSelectedThreadId(newThreadId);
      persistSelectedThread(newThreadId);
      await loadThreads();
      await loadMessages(newThreadId);
    }
  }

  async function send() {
    const text = message.trim();
    if (!text) return;

    setSending(true);
    setError(null);

    try {
      // If no thread selected, auto-create a thread with the first message
      if (!selectedThreadId) {
        setMessage("");
        await createThreadAndSend(text);
        return;
      }

      // optimistic user message
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
          org_key: "swva",
        },
      ]);
      setMessage("");
      scrollToBottom();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: selectedThreadId,
          message: text,
          channel: selectedThread?.channel ?? "dashboard",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Chat failed");

      // Reload from DB to include assistant reply + tool messages
      await loadMessages(selectedThreadId);
      await loadThreads();
    } catch (e: any) {
      setError(e?.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      persistSelectedThread(selectedThreadId);
      loadMessages(selectedThreadId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  function formatThreadTitle(t: Thread) {
    const label = t.display_name?.trim() || "Conversation";
    const channel = t.channel ? `· ${t.channel}` : "";
    return `${label} ${channel}`;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Cherolee Core Console</h1>
            <p className="mt-1 text-sm text-zinc-300">
              Live sessions, message history, and direct conversation with Core.
            </p>
          </div>

          <button
            onClick={loadThreads}
            disabled={loadingThreads}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            {loadingThreads ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-12 gap-4">
          {/* Threads */}
          <section className="col-span-12 md:col-span-4 rounded-3xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-sm font-semibold text-zinc-100">Sessions</h2>
              <span className="text-xs text-zinc-400">{threads.length}</span>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              {threads.length === 0 ? (
                <div className="p-4 text-sm text-zinc-300">
                  No sessions yet. Type a message on the right and Core will create one automatically.
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {threads.map((t) => {
                    const active = t.id === selectedThreadId;
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => setSelectedThreadId(t.id)}
                          className={[
                            "w-full text-left px-4 py-3 transition",
                            active ? "bg-white/10" : "hover:bg-white/5",
                          ].join(" ")}
                        >
                          <div className="text-sm font-medium text-zinc-100">{formatThreadTitle(t)}</div>
                          <div className="mt-1 text-xs text-zinc-400">
                            {new Date(t.created_at).toLocaleString()}
                            {t.buyer_id ? " · buyer linked" : ""}
                            {t.puppy_id ? " · puppy linked" : ""}
                          </div>
                          <div className="mt-1 text-[11px] text-zinc-500 break-all">{t.id}</div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Messages */}
          <section className="col-span-12 md:col-span-8 rounded-3xl border border-white/10 bg-white/5 flex flex-col">
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-sm font-semibold text-zinc-100">
                {selectedThread ? formatThreadTitle(selectedThread) : "New conversation"}
              </div>
              <div className="mt-1 text-xs text-zinc-400">{selectedThreadId || "No thread selected yet."}</div>
            </div>

            <div className="flex-1 max-h-[62vh] overflow-auto px-4 py-4 space-y-3">
              {loadingMessages ? (
                <div className="text-sm text-zinc-300">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-zinc-300">No messages yet. Send one to begin.</div>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === "user";
                  const isAssistant = m.role === "assistant";

                  const bubble =
                    isUser
                      ? "bg-white text-zinc-950"
                      : isAssistant
                      ? "bg-black/40 border border-white/10 text-zinc-50"
                      : "bg-zinc-900/50 border border-white/10 text-zinc-200";

                  const align = isUser ? "justify-end" : "justify-start";

                  return (
                    <div key={m.id} className={`flex ${align}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${bubble}`}>
                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        <div className="mt-2 text-[11px] opacity-70">
                          {m.role} · {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!sending) send();
                    }
                  }}
                  placeholder="Type to Core…"
                  className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
                />
                <button
                  onClick={send}
                  disabled={sending}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>

              <div className="mt-2 text-xs text-zinc-400">Enter to send · Shift+Enter for new line</div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
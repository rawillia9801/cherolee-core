"use client";

/*
CHANGELOG
- FIX: Stop using res.json() directly (crashes if /api/ai/chat returns non-JSON or streams)
- NEW: safeJson() helper + better error surfacing
- NEW: Explicit Accept: application/json
*/

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  created_at: string;
  meta?: any;
};

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) return { __empty: true, __text: "" };
  try {
    return JSON.parse(text);
  } catch {
    return { __nonjson: true, __text: text.slice(0, 8000) };
  }
}

export default function CoreChat() {
  const [threadId, setThreadId] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<string>("");

  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  async function loadMessages(tid: string) {
    if (!tid) return;
    setStatus("Loading thread…");
    try {
      const res = await fetch(`/api/core/messages?thread_id=${encodeURIComponent(tid)}&limit=200`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const data = await safeJson(res);
      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          (data?.__nonjson ? `Messages API did not return JSON:\n${data.__text}` : "") ||
          (data?.__empty ? "Messages API returned an empty response." : "") ||
          "Failed to load messages.";
        throw new Error(msg);
      }

      setMessages((data?.messages ?? []) as Msg[]);
      setStatus("Thread loaded.");
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to load.");
    }
  }

  useEffect(() => {
    if (threadId) loadMessages(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function onNewThread() {
    setThreadId("");
    setMessages([]);
    setStatus("New thread ready.");
  }

  async function onSend() {
    const text = input.trim();
    if (!text) return;

    setSending(true);
    setStatus("");

    // optimistic UI
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      thread_id: threadId || "pending",
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          thread_id: threadId || null,
          message: text,
          channel: "dashboard",
          external_user_id: null,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          (data?.__nonjson ? `Chat API did not return JSON:\n${data.__text}` : "") ||
          (data?.__empty ? "Chat API returned an empty response." : "") ||
          "Chat request failed.";
        throw new Error(msg);
      }

      const newThreadId = String(data?.thread_id ?? "");
      if (newThreadId && newThreadId !== threadId) setThreadId(newThreadId);

      // Reload from DB so the screen matches canonical stored history
      if (newThreadId) {
        await loadMessages(newThreadId);
      } else if (threadId) {
        await loadMessages(threadId);
      }
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to send.");
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          thread_id: threadId || "pending",
          role: "assistant",
          content: "I hit a temporary issue generating a response. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Core Chat</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Memory-backed conversation (threads + messages stored in Supabase).
          </p>
        </div>

        <button
          onClick={onNewThread}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 md:w-auto"
        >
          New Thread
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="text-xs font-semibold tracking-wide text-zinc-500">THREAD ID</div>
          <input
            value={threadId}
            onChange={(e) => setThreadId(e.target.value.trim())}
            placeholder="(empty = create new thread)"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-300"
          />
        </div>
        <div className="flex items-end justify-start md:justify-end">
          <div className="text-sm text-zinc-500">{status}</div>
        </div>
      </div>

      <div className="mt-5 h-[420px] overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        {messages.length === 0 ? (
          <div className="text-sm text-zinc-500">No messages yet.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const isUser = m.role === "user";
              const bubble =
                isUser
                  ? "ml-auto bg-zinc-900 text-white"
                  : "mr-auto bg-white text-zinc-950 border border-zinc-200";
              return (
                <div key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${bubble}`}>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  <div className={`mt-2 text-[11px] ${isUser ? "text-zinc-300" : "text-zinc-500"}`}>
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try: "Remember this: Purple Girl was 3 oz at birth"'
          className="h-12 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-zinc-300"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />
        <button
          disabled={!canSend}
          onClick={onSend}
          className="h-12 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>

      <div className="mt-2 text-xs text-zinc-500">Enter to send · Shift+Enter for new line</div>
    </div>
  );
}
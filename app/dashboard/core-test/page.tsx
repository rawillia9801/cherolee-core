"use client";

/*
CHANGELOG
- FIX: Stop using res.json() directly (crashes if /api/ai/chat returns non-JSON or streams)
- NEW: safeJson() helper (same behavior as core console)
- NEW: Explicit Accept: application/json so the server knows we want JSON
*/

import { useState } from "react";

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) return { __empty: true, __text: "" };
  try {
    return JSON.parse(text);
  } catch {
    return { __nonjson: true, __text: text.slice(0, 8000) };
  }
}

export default function CoreTestPage() {
  const [threadId, setThreadId] = useState("");
  const [message, setMessage] = useState("Hello Core");
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          thread_id: threadId || undefined,
          message,
          channel: "dashboard",
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          (data?.__nonjson ? `Chat API did not return JSON:\n${data.__text}` : "") ||
          (data?.__empty ? "Chat API returned an empty response." : "") ||
          `Chat request failed (${res.status}).`;
        throw new Error(msg);
      }

      setLog(data);
      if (data?.thread_id) setThreadId(String(data.thread_id));
    } catch (e: any) {
      setLog({ ok: false, error: e?.message ?? "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 p-6">
      <h1 className="text-2xl font-semibold">Core API Test</h1>
      <p className="mt-2 text-sm text-zinc-300">
        This page sends POST requests to{" "}
        <code className="text-zinc-100">/api/ai/chat</code>.
      </p>

      <div className="mt-6 grid gap-3 max-w-2xl">
        <label className="text-sm text-zinc-300">Thread ID (auto-fills)</label>
        <input
          value={threadId}
          onChange={(e) => setThreadId(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm"
          placeholder="(empty = create new thread)"
        />

        <label className="text-sm text-zinc-300">Message</label>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm"
        />

        <button
          onClick={send}
          disabled={loading}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send"}
        </button>

        <pre className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 text-xs overflow-auto">
          {log ? JSON.stringify(log, null, 2) : "No response yet."}
        </pre>
      </div>
    </main>
  );
}
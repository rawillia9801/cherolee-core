"use client";

import React, { memo, useCallback, useState } from "react";

type ChatComposerProps = {
  onSend: (message: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
};

function ChatComposerInner({
  onSend,
  disabled = false,
  placeholder = "Type to Core...",
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    const text = value.trim();
    if (!text || sending || disabled) return;

    try {
      setSending(true);
      await onSend(text);
      setValue("");
    } finally {
      setSending(false);
    }
  }, [value, sending, disabled, onSend]);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        await handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-zinc-200 bg-white p-3">
      <div className="flex items-end gap-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={placeholder}
          disabled={disabled || sending}
          className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || sending || !value.trim()}
          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
      <div className="mt-2 text-[11px] text-zinc-500">
        Enter to send · Shift+Enter for new line
      </div>
    </div>
  );
}

export const ChatComposer = memo(ChatComposerInner);
// FILE: app/api/ai/chat/route.ts
// CHEROLEE CORE — Phase B (Anthropic Intelligence + Memory + Fact Extraction)

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { ToolCall } from "@/lib/core/types";
import { dispatchTool } from "@/lib/core/dispatchTool";
import { applyFactsSafely, type FactExtractResult } from "@/lib/core/facts";

const CORE_OWNER_ID = process.env.CORE_OWNER_ID!;
const ORG_KEY = "swva";

type DbMsg = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  meta: any;
  created_at: string;
  org_key: string;
};

function assertEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function toAnthropicMessages(history: DbMsg[]) {
  const filtered = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const role: "user" | "assistant" = m.role === "user" ? "user" : "assistant";
      return {
        role,
        content: [{ type: "text" as const, text: String(m.content ?? "") }],
      };
    });

  return filtered;
}

async function callAnthropicText(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: Array<{ type: "text"; text: string }> }>;
}) {
  const apiKey = assertEnv("ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      temperature: 0.2,
      system: opts.system,
      messages: opts.messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Anthropic error:", data);
    throw new Error(data?.error?.message ?? "Anthropic request failed");
  }

  const text = Array.isArray(data?.content)
    ? data.content
        .filter((b: any) => b?.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim()
    : "";

  return text || "I’m here — tell me what you want to do next.";
}

async function callAnthropicJson(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: Array<{ type: "text"; text: string }> }>;
}) {
  const apiKey = assertEnv("ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      temperature: 0,
      system: opts.system,
      messages: opts.messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Anthropic error:", data);
    throw new Error(data?.error?.message ?? "Anthropic request failed");
  }

  const raw = Array.isArray(data?.content)
    ? data.content
        .filter((b: any) => b?.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim()
    : "";

  // Must be JSON only
  try {
    return JSON.parse(raw) as FactExtractResult;
  } catch (e) {
    console.error("Failed to parse JSON from Claude:", raw);
    return { facts: [] };
  }
}

export async function POST(req: Request) {
  const supabase = createServiceClient();
  const body = await req.json();

  const message = (body?.message ?? "").trim();
  const channel = body?.channel ?? "dashboard";
  const external_user_id = body?.external_user_id ?? null;
  let thread_id = body?.thread_id ?? null;

  if (!message) {
    return NextResponse.json({ reply: "Tell me what you need." }, { status: 400 });
  }

  // 1) Create thread if needed
  if (!thread_id) {
    const { data: newThread, error: threadError } = await supabase
      .from("chat_threads")
      .insert({
        owner_id: CORE_OWNER_ID,
        channel,
        external_user_id,
        display_name: "Core Conversation",
        org_key: ORG_KEY,
      })
      .select("id")
      .single();

    if (threadError) {
      console.error(threadError);
      return NextResponse.json({ error: "Thread creation failed." }, { status: 500 });
    }
    thread_id = newThread.id;
  }

  // 2) Insert user message
  const { error: insertUserErr } = await supabase.from("chat_messages").insert({
    thread_id,
    role: "user",
    content: message,
    meta: {},
    org_key: ORG_KEY,
  });

  if (insertUserErr) {
    console.error(insertUserErr);
    return NextResponse.json({ error: "Failed to store message." }, { status: 500 });
  }

  // 3) Load recent messages for memory
  const { data: recentMsgs, error: recentErr } = await supabase
    .from("chat_messages")
    .select("id, thread_id, role, content, meta, created_at, org_key")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true })
    .limit(60);

  if (recentErr) console.error(recentErr);

  const anthropicMessages = toAnthropicMessages((recentMsgs ?? []) as DbMsg[]);

  // 4) (Optional) rule-based tool calls still supported
  const toolCalls: ToolCall[] = [];
  if (message.toLowerCase().startsWith("test litter")) {
    toolCalls.push({
      tool: "create_litter",
      args: {
        litter_name: "Test Litter",
        dam_id: "REPLACE_WITH_REAL_DAM_ID",
        sire_id: null,
        dob: new Date().toISOString().slice(0, 10),
        birth_time: null,
        registry_type: null,
        notes: "Created from Core chat test.",
      },
    });
  }

  const tool_results: any[] = [];
  for (const call of toolCalls) tool_results.push(await dispatchTool(call));

  // 5) Extract facts (JSON-only) and apply safely
  let fact_apply: any = null;
  try {
    const factSystem = `
Return JSON ONLY. No commentary.

Task:
Extract recordable facts from the conversation that should be saved as structured business data.

Allowed fact kinds:
1) puppy_birth_weight_oz:
   - puppy_name (string)
   - birth_weight_oz (number)
   - confidence (0..1)
   - source_text (string)

Rules:
- Only output facts stated explicitly by the user.
- If uncertain about the puppy name or value, lower confidence.
- If no facts, return {"facts": []}
- Output must be valid JSON.

JSON shape:
{"facts":[...]}
`.trim();

    const extracted = await callAnthropicJson({
      system: factSystem,
      messages: anthropicMessages,
    });

    fact_apply = await applyFactsSafely(thread_id, extracted?.facts ?? []);
  } catch (e: any) {
    console.error("Fact extract/apply error:", e);
    fact_apply = { applied: [], skipped: [], thread_id };
  }

  // 6) Normal assistant reply (human-friendly)
  const chatSystem = `
You are "Cherolee Core" for SWVA Chihuahua / Chihuahua.Services.

Voice:
- Clear, confident, professional, calm.
- Not developer-y. No talk about code, databases, or APIs.

Rules:
- Use the conversation history.
- Do NOT invent weights, dates, prices, buyer names, or payment statuses.

If you successfully recorded a fact, confirm it plainly.
If the user asked a question, answer it.
Keep it tight and useful.
`.trim();

  let reply = "";
  try {
    const baseReply = await callAnthropicText({
      system: chatSystem,
      messages: anthropicMessages,
    });

    const appliedCount = Array.isArray(fact_apply?.applied) ? fact_apply.applied.length : 0;

    if (appliedCount > 0) {
      // Prepend a clean confirmation line
      const confirmations = fact_apply.applied
        .map((a: any) => {
          if (a.kind === "puppy_birth_weight_oz") {
            return `Recorded: ${a.puppy_name} birth weight set to ${a.set_birth_weight_oz} oz.`;
          }
          return "Recorded an update.";
        })
        .join(" ");

      reply = `${confirmations}\n\n${baseReply}`;
    } else {
      reply = baseReply;
    }
  } catch (e: any) {
    console.error(e);
    reply = "I hit a temporary issue generating a response. Please try again.";
  }

  // 7) Insert assistant reply with meta (tool + fact results)
  const { error: insertAsstErr } = await supabase.from("chat_messages").insert({
    thread_id,
    role: "assistant",
    content: reply,
    meta: { tool_results, fact_apply },
    org_key: ORG_KEY,
  });

  if (insertAsstErr) {
    console.error(insertAsstErr);
    return NextResponse.json({ error: "Failed to store assistant reply." }, { status: 500 });
  }

  return NextResponse.json({
    thread_id,
    reply,
    tool_results,
    fact_apply,
  });
}
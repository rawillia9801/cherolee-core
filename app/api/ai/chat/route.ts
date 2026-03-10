// FILE: app/api/ai/chat/route.ts
// CHEROLEE CORE — Phase B (Anthropic Intelligence + Memory + Fact Extraction + Puppy Ops)
//
// CHANGELOG
// - FIX: "Add <puppy>" now performs a REAL DB write via dispatchTool (no more fake success).
// - FIX: Assistant is forbidden from claiming a puppy was added unless we have a real puppy id.
// - ADD: Lightweight command router for:
//   - Add <Name> (creates puppy, defaults status=available)
//   - Available Puppies / How many puppies are available (reads from DB)
// - ADD: Meta debug fields saved with assistant messages (tool results + counts)
//
// NOTE
// - No localStorage (server route).
// - Uses createServiceClient() because your project already uses service role on the server.
// - If your dispatchTool doesn't have "create_puppy" yet, add it there (next file).

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { ToolCall } from "@/lib/core/types";
import { dispatchTool } from "@/lib/core/dispatchTool";
import { applyFactsSafely, type FactExtractResult } from "@/lib/core/facts";
import { listAvailablePuppies } from "@/lib/core/puppies";

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
  return history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: [{ type: "text" as const, text: String(m.content ?? "") }],
    }));
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

  try {
    return JSON.parse(raw) as FactExtractResult;
  } catch {
    console.error("Failed to parse JSON from Claude:", raw);
    return { facts: [] };
  }
}

function formatMoney(v: any) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0);
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function looksLikePuppyAvailabilityQuestion(text: string) {
  const s = text.trim().toLowerCase();
  return (
    (/\bhow many\b/.test(s) && (/\bpupp(y|ies)\b/.test(s) || /\bfor sale\b/.test(s) || /\bavailable\b/.test(s))) ||
    /\bavailable puppies\b/.test(s) ||
    /\bpuppies for sale\b/.test(s) ||
    (/\blist\b/.test(s) && /\bpupp(y|ies)\b/.test(s)) ||
    (/\bnames?\b/.test(s) && /\bprice\b/.test(s) && /\bpupp(y|ies)\b/.test(s))
  );
}

/**
 * Command: Add <Name>
 * Examples:
 * - "Add Aurora"
 * - "add aurora"
 * - "add puppy Aurora"
 * - "add puppy: Aurora"
 */
function parseAddPuppyCommand(text: string): { name: string } | null {
  const s = text.trim();

  // add puppy: Aurora
  let m = s.match(/^\s*add\s+(?:puppy\s*)?:?\s*([A-Za-z0-9][A-Za-z0-9 _.-]{0,60})\s*$/i);
  if (m?.[1]) {
    const name = m[1].trim();
    if (name.length >= 1) return { name };
  }

  return null;
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

  // 3) HARD command router (REAL operations only)
  // 3A) Add puppy (REAL tool call + proof of write)
  const addCmd = parseAddPuppyCommand(message);
  if (addCmd) {
    const toolCall: ToolCall = {
      tool: "create_puppy",
      args: {
        org_key: ORG_KEY,
        owner_id: CORE_OWNER_ID,
        name: addCmd.name,
        status: "available",
      },
    };

    const toolResult = await dispatchTool(toolCall);

    // PROOF RULE: we only say "added" if ok + id exists.
    const ok = !!(toolResult as any)?.ok;
    const puppyId = (toolResult as any)?.data?.id ?? (toolResult as any)?.puppy?.id ?? null;

    let reply = "";
    if (ok && puppyId) {
      reply = `Added **${addCmd.name}** to puppy records and marked as **available**. (id: ${puppyId})`;
    } else {
      const errMsg =
        (toolResult as any)?.error ||
        (toolResult as any)?.message ||
        "Create puppy failed (no id returned).";
      reply = `I could not add **${addCmd.name}**. ${errMsg}`;
    }

    await supabase.from("chat_messages").insert({
      thread_id,
      role: "assistant",
      content: reply,
      meta: {
        used_tool: "create_puppy",
        tool_calls: [toolCall],
        tool_results: [toolResult],
        proof: { ok, puppyId },
      },
      org_key: ORG_KEY,
    });

    return NextResponse.json({
      thread_id,
      reply,
      tool_results: [toolResult],
      fact_apply: null,
    });
  }

  // 3B) Availability questions (REAL DB read)
  if (looksLikePuppyAvailabilityQuestion(message)) {
    try {
      const pups = await listAvailablePuppies({ supabase, owner_id: CORE_OWNER_ID, org_key: ORG_KEY });
      const count = pups.length;

      const reply =
        count === 0
          ? "You currently have 0 puppies marked as **available**."
          : [
              `You currently have **${count}** puppies marked as **available**:`,
              ...pups.map((p, i) => {
                const nm = (p.name ?? "").trim() || `Puppy ${i + 1}`;
                const sex = (p.sex ?? "").trim();
                const color = (p.color ?? "").trim();
                const bits = [sex && `(${sex})`, color && color].filter(Boolean).join(" ");
                const label = bits ? `${nm} ${bits}` : nm;
                return `• ${label} — ${formatMoney(p.price)}`;
              }),
            ].join("\n");

      await supabase.from("chat_messages").insert({
        thread_id,
        role: "assistant",
        content: reply,
        meta: {
          used_tool: "listAvailablePuppies",
          counts: { available: count },
          sample_ids: pups.slice(0, 10).map((p: any) => p?.id).filter(Boolean),
        },
        org_key: ORG_KEY,
      });

      return NextResponse.json({
        thread_id,
        reply,
        tool_results: [],
        fact_apply: null,
      });
    } catch (e: any) {
      console.error("Puppy availability query failed:", e);
      const reply = "I couldn’t pull the puppy list right now. Try again in a moment.";

      await supabase.from("chat_messages").insert({
        thread_id,
        role: "assistant",
        content: reply,
        meta: { error: e?.message ?? String(e), used_tool: "listAvailablePuppies" },
        org_key: ORG_KEY,
      });

      return NextResponse.json({ thread_id, reply }, { status: 200 });
    }
  }

  // 4) Load recent messages for memory
  const { data: recentMsgs, error: recentErr } = await supabase
    .from("chat_messages")
    .select("id, thread_id, role, content, meta, created_at, org_key")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true })
    .limit(60);

  if (recentErr) console.error(recentErr);

  const anthropicMessages = toAnthropicMessages((recentMsgs ?? []) as DbMsg[]);

  // 5) Optional rule-based tool calls (kept)
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

  // 6) Extract facts (JSON-only) and apply safely
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

  // 7) Normal assistant reply (human-friendly)
  const chatSystem = `
You are "Cherolee Core" for SWVA Chihuahua / Chihuahua.Services.

Voice:
- Clear, confident, professional, calm.
- Not developer-y. No talk about code, databases, or APIs.

Rules:
- Use the conversation history.
- Do NOT invent weights, dates, prices, buyer names, or payment statuses.
- CRITICAL: Do NOT claim you created/updated a record unless a tool result proves it.

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

  // 8) Insert assistant reply with meta
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
// FILE: app/api/ai/chat/route.ts
// CHEROLEE CORE — Phase B (Anthropic Intelligence + Memory + Fact Extraction + Puppy Ops + Inventory)
//
// CHANGELOG
// - KEEP: thread creation validation + useful error reporting
// - KEEP: add puppy + available puppies
// - ADD: add inventory command router
// - ADD: list inventory / what inventory do I have
// - ADD: adjust inventory command router
// - FIX: assistant prompt blocks fake function/tool markup
// - FIX: if an operational action is not wired, assistant should say so plainly
// - FIX: local route typing now supports inventory tool calls without breaking build

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { ToolCall } from "@/lib/core/types";
import { dispatchTool } from "@/lib/core/dispatchTool";
import { applyFactsSafely, type FactExtractResult } from "@/lib/core/facts";
import { listAvailablePuppies } from "@/lib/core/puppies";
import { listInventory } from "@/lib/core/inventory";

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

type AddInventoryToolCall = {
  tool: "add_inventory";
  args: {
    owner_id: string;
    name: string;
    quantity: number | null;
    cost: number | null;
  };
};

type AdjustInventoryToolCall = {
  tool: "adjust_inventory";
  args: {
    owner_id: string;
    name: string;
    delta: number;
    notes: string | null;
  };
};

type RouteToolCall = ToolCall | AddInventoryToolCall | AdjustInventoryToolCall;

function getCoreOwnerId() {
  const id = process.env.CORE_OWNER_ID?.trim();
  if (!id) {
    throw new Error("Missing env var: CORE_OWNER_ID");
  }
  return id;
}

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

async function dispatchAnyTool(call: RouteToolCall) {
  return dispatchTool(call as ToolCall);
}

function formatMoney(v: any) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0);
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function looksLikePuppyAvailabilityQuestion(text: string) {
  const s = text.trim().toLowerCase();
  return (
    (/\bhow many\b/.test(s) &&
      (/\bpupp(y|ies)\b/.test(s) || /\bfor sale\b/.test(s) || /\bavailable\b/.test(s))) ||
    /\bavailable puppies\b/.test(s) ||
    /\bpuppies for sale\b/.test(s) ||
    (/\blist\b/.test(s) && /\bpupp(y|ies)\b/.test(s)) ||
    (/\bnames?\b/.test(s) && /\bprice\b/.test(s) && /\bpupp(y|ies)\b/.test(s))
  );
}

function looksLikeInventoryListQuestion(text: string) {
  const s = text.trim().toLowerCase();
  return (
    /\bwhat inventory do i have\b/.test(s) ||
    /\blist inventory\b/.test(s) ||
    /\bshow inventory\b/.test(s) ||
    /\bwhat do i have in inventory\b/.test(s) ||
    (/\bhow many\b/.test(s) && /\binventory\b/.test(s))
  );
}

function parseAddPuppyCommand(text: string): { name: string } | null {
  const s = text.trim();
  const m = s.match(/^\s*add\s+(?:puppy\s*)?:?\s*([A-Za-z0-9][A-Za-z0-9 _.-]{0,60})\s*$/i);
  if (m?.[1]) {
    const name = m[1].trim();
    if (name.length >= 1) return { name };
  }
  return null;
}

function parseAddInventoryCommand(text: string): {
  name: string;
  quantity: number | null;
  cost: number | null;
} | null {
  const s = text.trim();

  // "add 100 bubble mailers cost 0.18 each"
  let m = s.match(
    /^\s*add\s+(\d+)\s+(.+?)\s+cost\s+\$?(\d+(?:\.\d{1,2})?)\s*(?:each)?\s*$/i
  );
  if (m) {
    return {
      quantity: Number(m[1]),
      name: m[2].trim(),
      cost: Number(m[3]),
    };
  }

  // "add inventory puppy pads quantity 24 cost 8.99"
  m = s.match(
    /^\s*add\s+inventory\s+(.+?)\s+quantity\s+(\d+)\s+cost\s+\$?(\d+(?:\.\d{1,2})?)\s*$/i
  );
  if (m) {
    return {
      name: m[1].trim(),
      quantity: Number(m[2]),
      cost: Number(m[3]),
    };
  }

  // "add inventory puppy pads"
  m = s.match(/^\s*add\s+inventory\s+(.+?)\s*$/i);
  if (m) {
    return {
      name: m[1].trim(),
      quantity: 0,
      cost: 0,
    };
  }

  return null;
}

function parseAdjustInventoryCommand(text: string): {
  name: string;
  delta: number;
  notes?: string;
} | null {
  const s = text.trim();

  // "adjust inventory puppy pads -2 damaged"
  const m = s.match(/^\s*adjust\s+inventory\s+(.+?)\s+([+-]?\d+)\s*(.*)$/i);
  if (!m) return null;

  return {
    name: m[1].trim(),
    delta: Number(m[2]),
    notes: m[3]?.trim() || undefined,
  };
}

async function createThreadWithFallbacks(opts: {
  supabase: any;
  owner_id: string;
  channel: string;
  external_user_id: string | null;
  org_key: string;
}) {
  const { supabase, owner_id, channel, external_user_id, org_key } = opts;

  const attempts: Array<Record<string, any>> = [
    {
      owner_id,
      channel,
      external_user_id,
      display_name: "Core Conversation",
      org_key,
    },
    {
      owner_id,
      channel,
      external_user_id,
      title: "Core Conversation",
      org_key,
    },
    {
      owner_id,
      channel,
      org_key,
    },
    {
      owner_id,
      org_key,
    },
  ];

  let lastError: any = null;

  for (const payload of attempts) {
    const { data, error } = await supabase
      .from("chat_threads")
      .insert(payload)
      .select("id")
      .single();

    if (!error && data?.id) {
      return { id: data.id };
    }

    lastError = error;
    console.error("chat_threads insert attempt failed:", { payload, error });
  }

  const msg =
    lastError?.message ||
    lastError?.details ||
    lastError?.hint ||
    "Unknown chat_threads insert error";

  throw new Error(msg);
}

export async function POST(req: Request) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();

    const CORE_OWNER_ID = getCoreOwnerId();

    const message = (body?.message ?? "").trim();
    const channel = body?.channel ?? "dashboard";
    const external_user_id = body?.external_user_id ?? null;
    let thread_id = body?.thread_id ?? null;

    if (!message) {
      return NextResponse.json({ reply: "Tell me what you need." }, { status: 400 });
    }

    // 1) Create thread if needed
    if (!thread_id) {
      try {
        const newThread = await createThreadWithFallbacks({
          supabase,
          owner_id: CORE_OWNER_ID,
          channel,
          external_user_id,
          org_key: ORG_KEY,
        });

        thread_id = newThread.id;
      } catch (threadErr: any) {
        console.error("Thread creation failed:", threadErr);
        return NextResponse.json(
          {
            error: `Thread creation failed: ${threadErr?.message ?? "Unknown error"}`,
          },
          { status: 500 }
        );
      }
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
      return NextResponse.json(
        { error: `Failed to store message: ${insertUserErr.message}` },
        { status: 500 }
      );
    }

    // 3A) Add puppy
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

      const toolResult = await dispatchAnyTool(toolCall);

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

    // 3B) Add inventory
    const addInventoryCmd = parseAddInventoryCommand(message);
    if (addInventoryCmd) {
      const toolCall: AddInventoryToolCall = {
        tool: "add_inventory",
        args: {
          owner_id: CORE_OWNER_ID,
          name: addInventoryCmd.name,
          quantity: addInventoryCmd.quantity,
          cost: addInventoryCmd.cost,
        },
      };

      const toolResult = await dispatchAnyTool(toolCall);
      const ok = !!(toolResult as any)?.ok;
      const inventoryId = (toolResult as any)?.data?.id ?? null;

      let reply = "";
      if (ok && inventoryId) {
        reply = `Added **${addInventoryCmd.name}** to inventory with quantity **${addInventoryCmd.quantity ?? 0}** at **${formatMoney(addInventoryCmd.cost ?? 0)}** each.`;
      } else {
        const errMsg =
          (toolResult as any)?.error ||
          (toolResult as any)?.message ||
          "Add inventory failed.";
        reply = `I could not add **${addInventoryCmd.name}** to inventory. ${errMsg}`;
      }

      await supabase.from("chat_messages").insert({
        thread_id,
        role: "assistant",
        content: reply,
        meta: {
          used_tool: "add_inventory",
          tool_calls: [toolCall],
          tool_results: [toolResult],
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

    // 3C) Adjust inventory
    const adjustInventoryCmd = parseAdjustInventoryCommand(message);
    if (adjustInventoryCmd) {
      const toolCall: AdjustInventoryToolCall = {
        tool: "adjust_inventory",
        args: {
          owner_id: CORE_OWNER_ID,
          name: adjustInventoryCmd.name,
          delta: adjustInventoryCmd.delta,
          notes: adjustInventoryCmd.notes ?? null,
        },
      };

      const toolResult = await dispatchAnyTool(toolCall);
      const ok = !!(toolResult as any)?.ok;
      const newQty =
        (toolResult as any)?.data?.quantity ?? (toolResult as any)?.result?.quantity ?? null;

      let reply = "";
      if (ok) {
        reply = `Adjusted **${adjustInventoryCmd.name}** by **${adjustInventoryCmd.delta}**. New quantity: **${newQty ?? "updated"}**.`;
      } else {
        const errMsg =
          (toolResult as any)?.error ||
          (toolResult as any)?.message ||
          "Adjust inventory failed.";
        reply = `I could not adjust **${adjustInventoryCmd.name}**. ${errMsg}`;
      }

      await supabase.from("chat_messages").insert({
        thread_id,
        role: "assistant",
        content: reply,
        meta: {
          used_tool: "adjust_inventory",
          tool_calls: [toolCall],
          tool_results: [toolResult],
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

    // 3D) Available puppies
    if (looksLikePuppyAvailabilityQuestion(message)) {
      try {
        const pups = await listAvailablePuppies({
          supabase,
          owner_id: CORE_OWNER_ID,
          org_key: ORG_KEY,
        });

        const count = pups.length;

        const reply =
          count === 0
            ? "You currently have 0 puppies marked as **available**."
            : [
                `You currently have **${count}** puppies marked as **available**:`,
                ...pups.map((p: any, i: number) => {
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

    // 3E) List inventory
    if (looksLikeInventoryListQuestion(message)) {
      try {
        const items = await listInventory({
          supabase,
          owner_id: CORE_OWNER_ID,
        });

        const count = items.length;

        const reply =
          count === 0
            ? "You currently have 0 inventory items recorded."
            : [
                `You currently have **${count}** inventory items recorded:`,
                ...items.slice(0, 25).map((item: any) => {
                  return `• ${item.name} — qty ${item.quantity} — cost ${formatMoney(item.cost)}`;
                }),
              ].join("\n");

        await supabase.from("chat_messages").insert({
          thread_id,
          role: "assistant",
          content: reply,
          meta: {
            used_tool: "listInventory",
            counts: { inventory: count },
            sample_ids: items.slice(0, 10).map((i: any) => i?.id).filter(Boolean),
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
        console.error("Inventory list query failed:", e);
        const reply = "I couldn’t pull inventory right now. Try again in a moment.";

        await supabase.from("chat_messages").insert({
          thread_id,
          role: "assistant",
          content: reply,
          meta: { error: e?.message ?? String(e), used_tool: "listInventory" },
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

    // 5) Optional rule-based tool calls
    const toolCalls: ToolCall[] = [];
    if (message.toLowerCase().startsWith("test litter")) {
      toolCalls.push({
        tool: "create_litter",
        args: {
          litter_name: "Test Litter",
          dam_id: "REPLACE_WITH_REAL_DAM_ID",
          sire_id: null,
          dob: new Date().toISOString().slice(0, 10),
          notes: "Created from Core chat test.",
        },
      });
    }

    const tool_results: any[] = [];
    for (const call of toolCalls) {
      tool_results.push(await dispatchAnyTool(call));
    }

    // 6) Extract facts
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

    // 7) Normal assistant reply
    const chatSystem = `
You are "Cherolee Core" for SWVA Chihuahua / Chihuahua.Services.

Voice:
- Clear, confident, professional, calm.
- Not developer-y. No talk about code, databases, or APIs.

Rules:
- Use the conversation history.
- Do NOT invent weights, dates, prices, buyer names, payment statuses, inventory counts, or system actions.
- CRITICAL: Do NOT claim you created/updated a record unless a tool result proves it.
- NEVER output <function_calls>, <invoke>, or <function_result> blocks.
- Tools are executed only by the server.
- Do not ask broad exploratory questions about inventory, payments, or operations unless those actions are wired to real tools.
- If a requested operational action is not wired yet, say so plainly and briefly.

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

    // 8) Insert assistant reply
    const { error: insertAsstErr } = await supabase.from("chat_messages").insert({
      thread_id,
      role: "assistant",
      content: reply,
      meta: { tool_results, fact_apply },
      org_key: ORG_KEY,
    });

    if (insertAsstErr) {
      console.error(insertAsstErr);
      return NextResponse.json(
        { error: `Failed to store assistant reply: ${insertAsstErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      thread_id,
      reply,
      tool_results,
      fact_apply,
    });
  } catch (err: any) {
    console.error("POST /api/ai/chat fatal error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error." },
      { status: 500 }
    );
  }
}
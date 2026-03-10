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
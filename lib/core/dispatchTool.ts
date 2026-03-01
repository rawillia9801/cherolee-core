// FILE: lib/core/dispatchTool.ts
// CHEROLEE CORE — Tool dispatcher (validated, auditable)

import { supabaseServer } from "@/lib/db/supabaseServer";
import type { ToolCall, ToolResult } from "@/lib/core/types";

function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function audit(
  action: string,
  entity_type: string | null,
  entity_id: string | null,
  success: boolean,
  details: any
) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const actor_user_id = userData?.user?.id ?? null;

  await supabase.from("audit_log").insert({
    org_key: "swva",
    actor_user_id,
    action,
    entity_type,
    entity_id,
    success,
    details_json: details ?? {},
  });
}

export async function dispatchTool(call: ToolCall): Promise<ToolResult> {
  const supabase = await supabaseServer();

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return { ok: false, tool: call.tool, error: "Not authenticated." };
    }

    if (call.tool === "create_litter") {
      const a = call.args;
      assert(a.dam_id, "dam_id is required");
      assert(a.dob, "dob is required");

      const { data, error } = await supabase
        .from("litters")
        .insert({
          org_key: "swva",
          litter_name: a.litter_name ?? null,
          dam_id: a.dam_id,
          sire_id: a.sire_id ?? null,
          dob: a.dob,
          birth_time: a.birth_time ?? null,
          registry_type: a.registry_type ?? null,
          notes: a.notes ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;

      await audit("create_litter", "litter", data.id, true, { args: a });
      return { ok: true, tool: call.tool, result: { litter_id: data.id } };
    }

    if (call.tool === "create_puppies") {
      const a = call.args;
      assert(a.litter_id, "litter_id is required");
      assert(Array.isArray(a.puppies) && a.puppies.length > 0, "puppies[] is required");

      const rows = a.puppies.map((p) => ({
        org_key: "swva",
        litter_id: a.litter_id,
        name: p.name ?? null,
        sex: p.sex ?? null,
        color: p.color ?? null,
        birth_weight_oz: p.birth_weight_oz ?? null,
        price: p.price ?? null,
        registry_type: p.registry_type ?? null,
        status: p.status ?? "available",
        notes: p.notes ?? null,
      }));

      const { data, error } = await supabase.from("puppies").insert(rows).select("id");
      if (error) throw error;

      await audit("create_puppies", "litter", a.litter_id, true, { count: rows.length });
      return { ok: true, tool: call.tool, result: { puppy_ids: data.map((d) => d.id) } };
    }

    if (call.tool === "record_weights") {
      const a = call.args;
      assert(Array.isArray(a.entries) && a.entries.length > 0, "entries[] is required");

      const rows = a.entries.map((e) => ({
        org_key: "swva",
        puppy_id: e.puppy_id,
        weight_oz: e.weight_oz,
        recorded_at: e.recorded_at ?? null,
        notes: e.notes ?? null,
      }));

      const { error } = await supabase.from("puppy_weights").insert(rows);
      if (error) throw error;

      await audit("record_weights", "puppy", a.entries[0]?.puppy_id ?? null, true, { count: rows.length });
      return { ok: true, tool: call.tool, result: { inserted: rows.length } };
    }

    return { ok: false, tool: call.tool, error: "Unknown tool." };
  } catch (err: any) {
    try {
      await audit(`tool_error:${call.tool}`, null, null, false, { error: err?.message ?? String(err) });
    } catch {}
    return { ok: false, tool: call.tool, error: err?.message ?? "Tool failed." };
  }
}
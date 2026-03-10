// FILE: lib/core/dispatchTool.ts
// CHEROLEE CORE — Tool dispatcher (validated, auditable)
//
// CHANGELOG
// - FIX: create_puppy now ALWAYS sets owner_id (DB requires it).
// - FIX: create_puppies now ALWAYS sets owner_id (DB requires it).
// - FIX: ONLY required field for create_puppy is name (everything else optional).
// - FIX: Uses real column names for puppies table (dob, birth_weight_oz, sex, etc.).
// - FIX: Widened tool args locally to avoid TS property errors during Vercel build.
// - SAFE: status defaults to "available" when not provided.
// - SAFE: name is never inserted as null/empty.
//
// ANCHOR: HELPERS
// ANCHOR: AUDIT
// ANCHOR: DISPATCH
// ANCHOR: TOOL create_litter
// ANCHOR: TOOL create_puppy
// ANCHOR: TOOL create_puppies
// ANCHOR: TOOL record_weights

import { supabaseServer } from "@/lib/db/supabaseServer";
import type { ToolCall, ToolResult } from "@/lib/core/types";

// --------------------
// ANCHOR: HELPERS
// --------------------
function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function cleanStr(v: any) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

function cleanNum(v: any) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// --------------------
// ANCHOR: AUDIT
// --------------------
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

// --------------------
// ANCHOR: DISPATCH
// --------------------
export async function dispatchTool(call: ToolCall): Promise<ToolResult> {
  const supabase = await supabaseServer();
  const toolName = call.tool;

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return { ok: false, tool: toolName, error: "Not authenticated." };
    }

    const authedUserId = userData.user.id;

    // --------------------
    // ANCHOR: TOOL create_litter
    // --------------------
    if (toolName === "create_litter") {
      const a: any = call.args ?? {};

      assert(a?.dam_id, "dam_id is required");
      assert(a?.dob, "dob is required");

      const row: any = {
        org_key: "swva",
        owner_id: authedUserId,
        litter_name: cleanStr(a.litter_name),
        dam_id: cleanStr(a.dam_id),
        sire_id: cleanStr(a.sire_id),
        dob: a.dob,
        notes: cleanStr(a.notes),
      };

      // Only include these if you truly have these columns in your DB.
      if (cleanStr(a.sire)) row.sire = cleanStr(a.sire);
      if (cleanStr(a.dam)) row.dam = cleanStr(a.dam);

      const { data, error } = await supabase
        .from("litters")
        .insert(row)
        .select("id")
        .single();

      if (error) throw error;

      await audit("create_litter", "litter", data.id, true, { args: a });

      return {
        ok: true,
        tool: toolName,
        data: { id: data.id },
        result: { litter_id: data.id },
      } as any;
    }

    // --------------------
    // ANCHOR: TOOL create_puppy
    // --------------------
    if (toolName === "create_puppy") {
      const a: any = call.args ?? {};

      // ONLY REQUIRED FIELD:
      const name = (a.name ?? "").toString().trim();
      assert(name.length > 0, "name is required");

      const row: any = {
        org_key: "swva",
        owner_id: authedUserId,

        litter_id: cleanStr(a.litter_id),
        buyer_id: cleanStr(a.buyer_id),

        name,
        sex: cleanStr(a.sex),
        color: cleanStr(a.color),
        dob: cleanStr(a.dob),
        birth_weight_oz: cleanNum(a.birth_weight_oz),

        price: cleanNum(a.price),
        registry_type: cleanStr(a.registry_type),

        status: (a.status ?? "available").toString().trim() || "available",
        notes: cleanStr(a.notes),
      };

      const { data, error } = await supabase
        .from("puppies")
        .insert(row)
        .select("id")
        .single();

      if (error) throw error;

      await audit("create_puppy", "puppy", data.id, true, { args: a });

      return {
        ok: true,
        tool: toolName,
        data: { id: data.id },
        result: { puppy_id: data.id },
      } as any;
    }

    // --------------------
    // ANCHOR: TOOL create_puppies
    // --------------------
    if (toolName === "create_puppies") {
      const a: any = call.args ?? {};

      assert(a?.litter_id, "litter_id is required");
      assert(Array.isArray(a?.puppies) && a.puppies.length > 0, "puppies[] is required");

      const rows = a.puppies.map((p: any) => {
        const nm = (p?.name ?? "").toString().trim();
        assert(nm.length > 0, "Each puppy in puppies[] requires name");

        return {
          org_key: "swva",
          owner_id: authedUserId,
          litter_id: cleanStr(a.litter_id),

          buyer_id: cleanStr(p.buyer_id),

          name: nm,
          sex: cleanStr(p.sex),
          color: cleanStr(p.color),
          dob: cleanStr(p.dob),
          birth_weight_oz: cleanNum(p.birth_weight_oz),

          price: cleanNum(p.price),
          registry_type: cleanStr(p.registry_type),
          status: (p.status ?? "available").toString().trim() || "available",
          notes: cleanStr(p.notes),
        };
      });

      const { data, error } = await supabase.from("puppies").insert(rows).select("id");
      if (error) throw error;

      await audit("create_puppies", "litter", cleanStr(a.litter_id), true, {
        count: rows.length,
      });

      const puppy_ids = (data ?? []).map((d: any) => d.id);

      return {
        ok: true,
        tool: toolName,
        data: { ids: puppy_ids },
        result: { puppy_ids },
      } as any;
    }

    // --------------------
    // ANCHOR: TOOL record_weights
    // --------------------
    if (toolName === "record_weights") {
      const a: any = call.args ?? {};

      assert(Array.isArray(a.entries) && a.entries.length > 0, "entries[] is required");

      const rows = a.entries.map((e: any) => ({
        org_key: "swva",
        puppy_id: e.puppy_id,
        weight_oz: cleanNum(e.weight_oz),
        recorded_at: cleanStr(e.recorded_at),
        notes: cleanStr(e.notes),
      }));

      const { error } = await supabase.from("puppy_weights").insert(rows);
      if (error) throw error;

      await audit("record_weights", "puppy", a.entries[0]?.puppy_id ?? null, true, {
        count: rows.length,
      });

      return {
        ok: true,
        tool: toolName,
        result: { inserted: rows.length },
      } as any;
    }

    return { ok: false, tool: toolName, error: "Unknown tool." };
  } catch (err: any) {
    try {
      await audit(`tool_error:${toolName}`, null, null, false, {
        error: err?.message ?? String(err),
      });
    } catch {
      // ignore audit failures
    }

    return {
      ok: false,
      tool: toolName,
      error: err?.message ?? "Tool failed.",
    };
  }
}
// FILE: lib/core/facts.ts
// CHEROLEE CORE — Fact Extraction + Safe Apply (Hardened Identity)

import { createServiceClient } from "@/lib/supabase/server";

export type ExtractedFact =
  | {
      kind: "puppy_birth_weight_oz";
      puppy_name: string;
      litter_code?: string | null; // optional disambiguator
      birth_weight_oz: number;
      confidence: number; // 0..1
      source_text: string;
    };

export type FactExtractResult = {
  facts: ExtractedFact[];
};

// Very conservative: only allow high-confidence facts
const MIN_CONFIDENCE = 0.75;

// ✅ Supabase nested selects can come back as object OR array OR null.
// Your query uses: litters(litter_code)
// In many setups that returns an ARRAY: [{ litter_code: ... }]
type LitterJoin = { litter_code: string | null } | { litter_code: string | null }[] | null;

type PuppyCandidate = {
  id: string;
  name: string | null;
  litter_id: string | null;
  dob: string | null;
  sex: string | null;
  color: string | null;
  birth_weight_oz: number | null;
  litters?: LitterJoin;
};

// ✅ Normalize litter_code regardless of whether litters is object/array/null
function getLitterCode(p: PuppyCandidate): string | null {
  const l = p.litters ?? null;
  if (!l) return null;
  if (Array.isArray(l)) return l[0]?.litter_code ?? null;
  return l.litter_code ?? null;
}

export async function applyFactsSafely(thread_id: string, facts: ExtractedFact[]) {
  const supabase = createServiceClient();

  const applied: any[] = [];
  const skipped: any[] = [];

  for (const f of facts ?? []) {
    if (!f || (f as any).confidence == null || f.confidence < MIN_CONFIDENCE) {
      skipped.push({ fact: f, reason: "low_confidence" });
      continue;
    }

    if (f.kind === "puppy_birth_weight_oz") {
      const puppyName = (f.puppy_name ?? "").trim();
      const litterCode = (f.litter_code ?? "").trim() || null;
      const oz = Number(f.birth_weight_oz);

      if (!puppyName || !Number.isFinite(oz) || oz <= 0 || oz > 16) {
        skipped.push({ fact: f, reason: "invalid_input" });
        continue;
      }

      // Find candidates by name (case-insensitive), pull litter_code for disambiguation
      const { data: candidates, error: findErr } = await supabase
        .from("puppies")
        .select("id,name,litter_id,dob,sex,color,birth_weight_oz,litters(litter_code)")
        .ilike("name", puppyName)
        .limit(10);

      if (findErr) {
        skipped.push({ fact: f, reason: "find_error", details: findErr.message });
        continue;
      }

      const list = (candidates ?? []) as PuppyCandidate[];

      if (list.length === 0) {
        skipped.push({
          fact: f,
          reason: "puppy_not_found",
          ask: `I don’t see a puppy named "${puppyName}" yet. What’s the exact puppy name as it appears in your system?`,
        });
        continue;
      }

      // If litter_code provided, filter candidates to that litter
      const narrowed = litterCode
        ? list.filter((p) => (getLitterCode(p) ?? "").toLowerCase() === litterCode.toLowerCase())
        : list;

      if (litterCode && narrowed.length === 0) {
        skipped.push({
          fact: f,
          reason: "litter_code_no_match",
          ask: `I found "${puppyName}", but not under litter code "${litterCode}". Which litter code is correct?`,
          options: list.slice(0, 5).map((p) => ({
            puppy_id: p.id,
            name: p.name,
            litter_code: getLitterCode(p),
            dob: p.dob,
            sex: p.sex,
            color: p.color,
          })),
        });
        continue;
      }

      if (narrowed.length > 1) {
        // HARDENING: never guess. Ask user to specify litter_code.
        skipped.push({
          fact: f,
          reason: "needs_disambiguation",
          ask: `I see multiple puppies named "${puppyName}". Tell me the litter code (example: 20260228-a1b2) and I’ll record it.`,
          options: narrowed.slice(0, 5).map((p) => ({
            puppy_id: p.id,
            name: p.name,
            litter_code: getLitterCode(p),
            dob: p.dob,
            sex: p.sex,
            color: p.color,
          })),
        });
        continue;
      }

      const puppy = narrowed[0];

      // Optional idempotency: if already set to same value, don't rewrite
      if (puppy.birth_weight_oz != null && Number(puppy.birth_weight_oz) === oz) {
        applied.push({
          kind: f.kind,
          puppy_id: puppy.id,
          puppy_name: puppy.name,
          set_birth_weight_oz: oz,
          note: "already_set",
        });
        continue;
      }

      const { error: updErr } = await supabase
        .from("puppies")
        .update({ birth_weight_oz: oz })
        .eq("id", puppy.id);

      if (updErr) {
        skipped.push({ fact: f, reason: "update_error", details: updErr.message });
        continue;
      }

      applied.push({
        kind: f.kind,
        puppy_id: puppy.id,
        puppy_name: puppy.name,
        litter_code: getLitterCode(puppy),
        set_birth_weight_oz: oz,
      });

      continue;
    }

    skipped.push({ fact: f, reason: "unsupported_kind" });
  }

  return { applied, skipped, thread_id };
}
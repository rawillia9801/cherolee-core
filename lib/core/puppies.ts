// FILE: lib/core/puppies.ts
// CHEROLEE CORE — Puppies data helpers (DB truth)

import type { SupabaseClient } from "@supabase/supabase-js";

export type PuppyRow = {
  id: string;
  name: string | null;
  sex: string | null;
  color: string | null;
  status: string | null;
  price: number | string; // supabase may return numeric as string depending on client
  dob: string | null;
  litter_id: string | null;
  buyer_id: string | null;
  created_at: string;
  org_key: string;
};

export async function listAvailablePuppies(opts: {
  supabase: SupabaseClient;
  owner_id: string;
  org_key: string;
}) {
  const { supabase, owner_id, org_key } = opts;

  const { data, error } = await supabase
    .from("puppies")
    .select("id, name, sex, color, status, price, dob, litter_id, buyer_id, created_at, org_key")
    .eq("owner_id", owner_id)
    .eq("org_key", org_key)
    .eq("status", "available")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as PuppyRow[];
}
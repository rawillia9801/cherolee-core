// FILE: lib/core/inventory.ts
// CHEROLEE CORE — Inventory read helpers

export async function listInventory(opts: {
  supabase: any;
  owner_id: string;
}) {
  const { supabase, owner_id } = opts;

  const { data, error } = await supabase
    .from("inventory")
    .select(
      "id, name, sku, category, listed_on, quantity, cost, total_cost, current_sales_price_walmart, current_sales_price_ebay, sent_to_wfs, notes, created_at, updated_at"
    )
    .eq("owner_id", owner_id)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
// FILE: lib/core/types.ts
// CHEROLEE CORE — Tool Types
//
// CHANGELOG
// - FIX: Adds missing tool variants so TS no longer narrows call to `never`
// - ADD: create_litter
// - ADD: create_puppy (single)
// - KEEP: create_puppies (batch), record_weights

export type ToolCall =
  | {
      tool: "create_litter";
      args: {
        owner_id?: string | null;
        litter_name?: string | null;
        dam_id: string;
        sire_id?: string | null;
        dob: string; // YYYY-MM-DD
        birth_time?: string | null;
        registry_type?: string | null;
        notes?: string | null;
      };
    }
  | {
      tool: "create_puppy";
      args: {
        owner_id?: string | null;
        org_key?: string | null;
        litter_id?: string | null;
        buyer_id?: string | null;

        name: string;
        sex?: string | null;
        color?: string | null;
        birth_weight_oz?: number | null;
        price?: number | null;
        registry_type?: string | null;

        status?: "available" | "reserved" | "sold" | string;
        notes?: string | null;
      };
    }
  | {
      tool: "create_puppies";
      args: {
        owner_id?: string | null;
        org_key?: string | null;
        litter_id: string;
        puppies: Array<{
          buyer_id?: string | null;

          name?: string | null;
          sex?: string | null;
          color?: string | null;
          birth_weight_oz?: number | null;
          price?: number | null;
          registry_type?: string | null;

          status?: "available" | "reserved" | "sold" | string;
          notes?: string | null;
        }>;
      };
    }
  | {
      tool: "record_weights";
      args: {
        owner_id?: string | null;
        org_key?: string | null;
        entries: Array<{
          puppy_id: string;
          weight_oz: number;
          recorded_at?: string | null; // ISO or null
          notes?: string | null;
        }>;
      };
    };

export type ToolResult =
  | { ok: true; tool: ToolCall["tool"]; result?: any; data?: any }
  | { ok: false; tool: ToolCall["tool"]; error: string; data?: any };
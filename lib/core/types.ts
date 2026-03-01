// FILE: lib/core/types.ts
// CHEROLEE CORE — Tool + Chat Types

export type CoreRole = "admin" | "staff" | "buyer";

export type ToolCall =
  | {
      tool: "create_litter";
      args: {
        litter_name?: string;
        dam_id: string;
        sire_id?: string | null;
        dob: string; // YYYY-MM-DD
        birth_time?: string | null; // HH:MM
        registry_type?: string | null;
        notes?: string | null;
      };
    }
  | {
      tool: "create_puppies";
      args: {
        litter_id: string;
        puppies: Array<{
          name?: string | null;
          sex?: "male" | "female" | null;
          color?: string | null;
          birth_weight_oz?: number | null;
          price?: number | null;
          registry_type?: string | null;
          status?: "available" | "reserved" | "sold" | "hold" | "not_available";
          notes?: string | null;
        }>;
      };
    }
  | {
      tool: "record_weights";
      args: {
        entries: Array<{
          puppy_id: string;
          weight_oz: number;
          recorded_at?: string | null; // ISO or null = now
          notes?: string | null;
        }>;
      };
    };

export type ToolResult = {
  ok: boolean;
  tool: ToolCall["tool"];
  result?: any;
  error?: string;
};

export type ChatInput = {
  thread_id?: string | null;
  message: string;
};

export type ChatOutput = {
  reply: string;
  tool_results?: ToolResult[];
  thread_id?: string;
};
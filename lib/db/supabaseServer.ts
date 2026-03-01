// FILE: lib/db/supabaseServer.ts
// CHEROLEE CORE — Supabase server client (Next 16 async cookies-safe)

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Use in Server Components / Server Actions where you ONLY need to READ cookies.
 * (For Route Handlers, we can still use this for reads.)
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // In Server Components, setting cookies isn't supported the same way.
        // Auth cookie refresh is handled by middleware / route handlers when needed.
        set() {},
        remove() {},
      },
    }
  );
}
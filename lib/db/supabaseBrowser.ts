// FILE: lib/db/supabaseBrowser.ts
import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Do NOT throw in browser runtime.
  // If env is truly missing, Supabase itself will error cleanly.

  browserClient = createBrowserClient(url, anon);
  return browserClient;
}
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function publicClient(url: string | undefined, key: string | undefined, bearer?: string) {
  if (!url || !key) throw new Error("Service unavailable");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Auth must see the custom header before fetch: getUser() otherwise
      // fails locally with AuthSessionMissingError on this stateless client.
      headers: bearer ? { Authorization: bearer } : {},
      fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      if (bearer) headers.set("Authorization", bearer);
      return fetch(input, { ...init, headers });
    } },
  });
}
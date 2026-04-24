import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SSR Supabase client for Server Components, Server Actions, and Route
 * Handlers. Reads + mints the session cookie via next/headers `cookies()`
 * (async in Next 16). Uses the browser-safe `NEXT_PUBLIC_SUPABASE_*` pair;
 * RLS (E10-S4) enforces authorization — the anon key alone grants nothing.
 *
 * Service-role access remains `getSupabaseAdmin()` in `./server.ts`. Never
 * call this factory from middleware — use `./middleware.ts` (E10-S5).
 */
export async function createServerAuthClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set. Required for SSR auth client.",
    );
  }
  if (!anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Required for SSR auth client.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Components can't mutate cookies, but Server Actions and
        // Route Handlers can. The try/catch lets the same factory serve
        // both: in a Server Component the set throws, and we ignore it
        // (Supabase will rely on the middleware refresh in E10-S5).
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // Server Component render — cookies are read-only here.
        }
      },
    },
  });
}

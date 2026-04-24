import "server-only";

import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Untyped client: Supabase v2 Database generics impose a brittle shape that
// fights with additive schema evolution. E6 consumers work in plain object
// shapes + runtime error handling; TypeScript types for rows live in
// schema.ts and are applied by callers where needed.
export type SupabaseAdminClient = SupabaseClient;

export const getSupabaseAdmin = cache((): SupabaseAdminClient => {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "SUPABASE_URL is not set. Required for server-side Supabase client.",
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for server-side Supabase client.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-application-name": "sell-house-for-free",
      },
    },
  });
});

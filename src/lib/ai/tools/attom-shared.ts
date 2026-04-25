import "server-only";

import { z } from "zod";

import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import { VALUATION_DISCLAIMER } from "@/lib/ai/prompts/comping";
import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import {
  resolveSubmissionForSession,
  type ShfSession,
} from "@/lib/ai/tools/shf-shared";
import type { AddressFields } from "@/lib/seller-form/types";

export interface AttomToolSession extends DefineToolSessionLike, ShfSession {
  id: string;
}

const ADDRESS_SHAPE = z.object({
  street1: z.string().min(1).max(120),
  street2: z.string().max(120).optional(),
  city: z.string().min(1).max(60),
  state: z.literal("AZ").default("AZ"),
  zip: z.string().min(5),
});

export const PropertyToolInput = z.object({
  address: ADDRESS_SHAPE.optional(),
});
export const AreaToolInput = z.object({
  geoIdV4: z.string().min(1).optional(),
  zip: z.string().min(5).max(5).optional(),
});

interface AttomFetchResult {
  data: unknown | null;
  cacheHit: boolean;
  retrievedAt: string;
}

async function resolveAddress(
  session: AttomToolSession,
  override: AddressFields | undefined,
  ctx: { supabase: import("@supabase/supabase-js").SupabaseClient },
): Promise<AddressFields | null> {
  if (override) return override;
  const sub = await resolveSubmissionForSession(session, ctx.supabase);
  if (!sub) return null;
  const { data } = await ctx.supabase
    .from("submissions")
    .select("city, state, zip, address1:submission_id")
    .eq("id", sub.id)
    .maybeSingle();
  // submissions row stores city/state/zip but not street1 directly under that
  // name in every E6 variant — fall back to the bootstrap-stored context if
  // address parts are missing. Conservative: if any part is missing return null
  // rather than guess and miscall ATTOM.
  if (!data) return null;
  const row = data as { city?: string; state?: string; zip?: string };
  // Without a guaranteed street1 we can't safely call ATTOM; the orchestrator
  // should pass the address explicitly via the tool input in that case.
  if (!row.city || !row.state || !row.zip) return null;
  // No street1 means the orchestrator must supply it via input.
  return null;
}

export interface AttomPropertyToolSpec<TOut> {
  name: string;
  description: string;
  source: string;
  valuationDisclaimer?: boolean;
  budgetBucket?: "attom";
  costClass?: "cheap" | "priced" | "expensive";
  // Caller wraps the E12 client; receives normalized AddressFields.
  fetch: (
    address: AddressFields,
  ) => Promise<unknown | null>;
  // Shape the upstream raw payload into an LLM-friendly object. Return null to
  // surface 'no_data' to the LLM.
  shape: (raw: unknown) => TOut | null;
}

export function defineAttomPropertyTool<TOut>(
  spec: AttomPropertyToolSpec<TOut>,
): (session: AttomToolSession) => ReturnType<typeof defineTool> extends infer T
  ? T extends (s: DefineToolSessionLike) => infer R
    ? R
    : never
  : never;
export function defineAttomPropertyTool<TOut>(spec: AttomPropertyToolSpec<TOut>) {
  const disclaimer = spec.valuationDisclaimer
    ? VALUATION_DISCLAIMER
    : DOC_SUMMARY_DISCLAIMER;
  return (session: AttomToolSession) => {
    const factory = defineTool({
      name: spec.name,
      description: spec.description,
      inputSchema: PropertyToolInput,
      telemetry: {
        cost_class: spec.costClass ?? "priced",
        budget_bucket: "attom",
      },
      handler: async ({ address }, ctx) => {
        const addr = await resolveAddress(session, address, ctx);
        if (!addr) {
          return {
            data: null,
            reason: "no_address" as const,
            source: spec.source,
            retrievedAt: null,
            cacheHit: false,
            disclaimer,
          };
        }

        let raw: unknown | null;
        try {
          raw = await spec.fetch(addr);
        } catch {
          return {
            kind: "tool-error" as const,
            safe: true as const,
            cause: "upstream_unavailable",
            message: "ATTOM didn't respond cleanly. Try again in a few.",
            disclaimer,
          };
        }

        if (raw == null) {
          return {
            data: null,
            reason: "no_data" as const,
            source: spec.source,
            retrievedAt: new Date().toISOString(),
            cacheHit: false,
            disclaimer,
          };
        }

        const shaped = spec.shape(raw);
        if (shaped == null) {
          return {
            data: null,
            reason: "no_data" as const,
            source: spec.source,
            retrievedAt: new Date().toISOString(),
            cacheHit: false,
            disclaimer,
          };
        }

        return {
          data: redactObject(shaped),
          source: spec.source,
          retrievedAt: new Date().toISOString(),
          // The E12 client returns a typed payload; the cache hit/miss
          // observability lives inside that client (Sentry tags).
          // From the tool surface we report cacheHit:false unless the
          // underlying client surfaces the boolean.
          cacheHit: false,
          disclaimer,
        };
      },
    });
    return factory(session);
  };
}

export interface AttomAreaToolSpec<TOut> {
  name: string;
  description: string;
  source: string;
  valuationDisclaimer?: boolean;
  fetch: (geoIdV4: string) => Promise<unknown | null>;
  shape: (raw: unknown) => TOut | null;
}

export function defineAttomAreaTool<TOut>(spec: AttomAreaToolSpec<TOut>) {
  const disclaimer = spec.valuationDisclaimer
    ? VALUATION_DISCLAIMER
    : DOC_SUMMARY_DISCLAIMER;
  return (session: AttomToolSession) => {
    const factory = defineTool({
      name: spec.name,
      description: spec.description,
      inputSchema: AreaToolInput,
      telemetry: { cost_class: "priced", budget_bucket: "attom" },
      handler: async ({ geoIdV4, zip }) => {
        const key = geoIdV4 ?? zip;
        if (!key) {
          return {
            data: null,
            reason: "no_address" as const,
            source: spec.source,
            retrievedAt: null,
            cacheHit: false,
            disclaimer,
          };
        }

        let raw: unknown | null;
        try {
          raw = await spec.fetch(key);
        } catch {
          return {
            kind: "tool-error" as const,
            safe: true as const,
            cause: "upstream_unavailable",
            message: "ATTOM didn't respond cleanly. Try again in a few.",
            disclaimer,
          };
        }

        if (raw == null) {
          return {
            data: null,
            reason: "no_data" as const,
            source: spec.source,
            retrievedAt: new Date().toISOString(),
            cacheHit: false,
            disclaimer,
          };
        }

        const shaped = spec.shape(raw);
        return {
          data: redactObject(shaped),
          source: spec.source,
          retrievedAt: new Date().toISOString(),
          cacheHit: false,
          disclaimer,
        };
      },
    });
    return factory(session);
  };
}

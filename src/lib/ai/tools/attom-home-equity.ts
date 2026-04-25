import "server-only";

import { z } from "zod";

import { VALUATION_DISCLAIMER } from "@/lib/ai/prompts/comping";
import { getAttomAvm } from "@/lib/enrichment/attom-extended-client";

import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import {
  resolveSubmissionForSession,
  type ShfSession,
} from "@/lib/ai/tools/shf-shared";
import type { AddressFields } from "@/lib/seller-form/types";

interface Session extends DefineToolSessionLike, ShfSession {
  id: string;
}

interface AvmAmount {
  low?: number;
  value?: number;
  high?: number;
}
interface AvmRoot {
  property?: Array<{ avm?: { amount?: AvmAmount } }>;
}

export function getHomeEquityEstimateTool(session: Session) {
  const factory = defineTool({
    name: "getHomeEquityEstimate",
    description:
      "Estimate the seller's home equity from ATTOM AVM minus the seller-entered outstanding mortgage balance. Estimate, not appraisal.",
    inputSchema: z.object({
      outstandingBalance: z.number().min(0).max(5_000_000),
      address: z
        .object({
          street1: z.string(),
          city: z.string(),
          state: z.string(),
          zip: z.string(),
        })
        .partial()
        .optional(),
    }),
    telemetry: { cost_class: "priced", budget_bucket: "attom" },
    handler: async ({ outstandingBalance, address }, ctx) => {
      const sub = await resolveSubmissionForSession(session, ctx.supabase);
      const addr: AddressFields | null =
        (address && address.street1 && address.city && address.state && address.zip)
          ? (address as AddressFields)
          : null;

      if (!addr && !sub) {
        return {
          data: null,
          reason: "no_address" as const,
          source: "derived-attom-avm",
          retrievedAt: null,
          disclaimer: VALUATION_DISCLAIMER,
        };
      }

      // Without a structured street1 from the submission, we can't safely call ATTOM.
      // Surface no_data — orchestrator should re-call with explicit address.
      const fetchAddr = addr;
      if (!fetchAddr) {
        return {
          data: null,
          reason: "no_address" as const,
          source: "derived-attom-avm",
          retrievedAt: null,
          disclaimer: VALUATION_DISCLAIMER,
        };
      }

      let raw: unknown | null;
      try {
        raw = await getAttomAvm(fetchAddr);
      } catch {
        return {
          kind: "tool-error" as const,
          safe: true as const,
          cause: "upstream_unavailable",
          message: "ATTOM didn't respond cleanly. Try again in a few.",
          disclaimer: VALUATION_DISCLAIMER,
        };
      }

      const root = raw as AvmRoot | null;
      const amount = root?.property?.[0]?.avm?.amount;
      if (!amount?.low || !amount.value || !amount.high) {
        return {
          data: null,
          reason: "no_data" as const,
          source: "derived-attom-avm",
          retrievedAt: new Date().toISOString(),
          disclaimer: VALUATION_DISCLAIMER,
        };
      }

      return {
        data: {
          equity: {
            low: Math.max(0, amount.low - outstandingBalance),
            mid: Math.max(0, amount.value - outstandingBalance),
            high: Math.max(0, amount.high - outstandingBalance),
          },
          balance: outstandingBalance,
        },
        source: "derived-attom-avm",
        avmRetrievedAt: new Date().toISOString(),
        retrievedAt: new Date().toISOString(),
        disclaimer: VALUATION_DISCLAIMER,
      };
    },
  });
  return factory(session);
}

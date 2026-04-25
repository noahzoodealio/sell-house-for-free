import "server-only";

import { getAttomAvm } from "@/lib/enrichment/attom-extended-client";

import { defineAttomPropertyTool } from "@/lib/ai/tools/attom-shared";

interface AvmShape {
  low?: number;
  mid?: number;
  high?: number;
  confidence?: string | number;
}

export const getAttomAvmTool = defineAttomPropertyTool<AvmShape>({
  name: "getAttomAvm",
  description:
    "Get the raw ATTOM Automated Valuation Model number (low/mid/high + confidence). This is a *secondary citation*, not the primary valuation. For the seller's headline 'what's my house worth' answer, prefer aggregate-valuation (E9 comp pipeline) and use this tool to triangulate.",
  source: "attom-avm",
  valuationDisclaimer: true,
  fetch: getAttomAvm,
  shape: (raw) => {
    const root =
      typeof raw === "object" && raw !== null && "property" in raw
        ? ((raw as { property: unknown[] }).property?.[0] as Record<string, unknown>)
        : null;
    if (!root) return null;
    const avm = root.avm as
      | { amount?: { low?: number; value?: number; high?: number; confidence?: number } }
      | undefined;
    if (!avm?.amount) return null;
    return {
      low: avm.amount.low,
      mid: avm.amount.value,
      high: avm.amount.high,
      confidence: avm.amount.confidence,
    };
  },
});

import "server-only";

import { getAttomAvmHistory } from "@/lib/enrichment/attom-extended-client";

import { defineAttomPropertyTool } from "@/lib/ai/tools/attom-shared";

export const getAvmHistoryTool = defineAttomPropertyTool({
  name: "getAvmHistory",
  description:
    "Year-over-year ATTOM AVM history for a property. Useful for 'how has my home value changed' questions.",
  source: "attom-avm-history",
  valuationDisclaimer: true,
  fetch: getAttomAvmHistory,
  shape: (raw) => raw,
});

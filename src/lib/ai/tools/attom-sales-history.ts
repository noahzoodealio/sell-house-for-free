import "server-only";

import { getAttomSalesHistory } from "@/lib/enrichment/attom-extended-client";

import { defineAttomPropertyTool } from "@/lib/ai/tools/attom-shared";

export const getSalesHistoryTool = defineAttomPropertyTool({
  name: "getSalesHistory",
  description:
    "Up to ~10 years of recorded sales for the property. Useful for 'how has this property changed hands' questions.",
  source: "attom-sales-history",
  fetch: getAttomSalesHistory,
  shape: (raw) => raw,
});

import "server-only";

import { getAttomSale } from "@/lib/enrichment/attom-extended-client";

import { defineAttomPropertyTool } from "@/lib/ai/tools/attom-shared";

export const getLastSaleTool = defineAttomPropertyTool({
  name: "getLastSale",
  description:
    "Most recent recorded sale of the property (price, date, buyer/seller). Useful for 'when did this house last sell' questions.",
  source: "attom-sale",
  fetch: getAttomSale,
  shape: (raw) => raw,
});

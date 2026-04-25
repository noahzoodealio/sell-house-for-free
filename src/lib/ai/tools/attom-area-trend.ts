import "server-only";

import { getAttomSalesTrend } from "@/lib/enrichment/attom-extended-client";

import { defineAttomAreaTool } from "@/lib/ai/tools/attom-shared";

export const getAreaSalesTrendTool = defineAttomAreaTool({
  name: "getAreaSalesTrend",
  description:
    "Recent area sales trend (median price, DOM) for an ATTOM geoIdV4 (or zip fallback). Useful for 'how is my zip trending' questions.",
  source: "attom-sales-trend",
  fetch: getAttomSalesTrend,
  shape: (raw) => raw,
});

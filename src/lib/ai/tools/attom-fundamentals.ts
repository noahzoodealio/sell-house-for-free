import "server-only";

import { getAttomProfile } from "@/lib/enrichment/attom-client";

import { defineAttomPropertyTool } from "@/lib/ai/tools/attom-shared";

export const getPropertyFundamentalsTool = defineAttomPropertyTool({
  name: "getPropertyFundamentals",
  description:
    "Read property fundamentals (sqft, beds, baths, year built, lot size, type) from ATTOM. Pass the property address; if omitted, the seller's subject address is used.",
  source: "attom-profile",
  fetch: async (addr) => {
    const profile = await getAttomProfile(addr);
    return profile ?? null;
  },
  shape: (raw) => raw,
});

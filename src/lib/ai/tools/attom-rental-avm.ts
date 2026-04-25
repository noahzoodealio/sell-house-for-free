import "server-only";

import { getAttomRentalAvm } from "@/lib/enrichment/attom-extended-client";

import { defineAttomPropertyTool } from "@/lib/ai/tools/attom-shared";

export const getRentalAvmTool = defineAttomPropertyTool({
  name: "getRentalAvm",
  description:
    "Estimated monthly rent for the property (ATTOM rental AVM). Useful for 'what could I rent this for' questions.",
  source: "attom-rental-avm",
  valuationDisclaimer: true,
  fetch: getAttomRentalAvm,
  shape: (raw) => raw,
});

import "server-only";

import { getAttomAssessment } from "@/lib/enrichment/attom-extended-client";

import { defineAttomPropertyTool } from "@/lib/ai/tools/attom-shared";

export const getAssessmentAndTaxTool = defineAttomPropertyTool({
  name: "getAssessmentAndTax",
  description:
    "Most recent assessor's value + property tax for the property. Useful for 'what's my assessed value' or 'what are taxes on this house' questions.",
  source: "attom-assessment",
  fetch: getAttomAssessment,
  shape: (raw) => raw,
});

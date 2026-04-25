import "server-only";

import { getAttomAssessmentHistory } from "@/lib/enrichment/attom-extended-client";

import { defineAttomPropertyTool } from "@/lib/ai/tools/attom-shared";

export const getAssessmentHistoryTool = defineAttomPropertyTool({
  name: "getAssessmentHistory",
  description:
    "Year-over-year assessor's value + tax history. Useful for 'how have my taxes trended' questions.",
  source: "attom-assessment-history",
  fetch: getAttomAssessmentHistory,
  shape: (raw) => raw,
});

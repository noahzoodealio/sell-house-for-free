import "server-only";

import { getAttomBuildingPermits } from "@/lib/enrichment/attom-extended-client";

import { defineAttomPropertyTool } from "@/lib/ai/tools/attom-shared";

interface PermitsShape {
  permits: unknown[];
}

export const getBuildingPermitsTool = defineAttomPropertyTool<PermitsShape>({
  name: "getBuildingPermits",
  description:
    "Recent building permits for the property. Useful for 'what work has been done on this house' questions.",
  source: "attom-permits",
  fetch: getAttomBuildingPermits,
  shape: (raw) => {
    if (typeof raw !== "object" || raw === null) return null;
    const property =
      "property" in raw ? (raw as { property: unknown[] }).property : null;
    if (!Array.isArray(property) || property.length === 0) return null;
    const first = property[0] as { building?: { permits?: unknown[] } };
    const permits = first.building?.permits ?? [];
    // Newest first; cap at 20 to keep prompt context bounded.
    const sorted = [...permits].sort((a, b) => {
      const ad =
        typeof (a as { effectiveDate?: string }).effectiveDate === "string"
          ? Date.parse((a as { effectiveDate: string }).effectiveDate)
          : 0;
      const bd =
        typeof (b as { effectiveDate?: string }).effectiveDate === "string"
          ? Date.parse((b as { effectiveDate: string }).effectiveDate)
          : 0;
      return bd - ad;
    });
    return { permits: sorted.slice(0, 20) };
  },
});

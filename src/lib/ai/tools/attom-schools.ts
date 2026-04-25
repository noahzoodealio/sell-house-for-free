import "server-only";

import { getAttomSchools } from "@/lib/enrichment/attom-extended-client";

import { defineAttomAreaTool } from "@/lib/ai/tools/attom-shared";

interface SchoolsShape {
  schools: unknown[];
}

export const getNearbySchoolsTool = defineAttomAreaTool<SchoolsShape>({
  name: "getNearbySchools",
  description:
    "Schools serving an ATTOM geoIdV4 (or zip fallback). Useful for 'what schools serve this address' questions. Capped at top 5 by distance.",
  source: "attom-schools",
  fetch: getAttomSchools,
  shape: (raw) => {
    if (typeof raw !== "object" || raw === null) return null;
    const list =
      "school" in raw && Array.isArray((raw as { school: unknown[] }).school)
        ? ((raw as { school: unknown[] }).school as Array<Record<string, unknown>>)
        : [];
    const top = list
      .map((s) => ({
        name: s.InstitutionName,
        type: s.schoolType,
        rating: s.schoolRating,
        gradeRange: s.gradeRange,
        distance: s.distanceFromSubject,
      }))
      .slice(0, 5);
    return { schools: top };
  },
});

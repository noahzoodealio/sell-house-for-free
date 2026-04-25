import "server-only";

import type { AddressFields } from "@/lib/seller-form/types";
import {
  attomGetJson,
  formatAddressParts,
  isAttomNoMatch,
} from "./attom-internals";

/**
 * E12-S5: thin wrappers for the ATTOM endpoints we cache durably but did
 * not need pre-AI-agent. Each returns the raw upstream payload (or null
 * on no-match) so the durable cache (E12-S2) can store raw JSON and the
 * E13 AI-agent tool surface can shape responses for the LLM separately.
 *
 * Network/HTTP/timeout/parse failures throw AttomError (re-using the
 * retry-once / timeout / config-validation discipline from
 * attom-internals.ts). Empty `property[]` (or area-equivalent root) is
 * mapped to `null` — the caller treats that as "no upstream match" and
 * may write a negative-cache row via durable-cache.markNegativeCache.
 *
 * Why raw payloads, not narrow extracts: getAttomProfile typed only the
 * 5 fields E4 uses because that's all the submission flow consumes. The
 * E13 AI-agent tools will rely on richer slices (sale price, assessor
 * land/improvement split, school rating tiers) that vary per question.
 * Storing raw also lets normalize.ts re-derive the EnrichmentSlot shape
 * as the ETL improves without re-paying ATTOM.
 */

const PER_PROPERTY = (path: string, addr: AddressFields): string => {
  const { address1, address2 } = formatAddressParts(addr);
  return `${path}?address1=${encodeURIComponent(
    address1,
  )}&address2=${encodeURIComponent(address2)}`;
};

const AREA = (path: string, geoIdV4: string): string =>
  `${path}?geoIdV4=${encodeURIComponent(geoIdV4)}`;

// ───────────────────────────── Per-property ─────────────────────────────

export async function getAttomAvm(
  addr: AddressFields,
): Promise<unknown | null> {
  const body = await attomGetJson(PER_PROPERTY("/attomavm/detail", addr));
  return isAttomNoMatch(body) ? null : body;
}

export async function getAttomAvmHistory(
  addr: AddressFields,
): Promise<unknown | null> {
  const body = await attomGetJson(PER_PROPERTY("/avmhistory/detail", addr));
  return isAttomNoMatch(body) ? null : body;
}

export async function getAttomSale(
  addr: AddressFields,
): Promise<unknown | null> {
  const body = await attomGetJson(PER_PROPERTY("/sale/snapshot", addr));
  return isAttomNoMatch(body) ? null : body;
}

export async function getAttomSalesHistory(
  addr: AddressFields,
): Promise<unknown | null> {
  const body = await attomGetJson(PER_PROPERTY("/saleshistory/detail", addr));
  return isAttomNoMatch(body) ? null : body;
}

export async function getAttomAssessment(
  addr: AddressFields,
): Promise<unknown | null> {
  const body = await attomGetJson(PER_PROPERTY("/assessment/detail", addr));
  return isAttomNoMatch(body) ? null : body;
}

export async function getAttomAssessmentHistory(
  addr: AddressFields,
): Promise<unknown | null> {
  const body = await attomGetJson(
    PER_PROPERTY("/assessmenthistory/detail", addr),
  );
  return isAttomNoMatch(body) ? null : body;
}

export async function getAttomBuildingPermits(
  addr: AddressFields,
): Promise<unknown | null> {
  const body = await attomGetJson(
    PER_PROPERTY("/property/buildingpermits", addr),
  );
  return isAttomNoMatch(body) ? null : body;
}

export async function getAttomRentalAvm(
  addr: AddressFields,
): Promise<unknown | null> {
  const body = await attomGetJson(PER_PROPERTY("/valuation/rentalavm", addr));
  return isAttomNoMatch(body) ? null : body;
}

// ───────────────────────────── Area-scope ─────────────────────────────

/**
 * /salestrend/snapshot — area sales trend keyed on GeoIDV4. Response
 * envelope uses `salestrend` (not `property`) as the array root.
 */
export async function getAttomSalesTrend(
  geoIdV4: string,
): Promise<unknown | null> {
  const body = await attomGetJson(AREA("/salestrend/snapshot", geoIdV4));
  return isAttomNoMatch(body, ["salestrend", "property"]) ? null : body;
}

/**
 * /school/search — school list for a GeoIDV4. ATTOM nests results under
 * `school` (singular) for this endpoint.
 */
export async function getAttomSchools(
  geoIdV4: string,
): Promise<unknown | null> {
  const body = await attomGetJson(AREA("/school/search", geoIdV4));
  return isAttomNoMatch(body, ["school", "property"]) ? null : body;
}

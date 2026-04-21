import { ATTRIBUTION_STORAGE_KEY } from "./draft";
import type { AttributionFields } from "./types";

const PARAM_MAP: ReadonlyArray<readonly [keyof AttributionFields, string]> = [
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "utm_campaign"],
  ["utmTerm", "utm_term"],
  ["utmContent", "utm_content"],
  ["gclid", "gclid"],
  ["gbraid", "gbraid"],
  ["wbraid", "wbraid"],
  ["gadSource", "gad_source"],
  ["gadCampaignId", "gad_campaign_id"],
];

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function readCached(): AttributionFields | null {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AttributionFields) : null;
  } catch {
    return null;
  }
}

export function captureAttribution(): AttributionFields {
  if (!isBrowser()) return {};

  const cached = readCached();
  if (cached) return cached;

  const params = new URLSearchParams(window.location.search);
  const captured: AttributionFields = {};

  for (const [key, param] of PARAM_MAP) {
    const value = params.get(param);
    if (value) captured[key] = value;
  }

  const referrer = document.referrer;
  if (referrer) captured.referrer = referrer;

  captured.entryPage = window.location.pathname;
  captured.entryTimestamp = new Date().toISOString();

  try {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(captured));
  } catch {
    // ignore storage failures — attribution is best-effort.
  }

  return captured;
}

export function readAttribution(): AttributionFields | null {
  if (!isBrowser()) return null;
  return readCached();
}

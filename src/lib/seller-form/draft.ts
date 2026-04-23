import type { EnrichmentSlot, SellerFormDraft } from "./types";

export const DRAFT_STORAGE_KEY = "shf:draft:v1";
export const IDEMPOTENCY_STORAGE_KEY = "shf:idk:v1";
export const ATTRIBUTION_STORAGE_KEY = "shf:attr:v1";
export const ENTRY_STORAGE_KEY = "shf:entry:v1";

const CURRENT_SCHEMA_VERSION = 1 as const;

export type PartialDraft = Partial<SellerFormDraft> & {
  schemaVersion?: typeof CURRENT_SCHEMA_VERSION;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function stripPii(partial: PartialDraft): PartialDraft {
  const copy: PartialDraft = { ...partial };
  delete copy.contact;
  // Enrichment is recomputable + session-scoped — never persisted to
  // localStorage. Kept in memory via the draft reducer for the current
  // tab only; re-fetched from the BFF on a fresh session.
  delete copy.enrichment;
  if (copy.consent) {
    copy.consent = {
      tcpa: stripAcceptedAt(partial.consent?.tcpa),
      terms: stripAcceptedAt(partial.consent?.terms),
      privacy: stripAcceptedAt(partial.consent?.privacy),
    } as PartialDraft["consent"];
  }
  return copy;
}

function stripAcceptedAt<T extends { acceptedAt?: string } | undefined>(
  agreement: T,
): T {
  if (!agreement) return agreement;
  const copy = { ...agreement };
  delete copy.acceptedAt;
  return copy;
}

export function readDraft(): PartialDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartialDraft;
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

export function writeDraft(partial: PartialDraft): void {
  if (!isBrowser()) return;
  const existing = readDraft() ?? {};
  const merged: PartialDraft = {
    ...existing,
    ...stripPii(partial),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // quota exceeded or storage unavailable — silently drop.
  }
}

/**
 * Assigns the enrichment slot onto the current draft. The `enrichment`
 * field is deliberately excluded from the localStorage write path (see
 * `stripPii`), so this is effectively a no-op on disk — the slot is
 * merged, then stripped, then the other draft fields are refreshed.
 * The hook that owns enrichment state keeps the live slot in memory +
 * sessionStorage; this call exists so consumers that read from the
 * draft (e.g. future server-action handoff) see a consistent shape.
 */
export function setEnrichment(slot: EnrichmentSlot): void {
  writeDraft({ enrichment: slot });
}

export function clearDraft(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
    sessionStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
    sessionStorage.removeItem(ENTRY_STORAGE_KEY);
  }
}

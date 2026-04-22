"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setEnrichment } from "@/lib/seller-form/draft";
import type {
  AddressFields,
  EnrichmentSlot,
} from "@/lib/seller-form/types";
import type { EnrichmentEnvelope } from "./types";

// ───────────────────────────── constants ─────────────────────────────

const DEBOUNCE_MS = 400;
const SESSION_KEY_PREFIX = "shf:enrich:v1:";
const AZ_ZIP_MIN = 85001;
const AZ_ZIP_MAX = 86556;

// ───────────────────────────── return type ─────────────────────────────

export type EnrichmentHookStatus =
  | "idle"
  | "loading"
  | "ok"
  | "no-match"
  | "out-of-area"
  | "timeout"
  | "error";

export type EnrichmentHookResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; slot: EnrichmentSlot }
  | { status: "no-match" }
  | { status: "out-of-area" }
  | { status: "timeout" }
  | { status: "error"; code?: string };

const IDLE: EnrichmentHookResult = { status: "idle" };
const LOADING: EnrichmentHookResult = { status: "loading" };
const OUT_OF_AREA: EnrichmentHookResult = { status: "out-of-area" };

// ───────────────────────────── helpers ─────────────────────────────

function isAzZip(zip: string): boolean {
  const n = Number.parseInt(zip, 10);
  if (!Number.isFinite(n)) return false;
  return n >= AZ_ZIP_MIN && n <= AZ_ZIP_MAX;
}

const DIRECTIONAL_MAP: Record<string, string> = {
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  northeast: "ne",
  northwest: "nw",
  southeast: "se",
  southwest: "sw",
};

function normalizeStringPart(input: string): string {
  const stripped = input
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped
    .split(" ")
    .map((tok) => DIRECTIONAL_MAP[tok] ?? tok)
    .join(" ");
}

function canonicalAddressString(addr: AddressFields): string {
  const street1 = normalizeStringPart(addr.street1);
  const street2 = addr.street2 ? normalizeStringPart(addr.street2) : "";
  const city = normalizeStringPart(addr.city);
  const zip = addr.zip.trim();
  return [street1, street2, city, "AZ", zip].join("|");
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function computeAddressCacheKey(addr: AddressFields): Promise<string> {
  const canonical = canonicalAddressString(addr);
  const encoded = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bufferToHex(digest);
}

function readSessionEnvelope(key: string): EnrichmentEnvelope | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as EnrichmentEnvelope;
  } catch {
    return null;
  }
}

function writeSessionEnvelope(key: string, envelope: EnrichmentEnvelope): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY_PREFIX + key, JSON.stringify(envelope));
  } catch {
    // quota or disabled — drop.
  }
}

function envelopeToResult(env: EnrichmentEnvelope): EnrichmentHookResult {
  switch (env.status) {
    case "ok":
    case "ok-partial":
      // Hook consumers (UI) don't need to distinguish — slot.sources carries
      // the per-source provenance when they care.
      return { status: "ok", slot: env.slot };
    case "no-match":
      return { status: "no-match" };
    case "out-of-area":
      return { status: "out-of-area" };
    case "timeout":
      return { status: "timeout" };
    case "error":
      return { status: "error", code: env.code };
  }
}

function envelopeToSlot(env: EnrichmentEnvelope): EnrichmentSlot {
  if (env.status === "ok" || env.status === "ok-partial") return env.slot;
  return {
    status: env.status,
    fetchedAt: new Date().toISOString(),
  };
}

function addressEquality(a: AddressFields, b: AddressFields): boolean {
  return (
    a.street1 === b.street1 &&
    (a.street2 ?? "") === (b.street2 ?? "") &&
    a.city === b.city &&
    a.state === b.state &&
    a.zip === b.zip
  );
}

// ───────────────────────────── hook ─────────────────────────────

type InFlightEntry = {
  controller: AbortController;
  promise: Promise<EnrichmentEnvelope>;
};

/**
 * Client hook that fetches `/api/enrich` for a completed address and
 * writes the resulting slot to the seller-form draft. Non-urgent via
 * `useTransition`; cancels in-flight on address change + unmount;
 * dedupes concurrent identical addresses; caches in sessionStorage;
 * short-circuits non-AZ zips without a round-trip.
 *
 * See story 7838 for the full AC list.
 */
export function useAddressEnrichment(
  address: AddressFields | null,
  submissionId?: string,
): EnrichmentHookResult {
  const [result, setResult] = useState<EnrichmentHookResult>(IDLE);
  const [, startTransition] = useTransition();

  // Persistent across renders — Strict Mode double-mount safety, dedupe.
  const inFlightRef = useRef<Map<string, InFlightEntry>>(new Map());
  const latestControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAddressRef = useRef<AddressFields | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Idle: null address → clear any in-flight + reset.
    if (address === null) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      latestControllerRef.current?.abort();
      latestControllerRef.current = null;
      lastAddressRef.current = null;
      setResult(IDLE);
      return;
    }

    // Re-run guard: same address across renders should not re-fire.
    if (
      lastAddressRef.current &&
      addressEquality(lastAddressRef.current, address)
    ) {
      return;
    }
    lastAddressRef.current = address;

    // AZ-zip guard: immediate out-of-area, no fetch.
    if (!isAzZip(address.zip)) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      latestControllerRef.current?.abort();
      latestControllerRef.current = null;
      setResult(OUT_OF_AREA);
      setEnrichment({
        status: "out-of-area",
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    // Async cache probe: if hit, skip loading + debounce entirely.
    void (async () => {
      let cacheKey: string;
      try {
        cacheKey = await computeAddressCacheKey(address);
      } catch {
        if (cancelled) return;
        setResult({ status: "error", code: "hash_failure" });
        return;
      }
      if (cancelled) return;

      const cached = readSessionEnvelope(cacheKey);
      if (cached) {
        startTransition(() => {
          setResult(envelopeToResult(cached));
          setEnrichment(envelopeToSlot(cached));
        });
        return;
      }

      // Cache miss: set loading, debounce the network call.
      setResult(LOADING);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        if (cancelled) return;
        void dispatchFetch(address, cacheKey);
      }, DEBOUNCE_MS);
    })();

    async function dispatchFetch(addr: AddressFields, cacheKey: string) {
      // Dedupe: reuse in-flight promise for same cacheKey.
      const existing = inFlightRef.current.get(cacheKey);
      if (existing) {
        try {
          const env = await existing.promise;
          if (cancelled) return;
          applyEnvelope(env, cacheKey);
        } catch {
          // aborted or errored — the primary dispatcher handles UI.
        }
        return;
      }

      const controller = new AbortController();
      latestControllerRef.current?.abort();
      latestControllerRef.current = controller;

      const promise = fetch("/api/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "enrich",
          submissionId: submissionId ?? crypto.randomUUID(),
          address: addr,
        }),
        signal: controller.signal,
      }).then(async (res): Promise<EnrichmentEnvelope> => {
        if (!res.ok) {
          return { status: "error", code: `http_${res.status}` };
        }
        return (await res.json()) as EnrichmentEnvelope;
      });

      inFlightRef.current.set(cacheKey, { controller, promise });

      try {
        const env = await promise;
        if (cancelled) return;
        applyEnvelope(env, cacheKey);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // superseded — newer dispatch owns UI.
        }
        if (cancelled) return;
        setResult({ status: "error", code: "network" });
      } finally {
        inFlightRef.current.delete(cacheKey);
        if (latestControllerRef.current === controller) {
          latestControllerRef.current = null;
        }
      }
    }

    function applyEnvelope(env: EnrichmentEnvelope, cacheKey: string) {
      writeSessionEnvelope(cacheKey, env);
      startTransition(() => {
        setResult(envelopeToResult(env));
        setEnrichment(envelopeToSlot(env));
      });
    }

    return () => {
      cancelled = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      latestControllerRef.current?.abort();
      latestControllerRef.current = null;
    };
  }, [address, submissionId]);

  return result;
}

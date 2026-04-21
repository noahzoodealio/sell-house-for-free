"use client";

import { useSyncExternalStore } from "react";
import { IDEMPOTENCY_STORAGE_KEY } from "./draft";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function getIdempotencyKey(): string {
  if (!isBrowser()) {
    return crypto.randomUUID();
  }
  const existing = sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  try {
    sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, fresh);
  } catch {
    // sessionStorage unavailable — return the fresh value without persisting.
  }
  return fresh;
}

const EMPTY_SUBSCRIBE = () => () => {};

export function useIdempotencyKey(): string | null {
  return useSyncExternalStore(
    EMPTY_SUBSCRIBE,
    () => getIdempotencyKey(),
    () => null,
  );
}

import { describe, expect, it } from "vitest";

import {
  DURABLE_AREA_TTL_MS,
  DURABLE_TTL_MS,
  NEGATIVE_CACHE_TTL_MS,
  isAreaStale,
  isNegativeCacheStale,
  isStale,
} from "../durable-cache-policy";

const NOW = new Date("2026-04-25T12:00:00.000Z");

function daysAgo(d: number): Date {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);
}

function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000);
}

describe("DURABLE_TTL_MS contract", () => {
  it("covers all 12 per-property endpoints", () => {
    expect(Object.keys(DURABLE_TTL_MS).sort()).toEqual(
      [
        "assessment",
        "assessment_history",
        "avm",
        "avm_history",
        "building_permits",
        "mls_details",
        "mls_history",
        "mls_search",
        "profile",
        "rental_avm",
        "sale",
        "sales_history",
      ].sort(),
    );
  });

  it("covers both area endpoints", () => {
    expect(Object.keys(DURABLE_AREA_TTL_MS).sort()).toEqual([
      "sales_trend",
      "schools",
    ]);
  });

  it("avm_history is indefinite (Infinity)", () => {
    expect(DURABLE_TTL_MS.avm_history).toBe(Infinity);
  });

  it("mls_search is 1 hour", () => {
    expect(DURABLE_TTL_MS.mls_search).toBe(60 * 60 * 1000);
  });

  it("profile is 90 days", () => {
    expect(DURABLE_TTL_MS.profile).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it("negative-cache TTL is 1 hour", () => {
    expect(NEGATIVE_CACHE_TTL_MS).toBe(60 * 60 * 1000);
  });
});

describe("isStale", () => {
  it("returns false within TTL", () => {
    expect(isStale("profile", daysAgo(30), NOW)).toBe(false);
  });

  it("returns true past TTL", () => {
    expect(isStale("profile", daysAgo(91), NOW)).toBe(true);
  });

  it("avm_history is never stale (indefinite)", () => {
    expect(isStale("avm_history", daysAgo(10000), NOW)).toBe(false);
  });

  it("mls_search stales after 1 hour", () => {
    expect(isStale("mls_search", hoursAgo(0.5), NOW)).toBe(false);
    expect(isStale("mls_search", hoursAgo(1.5), NOW)).toBe(true);
  });

  it("uses current time when now omitted", () => {
    // future fetchedAt — shouldn't be stale
    const future = new Date(Date.now() + 1000);
    expect(isStale("profile", future)).toBe(false);
  });
});

describe("isAreaStale", () => {
  it("schools stales after 90 days", () => {
    expect(isAreaStale("schools", daysAgo(89), NOW)).toBe(false);
    expect(isAreaStale("schools", daysAgo(91), NOW)).toBe(true);
  });

  it("sales_trend stales after 7 days", () => {
    expect(isAreaStale("sales_trend", daysAgo(6), NOW)).toBe(false);
    expect(isAreaStale("sales_trend", daysAgo(8), NOW)).toBe(true);
  });
});

describe("isNegativeCacheStale", () => {
  it("returns false within 1h", () => {
    expect(isNegativeCacheStale(hoursAgo(0.25), NOW)).toBe(false);
  });

  it("returns true past 1h", () => {
    expect(isNegativeCacheStale(hoursAgo(2), NOW)).toBe(true);
  });
});

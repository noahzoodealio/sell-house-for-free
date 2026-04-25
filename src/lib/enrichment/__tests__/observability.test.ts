import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  captureEnrichmentEvent,
  sanitizeEnrichmentExtras,
} from "../observability";

describe("sanitizeEnrichmentExtras", () => {
  it("keeps only allow-listed keys", () => {
    const out = sanitizeEnrichmentExtras({
      addressKey: "abc",
      endpoint: "profile",
      ageMs: 12345,
      // disallowed:
      sellerEmail: "x@y.com",
      street1: "123 Main",
    });
    expect(out).toEqual({
      addressKey: "abc",
      endpoint: "profile",
      ageMs: 12345,
    });
  });

  it("drops undefined values", () => {
    const out = sanitizeEnrichmentExtras({
      addressKey: "abc",
      endpoint: undefined,
    });
    expect(out).toEqual({ addressKey: "abc" });
  });
});

describe("captureEnrichmentEvent", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("info severity routes to console.log", () => {
    captureEnrichmentEvent({
      event: "enrichment_durable_hit",
      severity: "info",
      extras: { endpoint: "profile" },
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.event).toBe("enrichment_durable_hit");
    expect(payload.severity).toBe("info");
    expect(payload.endpoint).toBe("profile");
    expect(payload.eventId).toBeTruthy();
  });

  it("warning severity routes to console.error", () => {
    captureEnrichmentEvent({
      event: "enrichment_stale_refresh_skipped_outage",
      severity: "warning",
      error: new Error("attom timeout"),
      extras: { endpoint: "profile", outage: true },
    });
    expect(errSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(errSpy.mock.calls[0][0] as string);
    expect(payload.errorMessage).toBe("attom timeout");
    expect(payload.outage).toBe(true);
  });

  it("error severity routes to console.error", () => {
    captureEnrichmentEvent({
      event: "enrichment_upstream_error",
      severity: "error",
      error: new Error("attom http 500"),
    });
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  it("returns a unique eventId", () => {
    const a = captureEnrichmentEvent({
      event: "enrichment_durable_hit",
      severity: "info",
    });
    const b = captureEnrichmentEvent({
      event: "enrichment_durable_hit",
      severity: "info",
    });
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it("filters PII via sanitize even when caller passes disallowed keys", () => {
    captureEnrichmentEvent({
      event: "enrichment_upstream_error",
      severity: "error",
      extras: { addressKey: "key1", street1: "123 leak", endpoint: "profile" },
    });
    const payload = JSON.parse(errSpy.mock.calls[0][0] as string);
    expect(payload.addressKey).toBe("key1");
    expect(payload.endpoint).toBe("profile");
    expect(payload.street1).toBeUndefined();
  });
});

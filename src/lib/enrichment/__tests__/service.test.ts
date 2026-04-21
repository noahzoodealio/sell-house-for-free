import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T,>(fn: () => Promise<T>) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock("../mls-client", () => ({
  searchByAddress: vi.fn(),
  getAttomDetails: vi.fn(),
  getImages: vi.fn(),
}));

const ADDR = {
  street1: "123 Main St",
  city: "Phoenix",
  state: "AZ" as const,
  zip: "85004",
};

const UUID = "11111111-1111-4111-8111-111111111111";

describe("getEnrichment", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns out-of-area for non-AZ zip without hitting MLS", async () => {
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn(),
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    const { getEnrichment } = await import("../service");
    const env = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: { ...ADDR, zip: "90210" },
    });
    expect(env).toEqual({ status: "out-of-area" });
  });

  it("returns no-match when search returns null", async () => {
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce(null),
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    const { getEnrichment } = await import("../service");
    const env = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(env.status).toBe("no-match");
  });

  it("returns ok envelope with slot on happy path (not-listed skips images)", async () => {
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce({
        attomId: "a1",
        mlsRecordId: "m1",
        listingStatus: "Closed",
        bedrooms: 3,
        bathrooms: 2,
      }),
      getAttomDetails: vi.fn().mockResolvedValueOnce({
        bedrooms: 4,
        lotSize: 7200,
      }),
      getImages: vi.fn(),
    }));
    const { getEnrichment } = await import("../service");
    const env = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(env.status).toBe("ok");
    if (env.status === "ok") {
      expect(env.slot.attomId).toBe("a1");
      expect(env.slot.details?.bedrooms).toBe(4); // details overrides search
      expect(env.slot.details?.lotSize).toBe(7200);
      expect(env.slot.photos).toBeUndefined();
      expect(env.cacheHit).toBe(false);
    }
  });

  it("fetches images when listingStatus is currently-listed", async () => {
    const getImages = vi.fn().mockResolvedValueOnce([
      { url: "x/1.jpg", displayOrder: 1 },
    ]);
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce({
        attomId: "a1",
        mlsRecordId: "m1",
        listingStatus: "Active",
      }),
      getAttomDetails: vi.fn().mockResolvedValueOnce({ bedrooms: 3 }),
      getImages,
    }));
    const { getEnrichment } = await import("../service");
    const env = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(getImages).toHaveBeenCalledWith("m1");
    if (env.status === "ok") {
      expect(env.slot.listingStatus).toBe("currently-listed");
      expect(env.slot.photos).toHaveLength(1);
    }
  });

  it("survives details leg rejecting (falls back to search fields)", async () => {
    const { MlsError } = await import("../types");
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce({
        attomId: "a1",
        listingStatus: "Closed",
        bedrooms: 3,
        bathrooms: 2,
      }),
      getAttomDetails: vi
        .fn()
        .mockRejectedValueOnce(
          new MlsError({ code: "http", endpoint: "attom", status: 404 }),
        ),
      getImages: vi.fn(),
    }));
    const { getEnrichment } = await import("../service");
    const env = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(env.status).toBe("ok");
    if (env.status === "ok") {
      expect(env.slot.details?.bedrooms).toBe(3);
    }
  });

  it("returns timeout envelope when search throws MlsError 'timeout'", async () => {
    const { MlsError } = await import("../types");
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi
        .fn()
        .mockRejectedValueOnce(
          new MlsError({ code: "timeout", endpoint: "search" }),
        ),
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    const { getEnrichment } = await import("../service");
    const env = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(env).toEqual({ status: "timeout", retryable: true });
  });

  it("returns error envelope when search throws MlsError 'http'", async () => {
    const { MlsError } = await import("../types");
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi
        .fn()
        .mockRejectedValueOnce(
          new MlsError({ code: "http", endpoint: "search", status: 500 }),
        ),
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    const { getEnrichment } = await import("../service");
    const env = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(env.status).toBe("error");
  });

  it("marks cacheHit true on second call with identical address", async () => {
    const searchByAddress = vi.fn().mockResolvedValue({
      attomId: "a1",
      listingStatus: "Closed",
      bedrooms: 3,
    });
    vi.doMock("../mls-client", () => ({
      searchByAddress,
      getAttomDetails: vi.fn().mockResolvedValue({ bedrooms: 3 }),
      getImages: vi.fn(),
    }));
    const { getEnrichment } = await import("../service");
    const first = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    const second = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    if (first.status === "ok") expect(first.cacheHit).toBe(false);
    if (second.status === "ok") expect(second.cacheHit).toBe(true);
  });
});

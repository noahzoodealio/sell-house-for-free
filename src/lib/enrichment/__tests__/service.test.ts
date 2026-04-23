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

vi.mock("../attom-client", () => ({
  getAttomProfile: vi.fn(),
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
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns out-of-area envelope for non-AZ zip without hitting MLS or ATTOM", async () => {
    const getAttomProfile = vi.fn();
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn(),
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({ getAttomProfile }));
    const { getEnrichment } = await import("../service");
    const { envelope } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: { ...ADDR, zip: "90210" },
    });
    expect(envelope).toEqual({ status: "out-of-area" });
    expect(getAttomProfile).not.toHaveBeenCalled();
  });

  it("returns no-match when both sources yield no data (search null + ATTOM null)", async () => {
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce(null),
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({
      getAttomProfile: vi.fn().mockResolvedValueOnce(null),
    }));
    const { getEnrichment } = await import("../service");
    const { envelope } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(envelope.status).toBe("no-match");
  });

  it("both-ok path → status 'ok', sources ['mls','attom']", async () => {
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce({
        match: {
          attomId: "a1",
          mlsRecordId: "m1",
          listingStatus: "Closed",
          bedroomsTotal: 3,
          bathroomsFull: 2,
        },
      }),
      getAttomDetails: vi.fn().mockResolvedValueOnce({
        bedrooms: 4,
        lotSize: 7200,
      }),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({
      getAttomProfile: vi
        .fn()
        .mockResolvedValueOnce({ bedrooms: 5, yearBuilt: 2001 }),
    }));
    const { getEnrichment } = await import("../service");
    const { envelope, telemetry } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(envelope.status).toBe("ok");
    if (envelope.status === "ok") {
      expect(envelope.slot.details?.bedrooms).toBe(4); // mls-details beats search + attom
      expect(envelope.slot.details?.yearBuilt).toBe(2001); // attom fills gap
      expect(envelope.slot.details?.lotSize).toBe(7200); // mls-details
      expect(envelope.slot.sources).toEqual(["mls", "attom"]);
    }
    expect(telemetry.sources).toEqual(["mls", "attom"]);
    expect(telemetry.attomOk).toBe(true);
    expect(telemetry.attomLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("mls-only path (ATTOM throws) → status 'ok-partial', sources ['mls']", async () => {
    const { AttomError } = await import("../types");
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce({
        match: {
          attomId: "a1",
          listingStatus: "Closed",
          bedroomsTotal: 3,
        },
      }),
      getAttomDetails: vi.fn().mockResolvedValueOnce({ bedrooms: 3 }),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({
      getAttomProfile: vi
        .fn()
        .mockRejectedValueOnce(new AttomError({ code: "http", status: 502 })),
    }));
    const { getEnrichment } = await import("../service");
    const { envelope, telemetry } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(envelope.status).toBe("ok-partial");
    if (envelope.status === "ok-partial") {
      expect(envelope.slot.sources).toEqual(["mls"]);
    }
    expect(telemetry.sources).toEqual(["mls"]);
    expect(telemetry.attomOk).toBe(false);
  });

  it("attom-only path (MLS no-match + ATTOM ok) → status 'ok-partial', sources ['attom']", async () => {
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce(null),
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({
      getAttomProfile: vi.fn().mockResolvedValueOnce({
        bedrooms: 4,
        bathrooms: 2,
        squareFootage: 2100,
        yearBuilt: 1995,
        lotSize: 6500,
      }),
    }));
    const { getEnrichment } = await import("../service");
    const { envelope } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(envelope.status).toBe("ok-partial");
    if (envelope.status === "ok-partial") {
      expect(envelope.slot.sources).toEqual(["attom"]);
      expect(envelope.slot.details?.bedrooms).toBe(4);
      expect(envelope.slot.details?.lotSize).toBe(6500);
      expect(envelope.slot.attomId).toBeUndefined();
      expect(envelope.slot.mlsRecordId).toBeUndefined();
      expect(envelope.slot.listingStatus).toBeUndefined();
    }
  });

  it("both-fail path (MLS timeout + ATTOM throws) → status 'timeout'", async () => {
    const { MlsError, AttomError } = await import("../types");
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi
        .fn()
        .mockRejectedValueOnce(
          new MlsError({ code: "timeout", endpoint: "search" }),
        ),
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({
      getAttomProfile: vi
        .fn()
        .mockRejectedValueOnce(new AttomError({ code: "timeout" })),
    }));
    const { getEnrichment } = await import("../service");
    const { envelope } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(envelope).toEqual({ status: "timeout", retryable: true });
  });

  it("fetches images when MLS listingStatus is currently-listed", async () => {
    const getImages = vi.fn().mockResolvedValueOnce([
      { url: "x/1.jpg", displayOrder: 1 },
    ]);
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce({
        match: {
          attomId: "a1",
          mlsRecordId: "m1",
          listingStatus: "Active",
        },
      }),
      getAttomDetails: vi.fn().mockResolvedValueOnce({ bedrooms: 3 }),
      getImages,
    }));
    vi.doMock("../attom-client", () => ({
      getAttomProfile: vi.fn().mockResolvedValueOnce({ bedrooms: 3 }),
    }));
    const { getEnrichment } = await import("../service");
    const { envelope } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(getImages).toHaveBeenCalledWith("m1");
    if (envelope.status === "ok") {
      expect(envelope.slot.listingStatus).toBe("currently-listed");
      expect(envelope.slot.photos).toHaveLength(1);
    }
  });

  it("ENRICHMENT_SOURCES=mls disables ATTOM entirely (no fetch fired, ok status when mls match)", async () => {
    vi.stubEnv("ENRICHMENT_SOURCES", "mls");
    const getAttomProfile = vi.fn();
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce({
        match: {
          attomId: "a1",
          listingStatus: "Closed",
          bedroomsTotal: 3,
        },
      }),
      getAttomDetails: vi.fn().mockResolvedValueOnce({ bedrooms: 3 }),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({ getAttomProfile }));
    const { getEnrichment } = await import("../service");
    const { envelope, telemetry } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(getAttomProfile).not.toHaveBeenCalled();
    // mls is the only enabled source and it delivered → full 'ok'
    expect(envelope.status).toBe("ok");
    if (envelope.status === "ok") {
      expect(envelope.slot.sources).toEqual(["mls"]);
    }
    expect(telemetry.attomOk).toBe(false);
    expect(telemetry.attomLatencyMs).toBeUndefined();
  });

  it("marks cacheHit true on second call with identical address", async () => {
    const searchByAddress = vi.fn().mockResolvedValue({
      match: {
        attomId: "a1",
        listingStatus: "Closed",
        bedroomsTotal: 3,
      },
    });
    const getAttomProfile = vi.fn().mockResolvedValue({ bedrooms: 3 });
    vi.doMock("../mls-client", () => ({
      searchByAddress,
      getAttomDetails: vi.fn().mockResolvedValue({ bedrooms: 3 }),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({ getAttomProfile }));
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
    if (first.envelope.status === "ok") expect(first.envelope.cacheHit).toBe(false);
    if (second.envelope.status === "ok") expect(second.envelope.cacheHit).toBe(true);
  });

  it("survives MLS details leg rejecting (falls back to search + attom)", async () => {
    const { MlsError } = await import("../types");
    vi.doMock("../mls-client", () => ({
      searchByAddress: vi.fn().mockResolvedValueOnce({
        match: {
          attomId: "a1",
          listingStatus: "Closed",
          bedroomsTotal: 3,
          bathroomsFull: 2,
        },
      }),
      getAttomDetails: vi
        .fn()
        .mockRejectedValueOnce(
          new MlsError({ code: "http", endpoint: "attom", status: 404 }),
        ),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({
      getAttomProfile: vi.fn().mockResolvedValueOnce({ lotSize: 5500 }),
    }));
    const { getEnrichment } = await import("../service");
    const { envelope } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(envelope.status).toBe("ok"); // both mls+attom in sources
    if (envelope.status === "ok") {
      expect(envelope.slot.details?.bedrooms).toBe(3); // from search
      expect(envelope.slot.details?.lotSize).toBe(5500); // from attom (details 404'd)
    }
  });

  it("returns error envelope when MLS throws http error and ATTOM has no data", async () => {
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
    vi.doMock("../attom-client", () => ({
      getAttomProfile: vi.fn().mockResolvedValueOnce(null),
    }));
    const { getEnrichment } = await import("../service");
    const { envelope } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });
    expect(envelope.status).toBe("error");
  });
});

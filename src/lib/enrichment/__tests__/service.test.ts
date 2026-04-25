import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <T,>(fn: () => Promise<T>) => fn,
  revalidateTag: vi.fn(),
}));

// Durable-cache (E12-S4) reads from Supabase. Default-mock to a chain that
// returns null for every read (cache miss) and resolves writes silently
// so existing test expectations around upstream calls + envelope shapes
// remain valid. Tests that exercise durable-hit paths re-mock per-test.
vi.mock("@/lib/supabase/server", () => {
  const chain = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    }),
    upsert: () => Promise.resolve({ error: null }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    insert: () => Promise.resolve({ error: null }),
  });
  return { getSupabaseAdmin: () => ({ from: () => chain() }) };
});

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

  // ------------------------------------------------------------------
  // E12-S4: durable cache integration
  // ------------------------------------------------------------------

  it("E12-S4 durable hit (fresh profile + fresh mls_search) → upstream not called", async () => {
    const searchByAddress = vi.fn();
    const getAttomProfile = vi.fn();
    vi.doMock("../mls-client", () => ({
      searchByAddress,
      getAttomDetails: vi.fn().mockResolvedValueOnce({
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1800,
      }),
      getImages: vi.fn().mockResolvedValueOnce(undefined),
    }));
    vi.doMock("../attom-client", () => ({ getAttomProfile }));

    // Override Supabase mock to return fresh durable hits for both endpoints.
    const fresh = new Date().toISOString();
    vi.doMock("@/lib/supabase/server", () => ({
      getSupabaseAdmin: () => ({
        from: (table: string) => ({
          select: (cols: string) => ({
            eq: () => ({
              maybeSingle: async () => {
                if (table !== "property_enrichments") {
                  return { data: null, error: null };
                }
                if (cols.includes("attom_profile_payload")) {
                  return {
                    data: {
                      attom_profile_payload: {
                        bedrooms: 4,
                        bathrooms: 2.5,
                        squareFootage: 2400,
                        yearBuilt: 1998,
                      },
                      attom_profile_fetched_at: fresh,
                    },
                    error: null,
                  };
                }
                if (cols.includes("mls_search_payload")) {
                  return {
                    data: {
                      mls_search_payload: {
                        match: {
                          attomId: "a1",
                          mlsRecordId: "m1",
                          listingStatus: "Closed",
                          latestListingPrice: 500000,
                        },
                        history: [
                          { listingStatus: "Closed", latestListingPrice: 500000 },
                        ],
                        inlineImages: undefined,
                      },
                      mls_search_fetched_at: fresh,
                    },
                    error: null,
                  };
                }
                return { data: null, error: null };
              },
            }),
          }),
          upsert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          insert: () => Promise.resolve({ error: null }),
        }),
      }),
    }));

    const { getEnrichment } = await import("../service");
    const { envelope, telemetry } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });

    expect(envelope.status).toBe("ok");
    expect(telemetry.sources).toEqual(["mls", "attom"]);
    // Upstream wrappers were never called — durable cache short-circuited both.
    expect(searchByAddress).not.toHaveBeenCalled();
    expect(getAttomProfile).not.toHaveBeenCalled();
  });

  it("E12-S4 negative-cache short-circuit (sources=[] + fresh) → no-match without upstream calls", async () => {
    const searchByAddress = vi.fn();
    const getAttomProfile = vi.fn();
    vi.doMock("../mls-client", () => ({
      searchByAddress,
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({ getAttomProfile }));

    const fresh = new Date().toISOString();
    vi.doMock("@/lib/supabase/server", () => ({
      getSupabaseAdmin: () => ({
        from: () => ({
          select: (cols: string) => ({
            eq: () => ({
              maybeSingle: async () => {
                if (cols.includes("sources, updated_at")) {
                  return {
                    data: { sources: [], updated_at: fresh },
                    error: null,
                  };
                }
                return { data: null, error: null };
              },
            }),
          }),
          upsert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          insert: () => Promise.resolve({ error: null }),
        }),
      }),
    }));

    const { getEnrichment } = await import("../service");
    const { envelope, telemetry } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });

    expect(envelope.status).toBe("no-match");
    expect((envelope as { cacheHit: boolean }).cacheHit).toBe(true);
    expect(searchByAddress).not.toHaveBeenCalled();
    expect(getAttomProfile).not.toHaveBeenCalled();
    expect(telemetry.sources).toEqual([]);
  });

  it("E12-S4 stale durable + upstream success → upstream called and durable refreshed", async () => {
    const searchByAddress = vi.fn().mockResolvedValueOnce(null);
    const getAttomProfile = vi.fn().mockResolvedValueOnce({
      bedrooms: 5,
      bathrooms: 3,
      squareFootage: 3000,
      yearBuilt: 2010,
    });
    vi.doMock("../mls-client", () => ({
      searchByAddress,
      getAttomDetails: vi.fn(),
      getImages: vi.fn(),
    }));
    vi.doMock("../attom-client", () => ({ getAttomProfile }));

    // Stale: 200 days old (profile TTL is 90d).
    const stale = new Date(
      Date.now() - 200 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let writeCount = 0;
    vi.doMock("@/lib/supabase/server", () => ({
      getSupabaseAdmin: () => ({
        from: (table: string) => ({
          select: (cols: string) => ({
            eq: () => ({
              maybeSingle: async () => {
                if (
                  table === "property_enrichments" &&
                  cols.includes("attom_profile_payload")
                ) {
                  return {
                    data: {
                      attom_profile_payload: {
                        bedrooms: 1,
                        bathrooms: 1,
                        squareFootage: 500,
                      },
                      attom_profile_fetched_at: stale,
                    },
                    error: null,
                  };
                }
                return { data: null, error: null };
              },
            }),
          }),
          upsert: () => {
            writeCount++;
            return Promise.resolve({ error: null });
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          insert: () => Promise.resolve({ error: null }),
        }),
      }),
    }));

    const { getEnrichment } = await import("../service");
    const { envelope, telemetry } = await getEnrichment({
      kind: "enrich",
      submissionId: UUID,
      address: ADDR,
    });

    expect(envelope.status).toBe("ok-partial");
    expect(telemetry.attomOk).toBe(true);
    expect(getAttomProfile).toHaveBeenCalledTimes(1);
    expect(writeCount).toBeGreaterThan(0);
  });
});

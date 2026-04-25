import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { MlsError } from "../types";

const BASE = "https://mls.example.test";
const ADDR = {
  street1: "123 Main St",
  city: "Phoenix",
  state: "AZ" as const,
  zip: "85004",
};

function detailsOnly(details: Record<string, unknown>) {
  return { details, images: [] };
}

function mockFetchOnce(bodies: Array<{ status?: number; body?: unknown; throw?: "abort" | "fetch" }>): MockInstance {
  const mock = vi.fn();
  for (const b of bodies) {
    if (b.throw === "abort") {
      const err = new Error("signal aborted");
      err.name = "AbortError";
      mock.mockRejectedValueOnce(err);
    } else if (b.throw === "fetch") {
      mock.mockRejectedValueOnce(new TypeError("fetch failed"));
    } else {
      const status = b.status ?? 200;
      mock.mockResolvedValueOnce(
        new Response(
          typeof b.body === "string" ? b.body : JSON.stringify(b.body ?? {}),
          {
            status,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    }
  }
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("mls-client", () => {
  beforeEach(() => {
    vi.stubEnv("MLS_API_BASE_URL", BASE);
    vi.stubEnv("MLS_API_TOKEN", "");
    vi.stubEnv("ENRICHMENT_TIMEOUT_MS", "4000");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("searchByAddress", () => {
    it("picks the lifecycle record with the most recent statusChangeDate for a matching home", async () => {
      mockFetchOnce([
        {
          body: {
            items: [
              detailsOnly({
                attomId: "aOld",
                mlsRecordId: "mOld",
                propertyAddressHouseNumber: "123",
                propertyAddressStreetName: "MAIN",
                propertyAddressZip: "85004",
                statusChangeDate: "2019-06-01T00:00:00Z",
                listingStatus: "Closed",
              }),
              detailsOnly({
                attomId: "aNewest",
                mlsRecordId: "mNewest",
                propertyAddressHouseNumber: "123",
                propertyAddressStreetName: "MAIN",
                propertyAddressZip: "85004",
                statusChangeDate: "2024-11-12T00:00:00Z",
                listingStatus: "Active",
                bedroomsTotal: 3,
              }),
              // Sibling house number on a different street — must be
              // rejected even though zip + house# match.
              detailsOnly({
                attomId: "aSibling",
                propertyAddressHouseNumber: "123",
                propertyAddressStreetName: "ELM",
                propertyAddressZip: "85004",
                statusChangeDate: "2026-01-01T00:00:00Z",
              }),
            ],
          },
        },
      ]);
      const { searchByAddress } = await import("../mls-client");
      const result = await searchByAddress(ADDR);
      expect(result?.match.attomId).toBe("aNewest");
    });

    it("returns null when no item shares the caller's zip + house + street", async () => {
      mockFetchOnce([
        {
          body: {
            items: [
              detailsOnly({
                propertyAddressHouseNumber: "999",
                propertyAddressStreetName: "MAIN",
                propertyAddressZip: "85004",
              }),
            ],
          },
        },
      ]);
      const { searchByAddress } = await import("../mls-client");
      expect(await searchByAddress(ADDR)).toBeNull();
    });

    it("retries once on 500 then returns data on 200", async () => {
      const mock = mockFetchOnce([
        { status: 500 },
        {
          body: {
            items: [
              detailsOnly({
                attomId: "a1",
                propertyAddressHouseNumber: "123",
                propertyAddressStreetName: "MAIN",
                propertyAddressZip: "85004",
              }),
            ],
          },
        },
      ]);
      const { searchByAddress } = await import("../mls-client");
      const result = await searchByAddress(ADDR);
      expect(result?.match.attomId).toBe("a1");
      expect(mock).toHaveBeenCalledTimes(2);
    });

    it("throws MlsError 'http' after two 500s", async () => {
      mockFetchOnce([{ status: 500 }, { status: 502 }]);
      const { searchByAddress } = await import("../mls-client");
      await expect(searchByAddress(ADDR)).rejects.toMatchObject({
        code: "http",
        status: 502,
        endpoint: "search",
      });
    });

    it("throws MlsError 'timeout' after two AbortErrors", async () => {
      mockFetchOnce([{ throw: "abort" }, { throw: "abort" }]);
      const { searchByAddress } = await import("../mls-client");
      await expect(searchByAddress(ADDR)).rejects.toMatchObject({
        code: "timeout",
        endpoint: "search",
      });
    });

    it("does not retry on 4xx", async () => {
      const mock = mockFetchOnce([{ status: 400 }]);
      const { searchByAddress } = await import("../mls-client");
      await expect(searchByAddress(ADDR)).rejects.toMatchObject({
        code: "http",
        status: 400,
      });
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it("throws MlsError 'parse' on non-JSON body", async () => {
      mockFetchOnce([{ body: "not json at all" as unknown as object }]);
      // override to raw non-json
      vi.unstubAllGlobals();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response("<html></html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
        ),
      );
      const { searchByAddress } = await import("../mls-client");
      await expect(searchByAddress(ADDR)).rejects.toMatchObject({
        code: "parse",
        endpoint: "search",
      });
    });

    it("throws MlsError 'config' when base URL unset", async () => {
      vi.stubEnv("MLS_API_BASE_URL", "");
      const { searchByAddress } = await import("../mls-client");
      await expect(searchByAddress(ADDR)).rejects.toMatchObject({
        code: "config",
      });
    });

    it("includes bearer header only when token is set", async () => {
      vi.stubEnv("MLS_API_TOKEN", "secret123");
      const mock = mockFetchOnce([{ body: { items: [] } }]);
      const { searchByAddress } = await import("../mls-client");
      await searchByAddress(ADDR);
      const [, init] = mock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer secret123");
    });

    it("omits Authorization when token is empty", async () => {
      const mock = mockFetchOnce([{ body: { items: [] } }]);
      const { searchByAddress } = await import("../mls-client");
      await searchByAddress(ADDR);
      const [, init] = mock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe("getAttomDetails", () => {
    it("returns body on 200", async () => {
      mockFetchOnce([{ body: { bedrooms: 4, bathrooms: 2.5 } }]);
      const { getAttomDetails } = await import("../mls-client");
      const d = await getAttomDetails("attom-123");
      expect(d.bedrooms).toBe(4);
    });

    it("throws MlsError http 404 on 404 (no retry)", async () => {
      const mock = mockFetchOnce([{ status: 404 }]);
      const { getAttomDetails } = await import("../mls-client");
      await expect(getAttomDetails("stale")).rejects.toMatchObject({
        code: "http",
        status: 404,
      });
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it("retries once on 500 then returns on 200", async () => {
      const mock = mockFetchOnce([
        { status: 500 },
        { body: { bedrooms: 3 } },
      ]);
      const { getAttomDetails } = await import("../mls-client");
      const d = await getAttomDetails("attom-1");
      expect(d.bedrooms).toBe(3);
      expect(mock).toHaveBeenCalledTimes(2);
    });

    it("throws parse on malformed JSON", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response("not-json", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
        ),
      );
      const { getAttomDetails } = await import("../mls-client");
      await expect(getAttomDetails("a1")).rejects.toMatchObject({
        code: "parse",
      });
    });
  });

  describe("getImages", () => {
    it("returns array on 200", async () => {
      mockFetchOnce([{ body: [{ url: "https://x/1.jpg" }] }]);
      const { getImages } = await import("../mls-client");
      const imgs = await getImages("mls-1");
      expect(imgs).toHaveLength(1);
    });

    it("returns empty array when MLS returns []", async () => {
      mockFetchOnce([{ body: [] }]);
      const { getImages } = await import("../mls-client");
      expect(await getImages("mls-1")).toEqual([]);
    });

    it("throws parse when body is object not array", async () => {
      mockFetchOnce([{ body: { images: [] } }]);
      const { getImages } = await import("../mls-client");
      await expect(getImages("mls-1")).rejects.toMatchObject({
        code: "parse",
      });
    });

    it("retries once on network failure then succeeds", async () => {
      const mock = mockFetchOnce([
        { throw: "fetch" },
        { body: [{ url: "https://x/1.jpg" }] },
      ]);
      const { getImages } = await import("../mls-client");
      const imgs = await getImages("mls-1");
      expect(imgs).toHaveLength(1);
      expect(mock).toHaveBeenCalledTimes(2);
    });
  });

  describe("MlsError", () => {
    it("is an Error with code + endpoint + optional status", () => {
      const e = new MlsError({ code: "http", endpoint: "search", status: 500 });
      expect(e).toBeInstanceOf(Error);
      expect(e.code).toBe("http");
      expect(e.endpoint).toBe("search");
      expect(e.status).toBe(500);
      expect(e.name).toBe("MlsError");
    });
  });

  describe("getListingHistory (E12-S5)", () => {
    it("hits /api/Listings/{id}/history and returns array body", async () => {
      const events = [
        { eventType: "listed", at: "2026-04-01T00:00:00Z" },
        { eventType: "price_change", at: "2026-04-15T00:00:00Z" },
      ];
      const mock = mockFetchOnce([{ body: events }]);
      const { getListingHistory } = await import("../mls-client");

      const result = await getListingHistory("mls-1");

      expect(result).toEqual(events);
      const url = mock.mock.calls[0][0] as string;
      expect(url).toBe(`${BASE}/api/Listings/mls-1/history`);
    });

    it("encodes mlsRecordId in path", async () => {
      const mock = mockFetchOnce([{ body: [] }]);
      const { getListingHistory } = await import("../mls-client");
      await getListingHistory("rec/with/slashes");
      const url = mock.mock.calls[0][0] as string;
      expect(url).toContain("rec%2Fwith%2Fslashes");
    });

    it("throws parse error when body is object not array", async () => {
      mockFetchOnce([{ body: { not: "an array" } }]);
      const { getListingHistory } = await import("../mls-client");
      await expect(getListingHistory("mls-1")).rejects.toMatchObject({
        code: "parse",
        endpoint: "history",
      });
    });

    it("retries once on 5xx then succeeds", async () => {
      const mock = mockFetchOnce([
        { status: 503 },
        { body: [{ eventType: "listed" }] },
      ]);
      const { getListingHistory } = await import("../mls-client");
      const result = await getListingHistory("mls-1");
      expect(result).toHaveLength(1);
      expect(mock).toHaveBeenCalledTimes(2);
    });

    it("does not retry on 404", async () => {
      const mock = mockFetchOnce([{ status: 404 }]);
      const { getListingHistory } = await import("../mls-client");
      await expect(getListingHistory("missing")).rejects.toMatchObject({
        code: "http",
        status: 404,
      });
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });
});

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { AttomError } from "../types";

const BASE = "https://attom.example.test/propertyapi/v1.0.0";
const TOKEN = "test-attom-key";
const ADDR = {
  street1: "123 Main St",
  city: "Phoenix",
  state: "AZ" as const,
  zip: "85004",
};

function mockFetchOnce(
  bodies: Array<{ status?: number; body?: unknown; throw?: "abort" | "fetch" }>,
): MockInstance {
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

// Full-shape ATTOM property node with all five fields populated.
// Keys match ATTOM's live expandedprofile response (camelCase).
function fullProperty(): unknown {
  return {
    property: [
      {
        building: {
          rooms: { beds: 4, bathsTotal: 2.5 },
          size: { universalSize: 2400, livingSize: 2400 },
        },
        summary: { yearBuilt: 1998 },
        lot: { lotSize2: 7200 },
      },
    ],
  };
}

describe("attom-client", () => {
  beforeEach(() => {
    vi.stubEnv("ATTOM_API_BASE_URL", BASE);
    vi.stubEnv("ATTOM_PRIVATE_TOKEN", TOKEN);
    vi.stubEnv("ENRICHMENT_TIMEOUT_MS", "4000");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns all five fields on happy-path 200", async () => {
    mockFetchOnce([{ body: fullProperty() }]);
    const { getAttomProfile } = await import("../attom-client");
    const profile = await getAttomProfile(ADDR);
    expect(profile).toEqual({
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2400,
      yearBuilt: 1998,
      lotSize: 7200,
    });
  });

  it("returns only populated fields when ATTOM response is partial", async () => {
    mockFetchOnce([
      {
        body: {
          property: [
            {
              building: { rooms: { beds: 3 } },
              summary: { yearBuilt: 2001 },
            },
          ],
        },
      },
    ]);
    const { getAttomProfile } = await import("../attom-client");
    const profile = await getAttomProfile(ADDR);
    expect(profile?.bedrooms).toBe(3);
    expect(profile?.yearBuilt).toBe(2001);
    expect(profile?.bathrooms).toBeUndefined();
    expect(profile?.squareFootage).toBeUndefined();
    expect(profile?.lotSize).toBeUndefined();
  });

  it("squareFootage falls back to livingSize then bldgSize when universalSize missing", async () => {
    mockFetchOnce([
      {
        body: {
          property: [
            {
              building: { size: { livingSize: 2100, bldgSize: 2200 } },
            },
          ],
        },
      },
    ]);
    const { getAttomProfile } = await import("../attom-client");
    expect((await getAttomProfile(ADDR))?.squareFootage).toBe(2100);
  });

  it("returns null when property[] is empty (no-match)", async () => {
    mockFetchOnce([{ body: { property: [] } }]);
    const { getAttomProfile } = await import("../attom-client");
    expect(await getAttomProfile(ADDR)).toBeNull();
  });

  it("retries once on 500 then returns data on 200", async () => {
    const mock = mockFetchOnce([{ status: 500 }, { body: fullProperty() }]);
    const { getAttomProfile } = await import("../attom-client");
    const profile = await getAttomProfile(ADDR);
    expect(profile?.bedrooms).toBe(4);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("throws AttomError 'http' after two 500s", async () => {
    mockFetchOnce([{ status: 500 }, { status: 502 }]);
    const { getAttomProfile } = await import("../attom-client");
    await expect(getAttomProfile(ADDR)).rejects.toMatchObject({
      code: "http",
      status: 502,
    });
  });

  it("does not retry on 4xx", async () => {
    const mock = mockFetchOnce([{ status: 401 }]);
    const { getAttomProfile } = await import("../attom-client");
    await expect(getAttomProfile(ADDR)).rejects.toMatchObject({
      code: "http",
      status: 401,
    });
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("retries once on AbortError then succeeds", async () => {
    const mock = mockFetchOnce([
      { throw: "abort" },
      { body: fullProperty() },
    ]);
    const { getAttomProfile } = await import("../attom-client");
    const profile = await getAttomProfile(ADDR);
    expect(profile?.bedrooms).toBe(4);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("throws AttomError 'timeout' after two AbortErrors", async () => {
    mockFetchOnce([{ throw: "abort" }, { throw: "abort" }]);
    const { getAttomProfile } = await import("../attom-client");
    await expect(getAttomProfile(ADDR)).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("throws AttomError 'parse' on non-JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response("<html>error page</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );
    const { getAttomProfile } = await import("../attom-client");
    await expect(getAttomProfile(ADDR)).rejects.toMatchObject({
      code: "parse",
    });
  });

  it("throws AttomError 'config' when ATTOM_PRIVATE_TOKEN is unset (no fetch fires)", async () => {
    vi.stubEnv("ATTOM_PRIVATE_TOKEN", "");
    const mock = vi.fn();
    vi.stubGlobal("fetch", mock);
    const { getAttomProfile } = await import("../attom-client");
    await expect(getAttomProfile(ADDR)).rejects.toMatchObject({
      code: "config",
    });
    expect(mock).not.toHaveBeenCalled();
  });

  it("throws AttomError 'config' when ATTOM_API_BASE_URL is unset", async () => {
    vi.stubEnv("ATTOM_API_BASE_URL", "");
    const { getAttomProfile } = await import("../attom-client");
    await expect(getAttomProfile(ADDR)).rejects.toMatchObject({
      code: "config",
    });
  });

  it("retries once on fetch TypeError then throws network", async () => {
    const mock = mockFetchOnce([{ throw: "fetch" }, { throw: "fetch" }]);
    const { getAttomProfile } = await import("../attom-client");
    await expect(getAttomProfile(ADDR)).rejects.toMatchObject({
      code: "network",
    });
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("sends apikey header and encodes address1/address2 query params", async () => {
    const mock = mockFetchOnce([{ body: fullProperty() }]);
    const { getAttomProfile } = await import("../attom-client");
    await getAttomProfile({ ...ADDR, street2: "Apt 4" });
    const [url, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(
      `${BASE}/property/expandedprofile?address1=${encodeURIComponent(
        "123 Main St Apt 4",
      )}&address2=${encodeURIComponent("Phoenix, AZ 85004")}`,
    );
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe(TOKEN);
    expect(headers.Accept).toBe("application/json");
  });

  describe("AttomError", () => {
    it("is an Error with code and optional status", () => {
      const e = new AttomError({ code: "http", status: 500 });
      expect(e).toBeInstanceOf(Error);
      expect(e.code).toBe("http");
      expect(e.status).toBe(500);
      expect(e.name).toBe("AttomError");
    });
  });
});

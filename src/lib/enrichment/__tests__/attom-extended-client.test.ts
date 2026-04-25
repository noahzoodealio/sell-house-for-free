import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAttomAssessment,
  getAttomAssessmentHistory,
  getAttomAvm,
  getAttomAvmHistory,
  getAttomBuildingPermits,
  getAttomRentalAvm,
  getAttomSale,
  getAttomSalesHistory,
  getAttomSalesTrend,
  getAttomSchools,
} from "../attom-extended-client";
import { AttomError } from "../types";

const BASE = "https://attom.example.test/propertyapi/v1.0.0";
const TOKEN = "test-attom-key";
const ADDR = {
  street1: "123 Main St",
  city: "Phoenix",
  state: "AZ" as const,
  zip: "85004",
};
const GEO = "G06037ABC";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.ATTOM_API_BASE_URL = BASE;
  process.env.ATTOM_PRIVATE_TOKEN = TOKEN;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("per-property endpoints", () => {
  it("getAttomAvm hits /attomavm/detail with address1 + address2", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ property: [{ avm: { amount: 425000 } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAttomAvm(ADDR);

    expect(result).toEqual({ property: [{ avm: { amount: 425000 } }] });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/attomavm/detail?");
    expect(calledUrl).toContain("address1=123%20Main%20St");
    expect(calledUrl).toContain("address2=Phoenix%2C%20AZ%2085004");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).apikey).toBe(TOKEN);
  });

  it("returns null when property[] is empty (no-match)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ property: [] })));
    const result = await getAttomAvm(ADDR);
    expect(result).toBeNull();
  });

  it("returns null when body lacks property root", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ status: { code: 0 } })));
    const result = await getAttomAvm(ADDR);
    expect(result).toBeNull();
  });

  it("getAttomSalesHistory hits /saleshistory/detail", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ property: [{ saleshistory: [] }] }));
    vi.stubGlobal("fetch", fetchMock);
    await getAttomSalesHistory(ADDR);
    expect(fetchMock.mock.calls[0][0]).toContain("/saleshistory/detail?");
  });

  it("getAttomSale hits /sale/snapshot", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ property: [{ sale: {} }] }));
    vi.stubGlobal("fetch", fetchMock);
    await getAttomSale(ADDR);
    expect(fetchMock.mock.calls[0][0]).toContain("/sale/snapshot?");
  });

  it("getAttomAssessment hits /assessment/detail", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ property: [{ assessment: {} }] }));
    vi.stubGlobal("fetch", fetchMock);
    await getAttomAssessment(ADDR);
    expect(fetchMock.mock.calls[0][0]).toContain("/assessment/detail?");
  });

  it("getAttomAssessmentHistory hits /assessmenthistory/detail", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ property: [{}] }));
    vi.stubGlobal("fetch", fetchMock);
    await getAttomAssessmentHistory(ADDR);
    expect(fetchMock.mock.calls[0][0]).toContain("/assessmenthistory/detail?");
  });

  it("getAttomBuildingPermits hits /property/buildingpermits", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ property: [{}] }));
    vi.stubGlobal("fetch", fetchMock);
    await getAttomBuildingPermits(ADDR);
    expect(fetchMock.mock.calls[0][0]).toContain("/property/buildingpermits?");
  });

  it("getAttomRentalAvm hits /valuation/rentalavm", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ property: [{ rentalAvm: {} }] }));
    vi.stubGlobal("fetch", fetchMock);
    await getAttomRentalAvm(ADDR);
    expect(fetchMock.mock.calls[0][0]).toContain("/valuation/rentalavm?");
  });

  it("getAttomAvmHistory hits /avmhistory/detail", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ property: [{}] }));
    vi.stubGlobal("fetch", fetchMock);
    await getAttomAvmHistory(ADDR);
    expect(fetchMock.mock.calls[0][0]).toContain("/avmhistory/detail?");
  });
});

describe("area-scope endpoints", () => {
  it("getAttomSalesTrend hits /salestrend/snapshot with geoIdV4", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ salestrend: [{ year: 2026, count: 200 }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAttomSalesTrend(GEO);

    expect(result).toEqual({ salestrend: [{ year: 2026, count: 200 }] });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/salestrend/snapshot?");
    expect(url).toContain(`geoIdV4=${GEO}`);
  });

  it("getAttomSchools recognizes 'school' root for no-match check", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ school: [{ name: "X" }] })));
    const result = await getAttomSchools(GEO);
    expect(result).toEqual({ school: [{ name: "X" }] });
  });

  it("getAttomSchools returns null when school[] empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ school: [] })));
    const result = await getAttomSchools(GEO);
    expect(result).toBeNull();
  });

  it("getAttomSalesTrend returns null when salestrend[] empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ salestrend: [] })));
    const result = await getAttomSalesTrend(GEO);
    expect(result).toBeNull();
  });
});

describe("error + retry behavior (shared infrastructure)", () => {
  it("throws AttomError on config missing", async () => {
    delete process.env.ATTOM_API_BASE_URL;
    await expect(getAttomAvm(ADDR)).rejects.toBeInstanceOf(AttomError);
  });

  it("retries once on 5xx then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ property: [{ ok: true }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAttomSale(ADDR);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ property: [{ ok: true }] });
  });

  it("does not retry on 4xx", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAttomSale(ADDR)).rejects.toBeInstanceOf(AttomError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

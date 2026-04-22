import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

const TEST_UUID = "11111111-1111-4111-8111-111111111111";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/enrich", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const happyEnrichBody = {
  kind: "enrich" as const,
  submissionId: TEST_UUID,
  address: {
    street1: "123 Main St",
    city: "Phoenix",
    state: "AZ" as const,
    zip: "85004",
  },
};

describe("POST /api/enrich", () => {
  const originalMock = process.env.ENRICHMENT_DEV_MOCK;

  beforeEach(() => {
    process.env.ENRICHMENT_DEV_MOCK = "true";
  });

  afterEach(() => {
    if (originalMock === undefined) {
      delete process.env.ENRICHMENT_DEV_MOCK;
    } else {
      process.env.ENRICHMENT_DEV_MOCK = originalMock;
    }
  });

  it("returns 200 + ok envelope for happy enrich (dev mock)", async () => {
    // @ts-expect-error — NextRequest accepts a Request in the Next runtime
    const res = await POST(makeRequest(happyEnrichBody));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Vary")).toBe("Accept-Encoding");
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.slot.details.bedrooms).toBe(3);
    expect(body.cacheHit).toBe(false);
  });

  it("returns 200 + ok envelope for suggest (dev mock)", async () => {
    const res = await POST(
      // @ts-expect-error — NextRequest accepts a Request in the Next runtime
      makeRequest({ kind: "suggest", query: "123 Main" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeLessThanOrEqual(5);
  });

  it("returns 200 + timeout envelope when dev-mock trigger fires", async () => {
    const res = await POST(
      // @ts-expect-error — NextRequest accepts a Request in the Next runtime
      makeRequest({
        ...happyEnrichBody,
        address: { ...happyEnrichBody.address, street1: "__TIMEOUT__" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "timeout", retryable: true });
  });

  it("returns 200 + out-of-area envelope for non-AZ zip (defense-in-depth)", async () => {
    // Zod allows only AZ zips (85xxx/86xxx). Send a valid-shape but
    // borderline zip still in the AZ range — out-of-area is the
    // envelope surfaced by fixtures when street1 === '__OUTAREA__'.
    const res = await POST(
      // @ts-expect-error — NextRequest accepts a Request in the Next runtime
      makeRequest({
        ...happyEnrichBody,
        address: { ...happyEnrichBody.address, street1: "__OUTAREA__" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("out-of-area");
  });

  it("returns 400 + invalid_input on unknown kind", async () => {
    // @ts-expect-error — NextRequest accepts a Request in the Next runtime
    const res = await POST(makeRequest({ kind: "nope" }));
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("returns 400 + invalid_input on malformed JSON", async () => {
    const req = new Request("http://localhost/api/enrich", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "}}not json{{",
    });
    // @ts-expect-error — NextRequest accepts a Request in the Next runtime
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("returns 400 on non-AZ state literal", async () => {
    const res = await POST(
      // @ts-expect-error — NextRequest accepts a Request in the Next runtime
      makeRequest({
        ...happyEnrichBody,
        address: { ...happyEnrichBody.address, state: "CA" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on non-AZ zip (Zod regex)", async () => {
    const res = await POST(
      // @ts-expect-error — NextRequest accepts a Request in the Next runtime
      makeRequest({
        ...happyEnrichBody,
        address: { ...happyEnrichBody.address, zip: "90210" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 + error envelope when mock is off and MLS config is missing", async () => {
    process.env.ENRICHMENT_DEV_MOCK = "false";
    const prevBase = process.env.MLS_API_BASE_URL;
    delete process.env.MLS_API_BASE_URL;
    try {
      // @ts-expect-error — NextRequest accepts a Request in the Next runtime
      const res = await POST(makeRequest(happyEnrichBody));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("error");
    } finally {
      if (prevBase) process.env.MLS_API_BASE_URL = prevBase;
    }
  });

  it("does not echo submissionId in the response body", async () => {
    // @ts-expect-error — NextRequest accepts a Request in the Next runtime
    const res = await POST(makeRequest(happyEnrichBody));
    const body = await res.json();
    expect(body).not.toHaveProperty("submissionId");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCustomerByEmail,
  getOffervanaProperty,
  listOffersV2,
} from "../outer-api-client";

describe("src/lib/offervana/outer-api-client", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env.ZOODEALIO_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("sends the ApiKey header on every call", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: { id: 42 }, success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await getCustomerByEmail("seller@example.com", { fetchImpl });

    const [, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect((init.headers as Record<string, string>).ApiKey).toBe("test-api-key");
  });

  it("unwraps ABP envelope { result, success } on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ result: { id: 7, email: "a@b.com" }, success: true }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await getCustomerByEmail("a@b.com", { fetchImpl });
    expect(result).toEqual({ kind: "ok", data: { id: 7, email: "a@b.com" } });
  });

  it("returns auth-failed on 401/403", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("", { status: 401 }),
    );
    const result = await getCustomerByEmail("a@b.com", { fetchImpl });
    expect(result.kind).toBe("auth-failed");
  });

  it("returns upstream-unavailable on 5xx / 429 / 408", async () => {
    for (const status of [500, 502, 503, 408, 429]) {
      const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status }));
      const result = await getCustomerByEmail("a@b.com", { fetchImpl });
      expect(result.kind).toBe("upstream-unavailable");
    }
  });

  it("returns not-found on 404", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    const result = await getCustomerByEmail("a@b.com", { fetchImpl });
    expect(result.kind).toBe("not-found");
  });

  it("returns malformed-response on non-JSON 200 body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("not json", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );
    const result = await getCustomerByEmail("a@b.com", { fetchImpl });
    expect(result.kind).toBe("malformed-response");
  });

  it("returns upstream-unavailable on ABP success:false envelope", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: "boom" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await listOffersV2({ propertyId: "p1" }, { fetchImpl });
    expect(result.kind).toBe("upstream-unavailable");
  });

  it("read-only — only GET is used", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await getOffervanaProperty({ address: "1 Main St" }, { fetchImpl });
    await listOffersV2({ propertyId: "p1" }, { fetchImpl });
    await getCustomerByEmail("a@b.com", { fetchImpl });

    for (const call of fetchImpl.mock.calls) {
      const init = call[1] as RequestInit;
      expect(init.method).toBe("GET");
    }
  });

  it("throws when ZOODEALIO_API_KEY is missing", async () => {
    delete process.env.ZOODEALIO_API_KEY;
    const fetchImpl = vi.fn();
    await expect(getCustomerByEmail("a@b.com", { fetchImpl })).rejects.toThrow(
      /ZOODEALIO_API_KEY/,
    );
  });
});

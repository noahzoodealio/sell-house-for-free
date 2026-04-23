import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHostAdminCustomer } from "@/lib/offervana/client";
import type { NewClientDto } from "@/lib/offervana/types";

const ORIGINAL_ENV = process.env.ZOODEALIO_API_KEY;

function makeDto(): NewClientDto {
  return {
    propData: {
      address1: "123 Main",
      city: "Phoenix",
      country: "US",
      stateCd: "AZ",
      zipCode: "85001",
      customerId: 0,
    },
    signUpData: {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "+16025551234",
    },
    surveyData: null,
    sendPrelims: true,
    customerLeadSource: 13,
    submitterRole: 0,
    isSellerSource: true,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.ZOODEALIO_API_KEY = "test-key";
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.ZOODEALIO_API_KEY;
  else process.env.ZOODEALIO_API_KEY = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe("createHostAdminCustomer", () => {
  it("throws when ZOODEALIO_API_KEY is missing", async () => {
    delete process.env.ZOODEALIO_API_KEY;
    await expect(
      createHostAdminCustomer(makeDto(), { fetchImpl: vi.fn() }),
    ).rejects.toThrow(/ZOODEALIO_API_KEY/);
  });

  it("returns ok on HTTP 200 with valid ValueTuple body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { item1: 99, item2: 1, item3: "R1" }));
    const result = await createHostAdminCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.payload).toEqual({
        customerId: 99,
        userId: 1,
        referralCode: "R1",
      });
      expect(result.attempts).toBe(1);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      "https://sellfreeai.zoodealio.net/api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer",
    );
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(init.cache).toBe("no-store");
  });

  it("retries on 5xx and succeeds on attempt 2", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "busy" } }))
      .mockResolvedValueOnce(
        jsonResponse(200, { item1: 1, item2: 2, item3: "R" }),
      );
    const result = await createHostAdminCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.attempts).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns transient-exhausted after exhausting attempts", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(502, null));
    const result = await createHostAdminCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("transient-exhausted");
    if (result.kind === "transient-exhausted") {
      expect(result.detail.lastStatus).toBe(502);
    }
    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("returns email-conflict and does NOT retry", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(500, {
        error: { message: "Email already registered for user." },
      }),
    );
    const result = await createHostAdminCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("email-conflict");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns permanent-failure on 400", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: { message: "bad dto" } }));
    const result = await createHostAdminCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("permanent-failure");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns malformed-response when 200 body lacks ValueTuple shape", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { foo: "bar" }));
    const result = await createHostAdminCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("malformed-response");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries when fetch throws (network / abort)", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(
        jsonResponse(200, { item1: 1, item2: 2, item3: "R" }),
      );
    const result = await createHostAdminCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

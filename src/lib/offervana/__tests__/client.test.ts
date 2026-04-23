import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOuterApiCustomer } from "@/lib/offervana/client";
import type { CreateCustomerDto } from "@/lib/offervana/types";

const ORIGINAL_ENV = process.env.ZOODEALIO_API_KEY;

function makeDto(): CreateCustomerDto {
  return {
    name: "Jane",
    surname: "Doe",
    emailAddress: "jane@example.com",
    phoneNumber: "+16025551234",
    isEmailNotificationsEnabled: true,
    isSmsNotificationsEnabled: true,
    address1: "123 Main",
    city: "Phoenix",
    stateCd: "AZ",
    zipCode: "85001",
    country: "US",
    floors: 1,
    bedroomsCount: 3,
    bathroomsCount: 2,
    squareFootage: 1800,
  };
}

function okEnvelope(id = 99, ref = "R-1") {
  return {
    result: {
      id,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "+16025551234",
      referalType: "host-admin",
      referalCode: ref,
      createdOn: "2026-04-23T00:00:00Z",
      updatedOn: "2026-04-23T00:00:00Z",
    },
    targetUrl: null,
    success: true,
    error: null,
    unAuthorizedRequest: false,
    __abp: true,
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

describe("createOuterApiCustomer", () => {
  it("throws when ZOODEALIO_API_KEY is missing", async () => {
    delete process.env.ZOODEALIO_API_KEY;
    await expect(
      createOuterApiCustomer(makeDto(), { fetchImpl: vi.fn() }),
    ).rejects.toThrow(/ZOODEALIO_API_KEY/);
  });

  it("POSTs to /openapi/Customers with ApiKey header + cache: no-store + ABP envelope unwrap", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, okEnvelope(42, "REF-1")));
    const result = await createOuterApiCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.payload).toEqual({
        customerId: 42,
        referralCode: "REF-1",
        propertyId: null,
      });
      expect(result.attempts).toBe(1);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://sellfreeai.zoodealio.net/openapi/Customers");
    expect(init.method).toBe("POST");
    expect(init.headers.ApiKey).toBe("test-key");
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.cache).toBe("no-store");
  });

  it("retries on 5xx and succeeds on attempt 2", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "busy" } }))
      .mockResolvedValueOnce(jsonResponse(200, okEnvelope(1, "R")));
    const result = await createOuterApiCustomer(makeDto(), {
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
    const result = await createOuterApiCustomer(makeDto(), {
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
    const result = await createOuterApiCustomer(makeDto(), {
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
    const result = await createOuterApiCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("permanent-failure");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns malformed-response when 200 body lacks the GetCustomersDto shape", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { result: { foo: "bar" }, success: true }));
    const result = await createOuterApiCustomer(makeDto(), {
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
      .mockResolvedValueOnce(jsonResponse(200, okEnvelope(1, "R")));
    const result = await createOuterApiCustomer(makeDto(), {
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result.kind).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("forwards X-Client-Submission-Id when provided", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, okEnvelope(1, "R")));
    await createOuterApiCustomer(makeDto(), {
      fetchImpl,
      submissionId: "11111111-1111-4111-8111-111111111111",
      sleep: async () => {},
      random: () => 0,
    });
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers["X-Client-Submission-Id"]).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});

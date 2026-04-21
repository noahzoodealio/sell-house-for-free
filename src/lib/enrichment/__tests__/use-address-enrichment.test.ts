import { act, renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from "vitest";
import { useAddressEnrichment } from "../use-address-enrichment";
import type { EnrichmentEnvelope } from "../types";
import type { AddressFields, EnrichmentSlot } from "@/lib/seller-form/types";
import { DRAFT_STORAGE_KEY } from "@/lib/seller-form/draft";

// ───────────────────────────── fixtures ─────────────────────────────

const AZ_ADDRESS: AddressFields = {
  street1: "123 Main St",
  street2: "",
  city: "Phoenix",
  state: "AZ",
  zip: "85004",
};

const NON_AZ_ADDRESS: AddressFields = {
  ...AZ_ADDRESS,
  zip: "90210",
};

const OK_SLOT: EnrichmentSlot = {
  status: "ok",
  attomId: "attom-123",
  mlsRecordId: "mls-456",
  listingStatus: "not-listed",
  details: {
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1800,
    yearBuilt: 1999,
  },
  fetchedAt: "2026-04-21T00:00:00.000Z",
};

const OK_ENVELOPE: EnrichmentEnvelope = {
  status: "ok",
  slot: OK_SLOT,
  cacheHit: false,
};

// ───────────────────────────── helpers ─────────────────────────────

function mockFetchOnce(envelope: EnrichmentEnvelope) {
  const fetchMock = globalThis.fetch as MockedFunction<typeof fetch>;
  fetchMock.mockImplementationOnce(async (_input, options) => {
    const signal = (options as RequestInit | undefined)?.signal;
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return new Response(JSON.stringify(envelope), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
}

function mockFetchAbortable(envelope: EnrichmentEnvelope, delayMs = 5000) {
  const fetchMock = globalThis.fetch as MockedFunction<typeof fetch>;
  fetchMock.mockImplementationOnce(async (_input, options) => {
    const signal = (options as RequestInit | undefined)?.signal;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(
          new Response(JSON.stringify(envelope), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }, delayMs);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  });
}

async function computeHexHash(canonical: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ───────────────────────────── setup ─────────────────────────────

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ───────────────────────────── tests ─────────────────────────────

describe("useAddressEnrichment — idle + guards", () => {
  it("null address returns idle without fetching", () => {
    const { result } = renderHook(() => useAddressEnrichment(null));
    expect(result.current).toEqual({ status: "idle" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("non-AZ zip short-circuits to out-of-area without fetching", async () => {
    const { result } = renderHook(() => useAddressEnrichment(NON_AZ_ADDRESS));
    await waitFor(() => {
      expect(result.current.status).toBe("out-of-area");
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("useAddressEnrichment — happy path", () => {
  it("writes ok slot to draft on successful envelope", async () => {
    mockFetchOnce(OK_ENVELOPE);
    const { result } = renderHook(() => useAddressEnrichment(AZ_ADDRESS));

    await waitFor(
      () => {
        expect(result.current.status).toBe("ok");
      },
      { timeout: 2000 },
    );
    if (result.current.status === "ok") {
      expect(result.current.slot).toEqual(OK_SLOT);
    }

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const fetchMock = globalThis.fetch as MockedFunction<typeof fetch>;
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(String((options as RequestInit).body));
    expect(body.kind).toBe("enrich");
    expect(body.address).toEqual(AZ_ADDRESS);

    // AC 12: enrichment is excluded from the localStorage write path.
    const persisted = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (persisted) {
      const parsed = JSON.parse(persisted);
      expect(parsed.enrichment).toBeUndefined();
    }
  });

  it("no-match envelope yields status-only result", async () => {
    mockFetchOnce({ status: "no-match", cacheHit: false });
    const { result } = renderHook(() => useAddressEnrichment(AZ_ADDRESS));

    await waitFor(
      () => {
        expect(result.current.status).toBe("no-match");
      },
      { timeout: 2000 },
    );
  });

  it("timeout envelope yields timeout result", async () => {
    mockFetchOnce({ status: "timeout", retryable: true });
    const { result } = renderHook(() => useAddressEnrichment(AZ_ADDRESS));

    await waitFor(
      () => {
        expect(result.current.status).toBe("timeout");
      },
      { timeout: 2000 },
    );
  });
});

describe("useAddressEnrichment — sessionStorage cache", () => {
  it("cache hit short-circuits without fetching", async () => {
    const hex = await computeHexHash("123 main st||phoenix|AZ|85004");
    sessionStorage.setItem(
      `shf:enrich:v1:${hex}`,
      JSON.stringify(OK_ENVELOPE),
    );

    const { result } = renderHook(() => useAddressEnrichment(AZ_ADDRESS));

    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("writes envelope to sessionStorage after successful fetch", async () => {
    mockFetchOnce(OK_ENVELOPE);
    const { result } = renderHook(() => useAddressEnrichment(AZ_ADDRESS));
    await waitFor(
      () => {
        expect(result.current.status).toBe("ok");
      },
      { timeout: 2000 },
    );
    const keys = Object.keys(sessionStorage);
    expect(keys.some((k) => k.startsWith("shf:enrich:v1:"))).toBe(true);
  });
});

describe("useAddressEnrichment — debounce + abort", () => {
  it("aborts in-flight request on unmount", async () => {
    mockFetchAbortable(OK_ENVELOPE);
    const { unmount } = renderHook(() => useAddressEnrichment(AZ_ADDRESS));

    // Wait for debounce + dispatch; the mocked fetch is awaiting its 50ms timer.
    await new Promise((r) => setTimeout(r, 500));

    const fetchMock = globalThis.fetch as MockedFunction<typeof fetch>;
    expect(fetchMock).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await Promise.resolve();
    });

    const [, options] = fetchMock.mock.calls[0];
    const signal = (options as RequestInit).signal;
    expect(signal?.aborted).toBe(true);
  });

  it("debounce coalesces rapid address changes", async () => {
    mockFetchOnce(OK_ENVELOPE);
    const addr1: AddressFields = { ...AZ_ADDRESS, street1: "100 First St" };
    const addr2: AddressFields = { ...AZ_ADDRESS, street1: "200 Second St" };
    const addr3: AddressFields = { ...AZ_ADDRESS, street1: "300 Third St" };

    const { rerender } = renderHook(
      ({ address }: { address: AddressFields }) =>
        useAddressEnrichment(address),
      { initialProps: { address: addr1 } },
    );

    // Change rapidly — each within the 400ms debounce window.
    await new Promise((r) => setTimeout(r, 50));
    rerender({ address: addr2 });
    await new Promise((r) => setTimeout(r, 50));
    rerender({ address: addr3 });

    // Wait long enough for final debounce + fetch to settle.
    await new Promise((r) => setTimeout(r, 800));

    const fetchMock = globalThis.fetch as MockedFunction<typeof fetch>;
    // Only the last address should have produced a fetch.
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe("useAddressEnrichment — referential stability", () => {
  it("same-field address across renders does not re-fire fetch", async () => {
    mockFetchOnce(OK_ENVELOPE);
    const { result, rerender } = renderHook(
      ({ address }: { address: AddressFields }) =>
        useAddressEnrichment(address),
      { initialProps: { address: AZ_ADDRESS } },
    );

    await waitFor(
      () => expect(result.current.status).toBe("ok"),
      { timeout: 2000 },
    );

    // New object identity, identical fields.
    rerender({ address: { ...AZ_ADDRESS } });

    // Give any follow-up effect + debounce a chance to fire.
    await new Promise((r) => setTimeout(r, 500));

    expect(
      (globalThis.fetch as MockedFunction<typeof fetch>).mock.calls.length,
    ).toBe(1);
  });
});

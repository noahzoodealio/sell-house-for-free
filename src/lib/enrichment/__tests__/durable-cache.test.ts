import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  markNegativeCache,
  readDurable,
  readDurableArea,
  readNegativeCache,
  writeDurable,
  writeDurableArea,
  type AddressLocator,
} from "../durable-cache";

type MockResult = { data?: unknown; error?: { message: string } | null };

interface MockState {
  // Per-(table, op) result captures.
  selectMaybeSingle: Record<string, MockResult>;
  upsert: { result: MockResult; capturedRow?: unknown; capturedOpts?: unknown };
  update: { result: MockResult; capturedRow?: unknown };
  insert: { result: MockResult; capturedRow?: unknown };
}

const state: MockState = makeState();

function makeState(): MockState {
  return {
    selectMaybeSingle: {},
    upsert: { result: { error: null } },
    update: { result: { error: null } },
    insert: { result: { error: null } },
  };
}

function chainFor(table: string) {
  return {
    select: (cols: string) => ({
      eq: (_field: string, _value: string) => ({
        maybeSingle: async () =>
          state.selectMaybeSingle[`${table}|${cols}`] ?? {
            data: null,
            error: null,
          },
      }),
    }),
    upsert: (row: unknown, opts: unknown) => {
      state.upsert.capturedRow = row;
      state.upsert.capturedOpts = opts;
      return Promise.resolve(state.upsert.result);
    },
    update: (row: unknown) => {
      state.update.capturedRow = row;
      return {
        eq: (_f: string, _v: string) => Promise.resolve(state.update.result),
      };
    },
    insert: (row: unknown) => {
      state.insert.capturedRow = row;
      return Promise.resolve(state.insert.result);
    },
  };
}

const mockSupabase = { from: (table: string) => chainFor(table) };

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

const ADDR_KEY = "abc123";
const GEO = "G06037";
const LOCATOR: AddressLocator = {
  street1: "123 main st",
  city: "phoenix",
  state: "AZ",
  zip: "85004",
};

beforeEach(() => {
  Object.assign(state, makeState());
});

describe("readDurable", () => {
  it("returns null when row missing", async () => {
    const result = await readDurable(ADDR_KEY, "profile");
    expect(result).toBeNull();
  });

  it("returns null when payload column is null", async () => {
    state.selectMaybeSingle[
      "property_enrichments|attom_profile_payload, attom_profile_fetched_at"
    ] = {
      data: { attom_profile_payload: null, attom_profile_fetched_at: null },
      error: null,
    };
    const result = await readDurable(ADDR_KEY, "profile");
    expect(result).toBeNull();
  });

  it("returns entry with payload + parsed fetchedAt on hit", async () => {
    const fetched = "2026-04-25T12:34:56.000Z";
    state.selectMaybeSingle[
      "property_enrichments|attom_profile_payload, attom_profile_fetched_at"
    ] = {
      data: {
        attom_profile_payload: { property: [{ id: 1 }] },
        attom_profile_fetched_at: fetched,
      },
      error: null,
    };
    const result = await readDurable(ADDR_KEY, "profile");
    expect(result).not.toBeNull();
    expect(result?.payload).toEqual({ property: [{ id: 1 }] });
    expect(result?.fetchedAt.toISOString()).toBe(fetched);
  });

  it("routes to the correct columns for each endpoint", async () => {
    const fetched = "2026-04-25T01:00:00.000Z";
    state.selectMaybeSingle["property_enrichments|mls_history_payload, mls_history_fetched_at"] =
      {
        data: {
          mls_history_payload: [{ event: "listed" }],
          mls_history_fetched_at: fetched,
        },
        error: null,
      };
    const result = await readDurable(ADDR_KEY, "mls_history");
    expect(result?.payload).toEqual([{ event: "listed" }]);
  });

  it("returns null on Supabase error", async () => {
    state.selectMaybeSingle[
      "property_enrichments|attom_profile_payload, attom_profile_fetched_at"
    ] = {
      data: null,
      error: { message: "boom" },
    };
    const result = await readDurable(ADDR_KEY, "profile");
    expect(result).toBeNull();
  });
});

describe("writeDurable", () => {
  it("upserts a new row with correct columns + sources=[endpoint]", async () => {
    await writeDurable(ADDR_KEY, "profile", { foo: "bar" }, LOCATOR);

    const row = state.upsert.capturedRow as Record<string, unknown>;
    expect(row.address_key).toBe(ADDR_KEY);
    expect(row.street1).toBe(LOCATOR.street1);
    expect(row.city).toBe(LOCATOR.city);
    expect(row.state).toBe("AZ");
    expect(row.zip).toBe("85004");
    expect(row.attom_profile_payload).toEqual({ foo: "bar" });
    expect(row.attom_profile_fetched_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    expect(row.sources).toEqual(["profile"]);
    expect(state.upsert.capturedOpts).toEqual({ onConflict: "address_key" });
  });

  it("appends endpoint to existing sources without duplicating", async () => {
    state.selectMaybeSingle["property_enrichments|sources"] = {
      data: { sources: ["profile", "mls_search"] },
      error: null,
    };
    await writeDurable(ADDR_KEY, "avm", { value: 425000 }, LOCATOR);

    const row = state.upsert.capturedRow as Record<string, unknown>;
    expect(row.sources).toEqual(["profile", "mls_search", "avm"]);
  });

  it("does not duplicate if endpoint already in sources", async () => {
    state.selectMaybeSingle["property_enrichments|sources"] = {
      data: { sources: ["profile"] },
      error: null,
    };
    await writeDurable(ADDR_KEY, "profile", { v: 1 }, LOCATOR);

    const row = state.upsert.capturedRow as Record<string, unknown>;
    expect(row.sources).toEqual(["profile"]);
  });

  it("throws when upsert errors", async () => {
    state.upsert.result = { error: { message: "constraint violation" } };
    await expect(
      writeDurable(ADDR_KEY, "profile", { v: 1 }, LOCATOR),
    ).rejects.toThrow(/constraint violation/);
  });
});

describe("markNegativeCache", () => {
  it("inserts a new row with empty sources when row missing", async () => {
    await markNegativeCache(ADDR_KEY, LOCATOR);

    const row = state.insert.capturedRow as Record<string, unknown>;
    expect(row.address_key).toBe(ADDR_KEY);
    expect(row.sources).toEqual([]);
    expect(row.street1).toBe(LOCATOR.street1);
  });

  it("touches updated_at on existing row without clobbering payloads", async () => {
    state.selectMaybeSingle["property_enrichments|address_key"] = {
      data: { address_key: ADDR_KEY },
      error: null,
    };
    await markNegativeCache(ADDR_KEY, LOCATOR);

    expect(state.insert.capturedRow).toBeUndefined();
    const row = state.update.capturedRow as Record<string, unknown>;
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // No payload columns or sources reset.
    expect(Object.keys(row)).toEqual(["updated_at"]);
  });
});

describe("readNegativeCache", () => {
  it("returns null when row missing", async () => {
    const r = await readNegativeCache(ADDR_KEY);
    expect(r).toBeNull();
  });

  it("returns null when sources non-empty (positive cache row)", async () => {
    state.selectMaybeSingle["property_enrichments|sources, updated_at"] = {
      data: {
        sources: ["profile"],
        updated_at: "2026-04-25T00:00:00.000Z",
      },
      error: null,
    };
    const r = await readNegativeCache(ADDR_KEY);
    expect(r).toBeNull();
  });

  it("returns updatedAt when sources empty (negative-cache row)", async () => {
    const ts = "2026-04-25T00:00:00.000Z";
    state.selectMaybeSingle["property_enrichments|sources, updated_at"] = {
      data: { sources: [], updated_at: ts },
      error: null,
    };
    const r = await readNegativeCache(ADDR_KEY);
    expect(r?.updatedAt.toISOString()).toBe(ts);
  });
});

describe("area-scope read/write", () => {
  it("readDurableArea returns null when row missing", async () => {
    const r = await readDurableArea(GEO, "sales_trend");
    expect(r).toBeNull();
  });

  it("readDurableArea hits attom_sales_trend_* columns", async () => {
    const fetched = "2026-04-25T00:00:00.000Z";
    state.selectMaybeSingle[
      "area_enrichments|attom_sales_trend_payload, attom_sales_trend_fetched_at"
    ] = {
      data: {
        attom_sales_trend_payload: { trend: "up" },
        attom_sales_trend_fetched_at: fetched,
      },
      error: null,
    };
    const r = await readDurableArea(GEO, "sales_trend");
    expect(r?.payload).toEqual({ trend: "up" });
  });

  it("writeDurableArea upserts on geoid_v4", async () => {
    await writeDurableArea(GEO, "schools", [{ name: "Camelback HS" }]);

    const row = state.upsert.capturedRow as Record<string, unknown>;
    expect(row.geoid_v4).toBe(GEO);
    expect(row.attom_schools_payload).toEqual([{ name: "Camelback HS" }]);
    expect(row.attom_schools_fetched_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(state.upsert.capturedOpts).toEqual({ onConflict: "geoid_v4" });
  });

  it("writeDurableArea throws on Supabase error", async () => {
    state.upsert.result = { error: { message: "geoid invalid" } };
    await expect(writeDurableArea(GEO, "schools", {})).rejects.toThrow(
      /geoid invalid/,
    );
  });
});

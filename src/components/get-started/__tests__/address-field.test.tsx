import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import {
  AddressField,
  formatSuggestionLabel,
} from "../address-field";

describe("formatSuggestionLabel", () => {
  it("returns street1 when street2 is missing", () => {
    expect(
      formatSuggestionLabel({
        street1: "123 Main St",
        city: "Phoenix",
        state: "AZ",
        zip: "85004",
      }),
    ).toBe("123 Main St");
  });

  it("appends street2 when present", () => {
    expect(
      formatSuggestionLabel({
        street1: "123 Main St",
        street2: "Apt 4",
        city: "Phoenix",
        state: "AZ",
        zip: "85004",
      }),
    ).toBe("123 Main St Apt 4");
  });
});

describe("AddressField debounced suggest fetch", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    fetchSpy.mockReset();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not fetch below the minimum character threshold", () => {
    const onChange = vi.fn();
    render(<AddressField value="123" onChange={onChange} />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("debounces then POSTs /api/enrich with kind:suggest", async () => {
    fetchSpy.mockResolvedValueOnce({
      json: async () => ({ status: "ok", results: [] }),
    });
    const onChange = vi.fn();
    render(<AddressField value="1234 Ma" onChange={onChange} />);

    expect(fetchSpy).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/enrich");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({
      kind: "suggest",
      query: "1234 Ma",
      limit: 5,
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("AddressField manual-typed completion", () => {
  it("fires onAddressComplete when all fields are valid via currentAddress + value", () => {
    const onAddressComplete = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(
      <AddressField
        value=""
        onChange={onChange}
        onAddressComplete={onAddressComplete}
        currentAddress={{ city: "Phoenix", state: "AZ", zip: "85004" }}
      />,
    );
    expect(onAddressComplete).not.toHaveBeenCalled();

    rerender(
      <AddressField
        value="123 Main St"
        onChange={onChange}
        onAddressComplete={onAddressComplete}
        currentAddress={{
          street1: "123 Main St",
          city: "Phoenix",
          state: "AZ",
          zip: "85004",
        }}
      />,
    );

    expect(onAddressComplete).toHaveBeenCalledWith({
      street1: "123 Main St",
      city: "Phoenix",
      state: "AZ",
      zip: "85004",
    });
  });

  it("does not fire onAddressComplete for non-AZ zip", () => {
    const onAddressComplete = vi.fn();
    const onChange = vi.fn();
    render(
      <AddressField
        value="123 Main St"
        onChange={onChange}
        onAddressComplete={onAddressComplete}
        currentAddress={{
          street1: "123 Main St",
          city: "Denver",
          state: "AZ",
          zip: "80202",
        }}
      />,
    );
    expect(onAddressComplete).not.toHaveBeenCalled();
  });
});

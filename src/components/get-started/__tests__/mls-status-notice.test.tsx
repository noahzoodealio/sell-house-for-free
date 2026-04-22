import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MlsStatusNotice } from "../mls-status-notice";

const baseProps = {
  mlsRecordId: "mls-abc",
  value: undefined,
  onChange: () => {},
};

describe("MlsStatusNotice — gate", () => {
  it("renders nothing when mlsRecordId is missing", () => {
    const { container } = render(
      <MlsStatusNotice
        {...baseProps}
        mlsRecordId={undefined}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when rawListingStatus is missing", () => {
    const { container } = render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus={undefined}
        listingStatusDisplay={undefined}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it.each([
    ["Closed"],
    ["Expired"],
    ["Withdrawn"],
    ["Cancelled"],
    ["Sold"],
    ["SomethingWeird"],
  ])("renders nothing for out-of-gate status %s", (raw) => {
    const { container } = render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus={raw}
        listingStatusDisplay={undefined}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("MlsStatusNotice — Active / ActiveUnderContract render banner + chips", () => {
  it.each([
    ["Active", "currently listed"],
    ["ActiveUnderContract", "listed, currently under contract"],
    ["active_under_contract", "listed, currently under contract"],
  ])("status %s renders banner + 3 chips", (raw, display) => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus={raw}
        listingStatusDisplay={display}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 3 }).textContent,
    ).toBe(`We see your home is ${display}.`);
    const chips = screen.getAllByRole("radio");
    expect(chips).toHaveLength(3);
  });

  it("fires onChange when a chip is clicked", async () => {
    const onChange = vi.fn();
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
        onChange={onChange}
      />,
    );
    await userEvent.click(
      screen.getByRole("radio", { name: /ready to switch/i }),
    );
    expect(onChange).toHaveBeenCalledWith("ready-to-switch");
  });

  it("reflects selected value via aria-checked", () => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
        value="just-exploring"
      />,
    );
    const chip = screen.getByRole("radio", { name: /just exploring/i });
    expect(chip.getAttribute("aria-checked")).toBe("true");
  });

  it("only one chip is tabbable at a time (roving tabindex)", () => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
        value="second-opinion"
      />,
    );
    const chips = screen.getAllByRole("radio");
    const tabbable = chips.filter((c) => c.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveTextContent(/second opinion/i);
  });
});

describe("MlsStatusNotice — ComingSoon / Pending render banner without chips", () => {
  it.each([
    ["ComingSoon", "coming soon"],
    ["coming_soon", "coming soon"],
    ["Pending", "listed, currently under contract"],
  ])("status %s renders heading only (no radiogroup)", (raw, display) => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus={raw}
        listingStatusDisplay={display}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 3 }).textContent,
    ).toBe(`We see your home is ${display}.`);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});

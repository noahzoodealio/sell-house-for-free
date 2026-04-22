import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MlsStatusNotice } from "../mls-status-notice";

const baseProps = {
  mlsRecordId: "mls-abc",
  value: undefined,
  onChange: () => {},
  hasAgent: undefined,
  onHasAgentChange: () => {},
};

const chipGroupQuery = { name: /second opinion/i };
const agentGroupQuery = { name: /agent on this sale/i };

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

describe("MlsStatusNotice — Active / ActiveUnderContract render banner + chips + agent", () => {
  it.each([
    ["Active", "currently listed"],
    ["ActiveUnderContract", "listed, currently under contract"],
    ["active_under_contract", "listed, currently under contract"],
  ])("status %s renders banner + chip radiogroup + agent radiogroup", (raw, display) => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus={raw}
        listingStatusDisplay={display}
      />,
    );
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      `We see your home is ${display}.`,
    );
    const chipGroup = screen.getByRole("radiogroup", chipGroupQuery);
    expect(within(chipGroup).getAllByRole("radio")).toHaveLength(3);
    const agentGroup = screen.getByRole("radiogroup", agentGroupQuery);
    expect(within(agentGroup).getAllByRole("radio")).toHaveLength(3);
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
    const chipGroup = screen.getByRole("radiogroup", chipGroupQuery);
    await userEvent.click(
      within(chipGroup).getByRole("radio", { name: /ready to switch/i }),
    );
    expect(onChange).toHaveBeenCalledWith("ready-to-switch");
  });

  it("reflects selected chip value via aria-checked", () => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
        value="just-exploring"
      />,
    );
    const chipGroup = screen.getByRole("radiogroup", chipGroupQuery);
    const chip = within(chipGroup).getByRole("radio", { name: /just exploring/i });
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
    const chipGroup = screen.getByRole("radiogroup", chipGroupQuery);
    const chips = within(chipGroup).getAllByRole("radio");
    const tabbable = chips.filter((c) => c.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveTextContent(/second opinion/i);
  });
});

describe("MlsStatusNotice — ComingSoon / Pending render banner + agent only (no chips)", () => {
  it.each([
    ["ComingSoon", "coming soon"],
    ["coming_soon", "coming soon"],
    ["Pending", "listed, currently under contract"],
  ])("status %s renders banner + agent radiogroup without chip radiogroup", (raw, display) => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus={raw}
        listingStatusDisplay={display}
      />,
    );
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(
      `We see your home is ${display}.`,
    );
    // Chip radiogroup is absent.
    expect(screen.queryByRole("radiogroup", chipGroupQuery)).toBeNull();
    // Agent radiogroup is present with 3 options.
    const agentGroup = screen.getByRole("radiogroup", agentGroupQuery);
    expect(within(agentGroup).getAllByRole("radio")).toHaveLength(3);
  });
});

describe("MlsStatusNotice — agent question", () => {
  it.each([
    ["Active", "currently listed"],
    ["ActiveUnderContract", "listed, currently under contract"],
    ["ComingSoon", "coming soon"],
    ["Pending", "listed, currently under contract"],
  ])("agent radiogroup renders for gated status %s", (raw, display) => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus={raw}
        listingStatusDisplay={display}
      />,
    );
    const agentGroup = screen.getByRole("radiogroup", agentGroupQuery);
    const options = within(agentGroup).getAllByRole("radio");
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.textContent)).toEqual(["Yes", "No", "Not sure"]);
  });

  it.each([
    ["yes", /^yes$/i],
    ["no", /^no$/i],
    ["not-sure", /^not sure$/i],
  ])("fires onHasAgentChange with %s when clicked", async (expected, label) => {
    const onHasAgentChange = vi.fn();
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
        onHasAgentChange={onHasAgentChange}
      />,
    );
    const agentGroup = screen.getByRole("radiogroup", agentGroupQuery);
    await userEvent.click(within(agentGroup).getByRole("radio", { name: label }));
    expect(onHasAgentChange).toHaveBeenCalledWith(expected);
  });

  it("reflects selected agent value via aria-checked", () => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="ComingSoon"
        listingStatusDisplay="coming soon"
        hasAgent="no"
      />,
    );
    const agentGroup = screen.getByRole("radiogroup", agentGroupQuery);
    const no = within(agentGroup).getByRole("radio", { name: /^no$/i });
    expect(no.getAttribute("aria-checked")).toBe("true");
    const yes = within(agentGroup).getByRole("radio", { name: /^yes$/i });
    expect(yes.getAttribute("aria-checked")).toBe("false");
  });

  it("only one agent option is tabbable at a time (roving tabindex) — first when unselected", () => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Pending"
        listingStatusDisplay="listed, currently under contract"
      />,
    );
    const agentGroup = screen.getByRole("radiogroup", agentGroupQuery);
    const options = within(agentGroup).getAllByRole("radio");
    const tabbable = options.filter((o) => o.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveTextContent(/^yes$/i);
  });

  it("tabbable agent option matches selection when one exists", () => {
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
        hasAgent="not-sure"
      />,
    );
    const agentGroup = screen.getByRole("radiogroup", agentGroupQuery);
    const options = within(agentGroup).getAllByRole("radio");
    const tabbable = options.filter((o) => o.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveTextContent(/^not sure$/i);
  });

  it("ArrowRight on Yes cycles selection to No", () => {
    const onHasAgentChange = vi.fn();
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
        onHasAgentChange={onHasAgentChange}
      />,
    );
    const agentGroup = screen.getByRole("radiogroup", agentGroupQuery);
    const yes = within(agentGroup).getByRole("radio", { name: /^yes$/i });
    fireEvent.keyDown(yes, { key: "ArrowRight" });
    expect(onHasAgentChange).toHaveBeenCalledWith("no");
  });

  it("ArrowLeft on Yes cycles selection to Not sure", () => {
    const onHasAgentChange = vi.fn();
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
        onHasAgentChange={onHasAgentChange}
      />,
    );
    const agentGroup = screen.getByRole("radiogroup", agentGroupQuery);
    const yes = within(agentGroup).getByRole("radio", { name: /^yes$/i });
    fireEvent.keyDown(yes, { key: "ArrowLeft" });
    expect(onHasAgentChange).toHaveBeenCalledWith("not-sure");
  });

  it("chip selection does not affect agent selection (orthogonal signals)", async () => {
    const onChange = vi.fn();
    const onHasAgentChange = vi.fn();
    render(
      <MlsStatusNotice
        {...baseProps}
        rawListingStatus="Active"
        listingStatusDisplay="currently listed"
        onChange={onChange}
        onHasAgentChange={onHasAgentChange}
      />,
    );
    const chipGroup = screen.getByRole("radiogroup", chipGroupQuery);
    await userEvent.click(
      within(chipGroup).getByRole("radio", { name: /second opinion/i }),
    );
    expect(onChange).toHaveBeenCalledWith("second-opinion");
    expect(onHasAgentChange).not.toHaveBeenCalled();
  });
});

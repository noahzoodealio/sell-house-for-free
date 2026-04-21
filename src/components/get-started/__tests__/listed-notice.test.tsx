import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListedNotice } from "../listed-notice";

describe("ListedNotice", () => {
  it("renders nothing when listingStatus is not currently-listed", () => {
    const { container, rerender } = render(
      <ListedNotice
        listingStatus={undefined}
        value={undefined}
        onChange={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <ListedNotice
        listingStatus="not-listed"
        value={undefined}
        onChange={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <ListedNotice
        listingStatus="previously-listed"
        value={undefined}
        onChange={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a radiogroup with three chips when currently-listed", () => {
    render(
      <ListedNotice
        listingStatus="currently-listed"
        value={undefined}
        onChange={() => {}}
      />,
    );
    const group = screen.getByRole("radiogroup");
    expect(group).toBeInTheDocument();
    const chips = screen.getAllByRole("radio");
    expect(chips).toHaveLength(3);
  });

  it("fires onChange with the selected reason when a chip is clicked", async () => {
    const onChange = vi.fn();
    render(
      <ListedNotice
        listingStatus="currently-listed"
        value={undefined}
        onChange={onChange}
      />,
    );
    await userEvent.click(
      screen.getByRole("radio", { name: /ready to switch/i }),
    );
    expect(onChange).toHaveBeenCalledWith("ready-to-switch");
  });

  it("reflects the selected value via aria-checked", () => {
    render(
      <ListedNotice
        listingStatus="currently-listed"
        value="just-exploring"
        onChange={() => {}}
      />,
    );
    const chip = screen.getByRole("radio", { name: /just exploring/i });
    expect(chip.getAttribute("aria-checked")).toBe("true");
  });

  it("only one chip is tabbable at a time (roving tabindex)", () => {
    render(
      <ListedNotice
        listingStatus="currently-listed"
        value="second-opinion"
        onChange={() => {}}
      />,
    );
    const chips = screen.getAllByRole("radio");
    const tabbable = chips.filter((c) => c.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveTextContent(/second opinion/i);
  });
});

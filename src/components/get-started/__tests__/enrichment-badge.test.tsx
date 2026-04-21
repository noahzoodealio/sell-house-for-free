import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnrichmentBadge } from "../enrichment-badge";
import type { EnrichmentHookStatus } from "@/lib/enrichment/use-address-enrichment";

describe("EnrichmentBadge", () => {
  it("renders nothing when status is idle", () => {
    const { container } = render(<EnrichmentBadge status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  const cases: Array<[Exclude<EnrichmentHookStatus, "idle">, string]> = [
    ["loading", "Looking up your home…"],
    ["ok", "✓ Found your home"],
    ["out-of-area", "Sorry — we're Arizona-only right now"],
    [
      "no-match",
      "We couldn't find this address in public records — that's OK, you can keep going",
    ],
    ["timeout", "Couldn't reach our records right now — you can keep going"],
    ["error", "Couldn't reach our records right now — you can keep going"],
  ];

  it.each(cases)("renders exact copy for status=%s", (status, expected) => {
    render(<EnrichmentBadge status={status} />);
    expect(screen.getByRole("status")).toHaveTextContent(expected);
  });

  it("announces politely (aria-live=polite)", () => {
    render(<EnrichmentBadge status="loading" />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-live")).toBe("polite");
    expect(el.getAttribute("aria-atomic")).toBe("true");
  });

  it("exposes status as a data attribute for styling hooks", () => {
    render(<EnrichmentBadge status="no-match" />);
    expect(screen.getByRole("status").getAttribute("data-enrichment-status"))
      .toBe("no-match");
  });
});

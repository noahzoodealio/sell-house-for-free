import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emitTeamPortalEvent } from "../telemetry";

describe("emitTeamPortalEvent", () => {
  let captured: string[];

  beforeEach(() => {
    captured = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      captured.push(String(args[0]));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts emails from string tag values", () => {
    emitTeamPortalEvent({
      event: "team_login_failed",
      severity: "warning",
      tags: { teamUserId: "00000000-0000-0000-0000-000000000000", note: "user noah@example.com tried to log in" },
    });
    const payload = captured[0]!;
    expect(payload).not.toMatch(/@/);
    expect(payload).toContain("[redacted-email]");
  });

  it("redacts 10-digit phone numbers", () => {
    emitTeamPortalEvent({
      event: "team_message_send_failed",
      severity: "error",
      tags: { note: "called +1 (480) 555-1212 about the issue" },
    });
    const payload = captured[0]!;
    expect(payload).not.toMatch(/480.*1212/);
    expect(payload).toContain("[redacted-phone]");
  });

  it("does not mutate non-PII values", () => {
    emitTeamPortalEvent({
      event: "team_handoff_executed",
      severity: "warning",
      tags: { submissionId: "abc-123", count: 7 },
    });
    const payload = captured[0]!;
    expect(payload).toContain("\"submissionId\":\"abc-123\"");
    expect(payload).toContain("\"count\":7");
  });

  it("recursively redacts nested arrays and objects", () => {
    emitTeamPortalEvent({
      event: "team_doc_upload_failed",
      severity: "error",
      tags: {
        history: [
          { actor: "alice@example.com" },
          { phone: "(602) 555-9999" },
        ],
      },
    });
    const payload = captured[0]!;
    expect(payload).not.toMatch(/@/);
    expect(payload).not.toMatch(/602.*9999/);
  });
});

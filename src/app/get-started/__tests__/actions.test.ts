import { describe, expect, it } from "vitest";
import { validateAll } from "@/lib/seller-form/schema";
import { parseFormData } from "../parse";

const SUBMISSION_ID = "11111111-1111-4111-8111-111111111111";
const ACCEPTED_AT = "2026-04-22T16:00:00.000Z";

function buildBaseFormData(): FormData {
  const fd = new FormData();
  fd.set("submissionId", SUBMISSION_ID);
  fd.set(
    "draftJson",
    JSON.stringify({
      address: {
        street1: "123 Main St",
        city: "Phoenix",
        state: "AZ",
        zip: "85004",
      },
      property: {},
      condition: { currentCondition: "move-in", timeline: "0-3mo" },
      contact: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        phone: "602-555-0123",
      },
    }),
  );
  fd.set(
    "consentJson",
    JSON.stringify({
      tcpa: { version: "v1", acceptedAt: ACCEPTED_AT, isPlaceholder: true },
      terms: { version: "v1", acceptedAt: ACCEPTED_AT, isPlaceholder: true },
      privacy: { version: "v1", acceptedAt: ACCEPTED_AT, isPlaceholder: true },
    }),
  );
  fd.set("attribution", JSON.stringify({}));
  return fd;
}

describe("parseFormData + validateAll — hasAgent round-trip", () => {
  it.each(["yes", "no", "not-sure"])(
    "accepts hasAgent=%s and round-trips into the validated payload",
    (value) => {
      const fd = buildBaseFormData();
      fd.set("hasAgent", value);
      const candidate = parseFormData(fd);
      const result = validateAll(candidate);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.hasAgent).toBe(value);
    },
  );

  it("rejects an invalid hasAgent value with the documented error message", () => {
    const fd = buildBaseFormData();
    fd.set("hasAgent", "maybe");
    const candidate = parseFormData(fd);
    const result = validateAll(candidate);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.hasAgent?.[0]).toBe("Invalid agent-involvement value.");
  });

  it("treats a missing hasAgent as undefined (submission still succeeds)", () => {
    const fd = buildBaseFormData();
    const candidate = parseFormData(fd);
    const result = validateAll(candidate);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.hasAgent).toBeUndefined();
  });

  it("treats an empty-string hasAgent as undefined", () => {
    const fd = buildBaseFormData();
    fd.set("hasAgent", "");
    const candidate = parseFormData(fd);
    const result = validateAll(candidate);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.hasAgent).toBeUndefined();
  });

  it("rejects case-variants (e.g. 'YES')", () => {
    const fd = buildBaseFormData();
    fd.set("hasAgent", "YES");
    const candidate = parseFormData(fd);
    const result = validateAll(candidate);
    expect(result.success).toBe(false);
  });
});

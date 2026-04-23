import { describe, expect, it, vi } from "vitest";
import { recordDeadLetter } from "@/lib/offervana/dead-letter";
import type { NewClientDto } from "@/lib/offervana/types";

type Inserted = Record<string, unknown>;

function makeClient(error: unknown = null): {
  client: unknown;
  inserts: Inserted[];
} {
  const inserts: Inserted[] = [];
  const client = {
    from(table: string) {
      expect(table).toBe("offervana_submission_failures");
      return {
        async insert(row: Inserted) {
          inserts.push(row);
          return { error };
        },
      };
    },
  };
  return { client, inserts };
}

const submissionId = "44444444-4444-4444-8444-444444444444";
const now = new Date("2026-04-23T16:00:00.000Z");

const sampleDto: NewClientDto = {
  propData: {
    address1: "1 A St",
    city: "Phoenix",
    country: "US",
    stateCd: "AZ",
    zipCode: "85001",
    customerId: 0,
  },
  signUpData: {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "+16025551234",
  },
  surveyData: null,
  sendPrelims: true,
  customerLeadSource: 13,
  submitterRole: 0,
  isSellerSource: true,
};

describe("recordDeadLetter", () => {
  it("inserts a row with reason + redacted draft/dto", async () => {
    const { client, inserts } = makeClient();
    const logger = { error: vi.fn() };

    await recordDeadLetter(
      {
        submissionId,
        reason: "transient-exhausted",
        detail: { lastStatus: 503, lastError: "Service Unavailable" },
        draftJson: {
          submissionId,
          contact: { email: "jane@example.com", firstName: "Jane" },
          address: { city: "Phoenix" },
        },
        dto: sampleDto,
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client: client as any,
        logger,
        now: () => now,
      },
    );

    expect(inserts).toHaveLength(1);
    const row = inserts[0];
    expect(row.submission_id).toBe(submissionId);
    expect(row.reason).toBe("transient-exhausted");
    expect(row.resolved_at).toBeNull();
    expect(row.created_at).toBe(now.toISOString());

    expect(row.draft_json).toEqual({
      submissionId,
      address: { city: "Phoenix" },
    });
    expect((row.draft_json as Record<string, unknown>).contact).toBeUndefined();

    const dto = row.dto_json as Record<string, unknown>;
    expect(dto.signUpData).toBeUndefined();
    expect(dto.propData).toBeDefined();
    expect(dto.customerLeadSource).toBe(13);
  });

  it("emits a single structured JSON log line on console.error", async () => {
    const { client } = makeClient();
    const logger = { error: vi.fn() };

    await recordDeadLetter(
      {
        submissionId,
        reason: "email-conflict",
        detail: { status: 500, body: "Email already registered" },
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client: client as any,
        logger,
        now: () => now,
      },
    );

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [line] = logger.error.mock.calls[0];
    const parsed = JSON.parse(line as string);
    expect(parsed).toMatchObject({
      event: "offervana.submit.dead_letter",
      submissionId,
      reason: "email-conflict",
      ts: now.toISOString(),
    });
    expect(parsed.detail.status).toBe(500);
    expect(parsed.detail.body).toBe("Email already registered");
  });

  it("truncates long body strings in the log to 500 chars", async () => {
    const { client } = makeClient();
    const logger = { error: vi.fn() };
    const longBody = "x".repeat(2000);

    await recordDeadLetter(
      {
        submissionId,
        reason: "permanent",
        detail: { status: 400, body: longBody },
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client: client as any,
        logger,
        now: () => now,
      },
    );

    const [line] = logger.error.mock.calls[0];
    const parsed = JSON.parse(line as string);
    expect((parsed.detail.body as string).length).toBe(500);
  });

  it("throws when the insert fails — but still logs first", async () => {
    const { client } = makeClient({ message: "pg down" });
    const logger = { error: vi.fn() };

    await expect(
      recordDeadLetter(
        {
          submissionId,
          reason: "malformed-response",
          detail: {},
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          client: client as any,
          logger,
          now: () => now,
        },
      ),
    ).rejects.toThrow(/pg down/);

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [line] = logger.error.mock.calls[0];
    expect(JSON.parse(line as string).supabaseError).toBe("pg down");
  });

  it("accepts null draft/dto (transient-exhausted rarely has them)", async () => {
    const { client, inserts } = makeClient();
    const logger = { error: vi.fn() };

    await recordDeadLetter(
      {
        submissionId,
        reason: "transient-exhausted",
        detail: { lastStatus: null, lastError: "timeout" },
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client: client as any,
        logger,
        now: () => now,
      },
    );

    expect(inserts[0].draft_json).toBeNull();
    expect(inserts[0].dto_json).toBeNull();
  });
});

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { OffervanaFailureReason } from "@/lib/supabase/schema";

import type { CreateCustomerDto } from "./types";

export interface DeadLetterInput {
  submissionId: string;
  reason: OffervanaFailureReason;
  detail: Record<string, unknown>;
  draftJson?: Record<string, unknown> | null;
  dto?: CreateCustomerDto | null;
}

export interface DeadLetterDeps {
  client?: SupabaseClient;
  logger?: Pick<Console, "error">;
  now?: () => Date;
}

export async function recordDeadLetter(
  input: DeadLetterInput,
  deps: DeadLetterDeps = {},
): Promise<void> {
  const client = deps.client ?? getSupabaseAdmin();
  const logger = deps.logger ?? console;
  const now = deps.now ? deps.now() : new Date();

  const redactedDraft = input.draftJson
    ? redactDraftPii(input.draftJson)
    : null;
  const redactedDto = input.dto ? redactDtoPii(input.dto) : null;

  const { error } = await client.from("offervana_submission_failures").insert({
    submission_id: input.submissionId,
    reason: input.reason,
    detail: input.detail,
    draft_json: redactedDraft,
    dto_json: redactedDto,
    created_at: now.toISOString(),
    resolved_at: null,
  });

  logger.error(
    JSON.stringify({
      event: "offervana.submit.dead_letter",
      submissionId: input.submissionId,
      reason: input.reason,
      ts: now.toISOString(),
      detail: sanitizeDetail(input.detail),
      supabaseError: error?.message ?? null,
    }),
  );

  if (error) {
    throw new Error(
      `offervana_submission_failures insert failed: ${error.message}`,
    );
  }
}

function redactDraftPii(
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const { contact: _contact, ...rest } = draft;
  return rest;
}

function redactDtoPii(dto: CreateCustomerDto): Record<string, unknown> {
  // CreateCustomerDto is flat — PII fields live at the top level.
  const {
    name: _name,
    surname: _surname,
    emailAddress: _emailAddress,
    phoneNumber: _phoneNumber,
    ...rest
  } = dto as unknown as Record<string, unknown>;
  return rest;
}

function sanitizeDetail(
  detail: Record<string, unknown>,
): Record<string, unknown> {
  const body = detail.body;
  if (typeof body === "string") {
    return { ...detail, body: body.slice(0, 500) };
  }
  return detail;
}

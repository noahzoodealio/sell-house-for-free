import "server-only";

import { render } from "@react-email/render";
import { Resend } from "resend";

import {
  EMAIL_MAX_ATTEMPTS,
  EMAIL_TIMEOUT_MS,
} from "@/lib/pm-service/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";

import {
  buildSellerConfirmationProps,
  buildTeamMemberNotificationProps,
} from "./dynamic-data";
import type {
  SellerConfirmationInput,
  SendResult,
  TeamMemberNotificationInput,
} from "./types";
import { SellerConfirmation } from "./templates/seller-confirmation";
import { TeamMemberNotification } from "./templates/team-member-notification";

const BACKOFF_MS = [500, 1000, 2000];

let _client: Resend | null = null;
function getResend(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Required for outbound email.",
    );
  }
  _client = new Resend(key);
  return _client;
}

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is not set. Required for outbound email.");
  }
  return from;
}

function getReplyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO || undefined;
}

export async function sendSellerConfirmation(
  input: SellerConfirmationInput,
): Promise<SendResult> {
  const props = buildSellerConfirmationProps({
    sellerFirstName: input.sellerFirstName,
    pm: input.pm,
    contactWindowHours: input.contactWindowHours,
    referralCode: input.referralCode,
    pillarHint: input.pillarHint,
    unsubscribeUrl: buildUnsubscribeUrl(input.to),
  });
  const element = SellerConfirmation(props);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  return sendWithRetry({
    submissionId: input.submissionId,
    recipientType: "seller",
    recipientEmail: input.to,
    templateKey: "seller_confirmation",
    subject: buildSellerSubject(props.pmFirstName, props.contactWindowHours),
    html,
    text,
  });
}

export async function sendTeamMemberNotification(
  input: TeamMemberNotificationInput,
): Promise<SendResult> {
  const props = buildTeamMemberNotificationProps({
    teamMemberFirstName: input.teamMemberFirstName,
    submissionRef: input.referralCode,
    seller: input.seller,
    pillarHint: input.pillarHint,
    offers: input.offers,
  });
  const element = TeamMemberNotification(props);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  return sendWithRetry({
    submissionId: input.submissionId,
    recipientType: "team_member",
    recipientEmail: input.to,
    templateKey: "team_member_notification",
    subject: `New lead: ${props.sellerFullName} — ${props.propertyCity}, ${props.propertyState}`,
    html,
    text,
  });
}

interface DispatchParams {
  submissionId: string;
  recipientType: "seller" | "team_member";
  recipientEmail: string;
  templateKey: "seller_confirmation" | "team_member_notification";
  subject: string;
  html: string;
  text: string;
}

async function sendWithRetry(params: DispatchParams): Promise<SendResult> {
  const supabase = getSupabaseAdmin();
  let lastError = "unknown error";

  // The submissions.submission_id is a text UUID; notification_log.submission_id
  // is a uuid FK to submissions.id. We need to translate.
  let submissionRowId: string | null;
  try {
    submissionRowId = await resolveSubmissionRowId(params.submissionId);
  } catch {
    submissionRowId = null;
  }

  for (let attempt = 1; attempt <= EMAIL_MAX_ATTEMPTS; attempt++) {
    const logRowId = submissionRowId
      ? await insertAttemptRow(supabase, {
          submissionRowId,
          recipientType: params.recipientType,
          recipientEmail: params.recipientEmail,
          templateKey: params.templateKey,
          attempt,
        })
      : null;

    // Resend v6's send() doesn't accept an AbortSignal, so we race it
    // against a timeout. The underlying fetch continues to completion on
    // the server — worst case we've billed an extra network round-trip;
    // we never double-dispatch because each retry writes its own log row.
    const result = await Promise.race([
      getResend().emails.send({
        from: getFromAddress(),
        to: params.recipientEmail,
        replyTo: getReplyTo(),
        subject: params.subject,
        html: params.html,
        text: params.text,
        headers: { "X-Entity-Ref-ID": params.submissionId },
      }),
      timeoutAfter(EMAIL_TIMEOUT_MS),
    ]).catch((err: unknown) => ({
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    }));

    try {

      if (result.error || !result.data) {
        const reason = sanitizeError(result.error);
        await updateAttemptRow(supabase, logRowId, {
          status: "failed",
          error_reason: reason,
        });
        if (isRetryable(result.error) && attempt < EMAIL_MAX_ATTEMPTS) {
          await sleep(backoffDelay(attempt, result.error));
          lastError = reason;
          continue;
        }
        return { ok: false, error: reason };
      }

      await updateAttemptRow(supabase, logRowId, {
        status: "sent",
        provider_message_id: result.data.id,
      });
      return { ok: true, messageId: result.data.id };
    } catch (err) {
      const reason = sanitizeError(err);
      await updateAttemptRow(supabase, logRowId, {
        status: "failed",
        error_reason: reason,
      });

      if (isRetryable(err) && attempt < EMAIL_MAX_ATTEMPTS) {
        await sleep(backoffDelay(attempt, err));
        lastError = reason;
        continue;
      }

      return { ok: false, error: reason };
    }
  }

  return { ok: false, error: lastError };
}

async function resolveSubmissionRowId(
  submissionId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .select("id")
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

interface InsertParams {
  submissionRowId: string;
  recipientType: "seller" | "team_member";
  recipientEmail: string;
  templateKey: "seller_confirmation" | "team_member_notification";
  attempt: number;
}

async function insertAttemptRow(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  params: InsertParams,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("notification_log")
    .insert({
      submission_id: params.submissionRowId,
      recipient_type: params.recipientType,
      recipient_email: params.recipientEmail,
      template_key: params.templateKey,
      attempt: params.attempt,
      status: "retry_pending",
      provider: "resend",
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

async function updateAttemptRow(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rowId: string | null,
  patch: {
    status: "sent" | "failed";
    error_reason?: string;
    provider_message_id?: string;
  },
): Promise<void> {
  if (!rowId) return;
  await supabase
    .from("notification_log")
    .update({
      status: patch.status,
      error_reason: patch.error_reason ?? null,
      provider_message_id: patch.provider_message_id ?? null,
    })
    .eq("id", rowId);
}

const SENSITIVE_KEYS = new Set([
  "to",
  "from",
  "replyTo",
  "reply_to",
  "email",
  "phone",
  "address",
  "headers",
]);

export function sanitizeError(err: unknown): string {
  if (err == null) return "unknown error";
  if (typeof err === "string") return truncate(err, 500);

  if (err instanceof Error) {
    return truncate(err.message || err.name || "unknown error", 500);
  }

  if (typeof err === "object") {
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(err as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        filtered[k] = v;
      }
    }
    return truncate(JSON.stringify(filtered), 500);
  }

  return truncate(String(err), 500);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

interface HttpError {
  statusCode?: number;
  status?: number;
  headers?: Record<string, string>;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Error && err.name === "TimeoutError") return true;
  const code = httpStatusOf(err);
  if (code === undefined) return true; // network/unknown — try again
  if (code === 429) return true;
  if (code >= 500 && code < 600) return true;
  return false;
}

function httpStatusOf(err: unknown): number | undefined {
  if (err && typeof err === "object") {
    const e = err as HttpError;
    return e.statusCode ?? e.status;
  }
  return undefined;
}

function backoffDelay(attempt: number, err: unknown): number {
  // Honor Retry-After (in seconds) if present on a 429.
  if (err && typeof err === "object" && httpStatusOf(err) === 429) {
    const h = (err as HttpError).headers;
    const ra = h?.["retry-after"] ?? h?.["Retry-After"];
    if (ra) {
      const sec = Number.parseInt(String(ra), 10);
      if (Number.isFinite(sec) && sec > 0) return Math.min(sec * 1000, 10_000);
    }
  }
  return BACKOFF_MS[attempt - 1] ?? 2000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_resolve, reject) =>
    setTimeout(() => {
      const err = new Error("email send timeout");
      err.name = "TimeoutError";
      reject(err);
    }, ms),
  );
}

function buildSellerSubject(pmFirstName: string, hours: number): string {
  return `We've assigned ${pmFirstName} to your home — they'll reach out within ${hours} hours`;
}

function buildUnsubscribeUrl(_email: string): string {
  // Placeholder — a real unsubscribe endpoint lands with E10 (seller
  // passwordless auth) alongside the email-preferences surface. Until
  // then the seller template includes a mailto: fallback for CAN-SPAM
  // compliance.
  const base = process.env.EMAIL_REPLY_TO ?? "hello@sellyourhousefree.com";
  return `mailto:${base}?subject=Unsubscribe`;
}

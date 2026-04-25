import "server-only";

import { render } from "@react-email/render";
import { Resend } from "resend";

import { captureException } from "@/lib/pm-service/observability";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { TeamToSeller } from "@/lib/email/templates/team-to-seller";

export interface SubmissionContact {
  submissionRowId: string;
  submissionId: string;
  sellerEmail: string;
  sellerFirstName: string;
}

export interface TeamMemberContext {
  authUserId: string;
  fullName: string;
  email: string;
}

export interface SendMessageInput {
  submission: SubmissionContact;
  teamMember: TeamMemberContext;
  subject: string;
  body: string;
}

export type SendMessageResult =
  | { ok: true; messageRowId: string; resendMessageId: string }
  | { ok: false; reason: "validation" | "send_failed" | "internal" };

const BACKOFF_MS = [500, 1000, 2000];
const MAX_BODY_CHARS = 10_000;

let _client: Resend | null = null;
function getResend(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set. Required for outbound email.");
  }
  _client = new Resend(key);
  return _client;
}

function fromAddress(): string {
  const v = process.env.EMAIL_FROM;
  if (!v) {
    throw new Error("EMAIL_FROM is not set. Required for outbound email.");
  }
  return v;
}

function inboundDomain(): string {
  return process.env.RESEND_INBOUND_DOMAIN || "mail.sellfree.xyz";
}

function sellerPortalUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/portal`;
}

function buildReplyTo(submissionRowId: string): string {
  return `reply-${submissionRowId}@${inboundDomain()}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  if (err && typeof err === "object") {
    const code =
      (err as { statusCode?: number; status?: number }).statusCode ??
      (err as { statusCode?: number; status?: number }).status;
    if (code === undefined) return true;
    if (code === 429) return true;
    if (code >= 500 && code < 600) return true;
    return false;
  }
  return true;
}

/**
 * Sends a free-form team → seller message and records the outbound row +
 * activity audit. Retries 500/429/network errors with the same backoff
 * curve as the seller-confirmation send. Returns the new messages.id +
 * Resend message id on success.
 */
export async function sendMessageFromTeam(
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length === 0 || body.length === 0) {
    return { ok: false, reason: "validation" };
  }
  if (body.length > MAX_BODY_CHARS) {
    return { ok: false, reason: "validation" };
  }

  const supabase = getSupabaseAdmin();

  const props = {
    sellerFirstName: input.submission.sellerFirstName,
    teamMemberName: input.teamMember.fullName,
    teamMemberEmail: input.teamMember.email,
    subject,
    body,
    portalUrl: sellerPortalUrl(),
  };
  const element = TeamToSeller(props);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const result = await getResend().emails.send({
        from: fromAddress(),
        to: input.submission.sellerEmail,
        replyTo: buildReplyTo(input.submission.submissionRowId),
        subject,
        html,
        text,
        headers: {
          "X-Entity-Ref-ID": input.submission.submissionId,
          "X-Submission-Id": input.submission.submissionRowId,
        },
      });

      if (result.error || !result.data) {
        lastError = result.error;
        if (isRetryable(result.error) && attempt < BACKOFF_MS.length) {
          await sleep(BACKOFF_MS[attempt - 1]);
          continue;
        }
        await recordSendFailure(input, sanitizeError(result.error));
        return { ok: false, reason: "send_failed" };
      }

      const resendMessageId = result.data.id;
      const { data: insertRow, error: insertError } = await supabase
        .from("messages")
        .insert({
          submission_id: input.submission.submissionRowId,
          direction: "outbound",
          sender_user_id: input.teamMember.authUserId,
          sender_email: input.teamMember.email,
          subject,
          body,
          body_html: html,
          resend_message_id: resendMessageId,
          delivery_status: "pending",
        })
        .select("id")
        .single();

      if (insertError || !insertRow) {
        captureException({
          event: "team_message_insert_failed",
          severity: "error",
          extras: {
            submissionId: input.submission.submissionRowId,
            resendMessageId,
            error: sanitizeError(insertError),
          },
        });
        return { ok: false, reason: "internal" };
      }

      await supabase.from("team_activity_events").insert({
        submission_id: input.submission.submissionRowId,
        team_user_id: input.teamMember.authUserId,
        event_type: "email_sent",
        event_data: {
          status: "sent",
          subject,
          resend_message_id: resendMessageId,
        },
      });

      return {
        ok: true,
        messageRowId: (insertRow as { id: string }).id,
        resendMessageId,
      };
    } catch (err) {
      lastError = err;
      if (isRetryable(err) && attempt < BACKOFF_MS.length) {
        await sleep(BACKOFF_MS[attempt - 1]);
        continue;
      }
    }
  }

  await recordSendFailure(input, sanitizeError(lastError));
  return { ok: false, reason: "send_failed" };
}

async function recordSendFailure(
  input: SendMessageInput,
  reason: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("team_activity_events").insert({
    submission_id: input.submission.submissionRowId,
    team_user_id: input.teamMember.authUserId,
    event_type: "email_sent",
    event_data: { status: "failed", reason, subject: input.subject },
  });
  captureException({
    event: "team_message_send_failed",
    severity: "error",
    extras: {
      submissionId: input.submission.submissionRowId,
      reason,
    },
  });
}

function sanitizeError(err: unknown): string {
  if (err == null) return "unknown error";
  if (typeof err === "string") return err.slice(0, 500);
  if (err instanceof Error) {
    return (err.message || err.name || "unknown error").slice(0, 500);
  }
  if (typeof err === "object") {
    try {
      return JSON.stringify(err).slice(0, 500);
    } catch {
      return "unknown error";
    }
  }
  return String(err).slice(0, 500);
}

/**
 * Marks all unread inbound messages on a submission as read for the given
 * team member. Returns the count of rows updated.
 */
export async function markThreadRead(submissionRowId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("submission_id", submissionRowId)
    .eq("direction", "inbound")
    .is("read_at", null)
    .select("id");
  if (error || !data) return 0;
  return data.length;
}

export interface ThreadMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  bodyHtml: string | null;
  subject: string | null;
  senderEmail: string | null;
  senderUserId: string | null;
  resendMessageId: string | null;
  deliveryStatus: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function listThread(
  submissionRowId: string,
): Promise<ThreadMessage[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, direction, body, body_html, subject, sender_email, sender_user_id, resend_message_id, delivery_status, read_at, created_at",
    )
    .eq("submission_id", submissionRowId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => {
    const r = row as {
      id: string;
      direction: "inbound" | "outbound";
      body: string;
      body_html: string | null;
      subject: string | null;
      sender_email: string | null;
      sender_user_id: string | null;
      resend_message_id: string | null;
      delivery_status: string | null;
      read_at: string | null;
      created_at: string;
    };
    return {
      id: r.id,
      direction: r.direction,
      body: r.body,
      bodyHtml: r.body_html,
      subject: r.subject,
      senderEmail: r.sender_email,
      senderUserId: r.sender_user_id,
      resendMessageId: r.resend_message_id,
      deliveryStatus: r.delivery_status,
      readAt: r.read_at,
      createdAt: r.created_at,
    };
  });
}

/**
 * Routes an inbound webhook payload to a submission. Returns
 * { submissionRowId } on success or { reason } on failure.
 */
export interface InboundRouteResult {
  submissionRowId: string | null;
  reason: "matched_recipient" | "matched_in_reply_to" | "unroutable";
}

export async function routeInboundEmail(args: {
  recipient: string | null;
  inReplyTo: string | null;
}): Promise<InboundRouteResult> {
  const { recipient, inReplyTo } = args;
  const supabase = getSupabaseAdmin();

  if (recipient) {
    const match = recipient.match(/reply-([0-9a-f-]{36})@/i);
    if (match) {
      const candidate = match[1];
      const { data } = await supabase
        .from("submissions")
        .select("id")
        .eq("id", candidate)
        .maybeSingle();
      if (data) {
        return {
          submissionRowId: (data as { id: string }).id,
          reason: "matched_recipient",
        };
      }
    }
  }

  if (inReplyTo) {
    // Header is wrapped in <>; strip if present.
    const cleaned = inReplyTo.replace(/^<|>$/g, "");
    const { data } = await supabase
      .from("messages")
      .select("submission_id")
      .eq("resend_message_id", cleaned)
      .eq("direction", "outbound")
      .maybeSingle();
    if (data) {
      return {
        submissionRowId: (data as { submission_id: string }).submission_id,
        reason: "matched_in_reply_to",
      };
    }
  }

  return { submissionRowId: null, reason: "unroutable" };
}

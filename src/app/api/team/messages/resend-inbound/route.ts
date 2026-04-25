import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { captureException } from "@/lib/pm-service/observability";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { routeInboundEmail } from "@/lib/team/messages";
import { verifyHmacSignature } from "@/lib/team/webhook-signature";

export const runtime = "nodejs";
export const maxDuration = 60;

interface InboundPayload {
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
  to?: string | string[];
  in_reply_to?: string;
  references?: string;
  message_id?: string;
  headers?: Record<string, string>;
}

function pickRecipient(payload: InboundPayload): string | null {
  if (typeof payload.to === "string") return payload.to;
  if (Array.isArray(payload.to) && payload.to.length > 0) return payload.to[0];
  return null;
}

function extractEmailAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // "Name <addr@host>" → "addr@host"
  const angle = raw.match(/<([^>]+)>/);
  if (angle) return angle[1].trim().toLowerCase();
  return raw.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    captureException({
      event: "team_inbound_webhook_misconfigured",
      severity: "error",
      extras: { missing: "RESEND_INBOUND_WEBHOOK_SECRET" },
    });
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const raw = await request.text();
  const signature =
    request.headers.get("x-resend-signature") ??
    request.headers.get("svix-signature");

  if (!verifyHmacSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: InboundPayload;
  try {
    payload = JSON.parse(raw) as InboundPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const senderEmail = extractEmailAddress(payload.from);
  const recipient = extractEmailAddress(pickRecipient(payload));
  const inReplyTo = payload.in_reply_to ?? payload.headers?.["In-Reply-To"];
  const messageId =
    payload.message_id ?? payload.headers?.["Message-ID"] ?? null;

  // Idempotency: Resend can retry a delivered webhook. If we've already
  // ingested this message_id as inbound, accept and move on.
  if (messageId) {
    const { data: existing } = await supabase
      .from("messages")
      .select("id")
      .eq("resend_message_id", messageId)
      .eq("direction", "inbound")
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { received: true, message_id: messageId, status: "duplicate" },
        { status: 200 },
      );
    }
  }

  const route = await routeInboundEmail({
    recipient,
    inReplyTo: inReplyTo ?? null,
  });

  if (!route.submissionRowId) {
    await supabase.from("messages_dead_letter").insert({
      raw_payload: payload as unknown as Record<string, unknown>,
      reason: route.reason,
      resend_message_id: messageId,
      recipient_address: recipient,
      sender_address: senderEmail,
    });
    captureException({
      event: "team_inbound_message_unroutable",
      severity: "warning",
      extras: { reason: route.reason, recipient, messageId },
    });
    // 200 so Resend does not retry — dead-letter is the durable record.
    return NextResponse.json(
      { received: true, message_id: messageId, status: "dead_letter" },
      { status: 200 },
    );
  }

  let senderUserId: string | null = null;
  if (senderEmail) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", senderEmail)
      .maybeSingle();
    if (profileRow) {
      senderUserId = (profileRow as { id: string }).id;
    }
  }

  await supabase.from("messages").insert({
    submission_id: route.submissionRowId,
    direction: "inbound",
    sender_user_id: senderUserId,
    sender_email: senderEmail,
    body: payload.text ?? "",
    body_html: payload.html ?? null,
    subject: payload.subject ?? null,
    resend_message_id: messageId,
  });

  return NextResponse.json(
    {
      received: true,
      message_id: messageId,
      submission_id: route.submissionRowId,
      status: "routed",
      via: route.reason,
    },
    { status: 200 },
  );
}

export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;

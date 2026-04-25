import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { captureException } from "@/lib/pm-service/observability";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyHmacSignature } from "@/lib/team/webhook-signature";

export const runtime = "nodejs";

type ResendEventType =
  | "email.delivered"
  | "email.bounced"
  | "email.complained";

interface DeliveryPayload {
  type?: string;
  data?: {
    email_id?: string;
    [k: string]: unknown;
  };
}

const STATUS_BY_EVENT: Record<ResendEventType, "delivered" | "bounced" | "complained"> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_DELIVERY_WEBHOOK_SECRET;
  if (!secret) {
    captureException({
      event: "team_delivery_webhook_misconfigured",
      severity: "error",
      extras: { missing: "RESEND_DELIVERY_WEBHOOK_SECRET" },
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

  let payload: DeliveryPayload;
  try {
    payload = JSON.parse(raw) as DeliveryPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const eventType = payload.type as ResendEventType | undefined;
  const emailId = payload.data?.email_id;

  if (!eventType || !STATUS_BY_EVENT[eventType] || !emailId) {
    // Other Resend events (sent, opened, clicked) are valid but not tracked
    // by this handler. 200 so Resend does not retry.
    return NextResponse.json(
      { received: true, status: "ignored", type: eventType },
      { status: 200 },
    );
  }

  const status = STATUS_BY_EVENT[eventType];
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("messages")
    .update({
      delivery_status: status,
      delivery_updated_at: new Date().toISOString(),
    })
    .eq("resend_message_id", emailId)
    .eq("direction", "outbound")
    .select("id");

  if (error) {
    captureException({
      event: "team_delivery_webhook_update_failed",
      severity: "error",
      extras: { emailId, status, error: error.message },
    });
    return NextResponse.json({ received: true, status: "error" }, { status: 200 });
  }

  // No matching outbound row is fine — could be a non-team email
  // (E6 confirmations, future automated sends). 200 + log only.
  return NextResponse.json(
    {
      received: true,
      status: "applied",
      matched: data?.length ?? 0,
      messageStatus: status,
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

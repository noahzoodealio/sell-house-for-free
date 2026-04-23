import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  OffervanaFailureReason,
  OffervanaIdempotencyRow,
  OffervanaSubmissionFailureRow,
} from "@/lib/supabase/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatusResponse =
  | { status: "ready"; referralCode: string; customerId: number }
  | { status: "failed"; reason: OffervanaFailureReason }
  | { status: "pending" }
  | { status: "error"; message: string };

export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse>> {
  const sid = request.nextUrl.searchParams.get("sid");
  if (!sid) {
    return NextResponse.json(
      { status: "error", message: "Missing sid" },
      { status: 400 },
    );
  }

  const client = getSupabaseAdmin();

  const { data: okRow, error: okError } = await client
    .from("offervana_idempotency")
    .select("submission_id, customer_id, referral_code")
    .eq("submission_id", sid)
    .maybeSingle();

  if (okError) {
    return NextResponse.json(
      { status: "error", message: okError.message },
      { status: 500 },
    );
  }

  if (okRow) {
    const row = okRow as Pick<
      OffervanaIdempotencyRow,
      "submission_id" | "customer_id" | "referral_code"
    >;
    return NextResponse.json({
      status: "ready",
      referralCode: row.referral_code,
      customerId: row.customer_id,
    });
  }

  const { data: failRow, error: failError } = await client
    .from("offervana_submission_failures")
    .select("reason, created_at")
    .eq("submission_id", sid)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (failError) {
    return NextResponse.json(
      { status: "error", message: failError.message },
      { status: 500 },
    );
  }

  if (failRow) {
    const row = failRow as Pick<OffervanaSubmissionFailureRow, "reason">;
    return NextResponse.json({ status: "failed", reason: row.reason });
  }

  return NextResponse.json({ status: "pending" });
}

import { NextResponse, type NextRequest } from "next/server";

import { mapOffersV2ToPortal } from "@/lib/offervana/map-offers";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { OffervanaIdempotencyRow } from "@/lib/supabase/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OffersResponse =
  | {
      status: "ready";
      offers: ReturnType<typeof mapOffersV2ToPortal>;
      propertyId: number | null;
      fetchedAt: string | null;
    }
  | { status: "pending" }
  | { status: "empty"; propertyId: number | null }
  | { status: "error"; message: string };

export async function GET(
  request: NextRequest,
): Promise<NextResponse<OffersResponse>> {
  const sid = request.nextUrl.searchParams.get("sid");
  if (!sid) {
    return NextResponse.json(
      { status: "error", message: "Missing sid" },
      { status: 400 },
    );
  }

  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from("offervana_idempotency")
    .select("property_id, offers_v2_payload, offers_v2_fetched_at")
    .eq("submission_id", sid)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    // Row doesn't exist yet — submission still in flight.
    return NextResponse.json({ status: "pending" });
  }

  const row = data as Pick<
    OffervanaIdempotencyRow,
    "property_id" | "offers_v2_payload" | "offers_v2_fetched_at"
  >;

  if (!row.offers_v2_payload) {
    return NextResponse.json({ status: "empty", propertyId: row.property_id });
  }

  const offers = mapOffersV2ToPortal(row.offers_v2_payload);
  return NextResponse.json({
    status: "ready",
    offers,
    propertyId: row.property_id,
    fetchedAt: row.offers_v2_fetched_at,
  });
}

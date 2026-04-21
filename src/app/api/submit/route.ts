import { NextResponse, type NextRequest } from "next/server";

/**
 * Dev-echo endpoint used by S9's `navigator.sendBeacon` for abandonment
 * events (the Server Action is not reachable from visibilitychange /
 * pagehide). NOT the primary submit path — that's the Server Action at
 * src/app/get-started/actions.ts.
 *
 * Strips contact PII before logging. Always returns { ok: true }.
 */

type UnknownRecord = Record<string, unknown>;

function stripPii(payload: UnknownRecord): UnknownRecord {
  const copy: UnknownRecord = { ...payload };
  delete copy.contact;
  delete copy.consent;
  return copy;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? "";
  let body: UnknownRecord = {};

  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as UnknownRecord;
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }
  } catch {
    body = {};
  }

  console.log("[api/submit]", stripPii(body));
  return NextResponse.json({ ok: true });
}

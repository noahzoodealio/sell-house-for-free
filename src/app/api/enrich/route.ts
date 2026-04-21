import { NextResponse, type NextRequest } from "next/server";

import { devMockEnrich, devMockSuggest } from "@/lib/enrichment/fixtures";
import { addressCacheKey, isAzZip } from "@/lib/enrichment/normalize";
import { getEnrichment, suggest } from "@/lib/enrichment/service";
import { createHash } from "node:crypto";
import {
  zEnrichmentInput,
  type EnrichInput,
  type EnrichmentEnvelope,
  type EnrichmentInput,
  type SuggestEnvelope,
  type SuggestInput,
} from "@/lib/enrichment/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Accept-Encoding",
} as const;

function suggestKey(query: string): string {
  return createHash("sha256").update(query.trim().toLowerCase()).digest("hex");
}

function isDevMockEnabled(): boolean {
  return process.env.ENRICHMENT_DEV_MOCK === "true";
}

type LogLine = {
  at: string;
  submissionId: string | null;
  addressKey: string;
  status: EnrichmentEnvelope["status"] | SuggestEnvelope["status"];
  durationMs: number;
  mlsHits: { search: boolean; details: boolean; images: boolean };
  cacheHit: boolean;
  kind: EnrichmentInput["kind"];
};

function logOne(line: LogLine): void {
  console.log("[api/enrich]", JSON.stringify(line));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startedAt = performance.now();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "invalid_input",
        issues: [
          { code: "custom", message: "Request body is not valid JSON", path: [] },
        ],
      },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const parsed = zEnrichmentInput.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.issues },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const input = parsed.data;

  if (input.kind === "enrich") {
    return handleEnrich(input, startedAt);
  }
  return handleSuggest(input, startedAt);
}

async function handleEnrich(
  input: EnrichInput,
  startedAt: number,
): Promise<NextResponse> {
  const key = addressCacheKey(input.address);

  if (!isAzZip(input.address.zip)) {
    const body: EnrichmentEnvelope = { status: "out-of-area" };
    logOne({
      at: new Date().toISOString(),
      submissionId: input.submissionId,
      addressKey: key,
      status: body.status,
      durationMs: Math.round(performance.now() - startedAt),
      mlsHits: { search: false, details: false, images: false },
      cacheHit: false,
      kind: "enrich",
    });
    return NextResponse.json(body, { status: 200, headers: RESPONSE_HEADERS });
  }

  let body: EnrichmentEnvelope;
  try {
    body = isDevMockEnabled() ? devMockEnrich(input) : await getEnrichment(input);
  } catch {
    body = { status: "error", code: "unhandled" };
  }

  const cacheHit =
    body.status === "ok" || body.status === "no-match" ? body.cacheHit : false;

  logOne({
    at: new Date().toISOString(),
    submissionId: input.submissionId,
    addressKey: key,
    status: body.status,
    durationMs: Math.round(performance.now() - startedAt),
    mlsHits: {
      search: !isDevMockEnabled() && body.status !== "out-of-area",
      details: body.status === "ok",
      images:
        body.status === "ok" &&
        body.slot.listingStatus === "currently-listed" &&
        (body.slot.photos?.length ?? 0) > 0,
    },
    cacheHit,
    kind: "enrich",
  });

  return NextResponse.json(body, { status: 200, headers: RESPONSE_HEADERS });
}

async function handleSuggest(
  input: SuggestInput,
  startedAt: number,
): Promise<NextResponse> {
  let body: SuggestEnvelope;
  try {
    body = isDevMockEnabled() ? devMockSuggest(input) : await suggest(input);
  } catch {
    body = { status: "error", code: "unhandled" };
  }

  logOne({
    at: new Date().toISOString(),
    submissionId: null,
    addressKey: suggestKey(input.query),
    status: body.status,
    durationMs: Math.round(performance.now() - startedAt),
    mlsHits: {
      search: !isDevMockEnabled() && body.status !== "error",
      details: false,
      images: false,
    },
    cacheHit: false,
    kind: "suggest",
  });

  return NextResponse.json(body, { status: 200, headers: RESPONSE_HEADERS });
}

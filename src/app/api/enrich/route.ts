import { NextResponse, type NextRequest } from "next/server";
import { track } from "@vercel/analytics/server";

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
  attomOk?: boolean;
  attomLatencyMs?: number;
  sources?: ("mls" | "attom")[];
  cacheHit: boolean;
  kind: EnrichmentInput["kind"];
};

function logOne(line: LogLine): void {
  console.log("[api/enrich]", JSON.stringify(line));
}

// Fire-and-forget custom event for the enrichment outcome. Dimensions are
// capped to `status` × `cache_hit` — no submissionId, no addressKey, no raw
// address. Failures fall back to a single structured log line and never
// block or reject the response.
function trackEnrichmentStatus(
  status: EnrichmentEnvelope["status"],
  cacheHit: boolean,
): void {
  try {
    void track("enrichment_status", { status, cache_hit: cacheHit });
  } catch (err) {
    console.log(
      "[api/enrich]",
      JSON.stringify({
        at: new Date().toISOString(),
        event: "track_failed",
        status,
        cache_hit: cacheHit,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
  }
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
    trackEnrichmentStatus(body.status, false);
    return NextResponse.json(body, { status: 200, headers: RESPONSE_HEADERS });
  }

  let body: EnrichmentEnvelope;
  let attomOk = false;
  let attomLatencyMs: number | undefined;
  let sources: ("mls" | "attom")[] = [];
  let mlsSearchHit = false;
  let mlsDetailsHit = false;
  let mlsImagesHit = false;

  try {
    if (isDevMockEnabled()) {
      body = devMockEnrich(input);
    } else {
      const result = await getEnrichment(input);
      body = result.envelope;
      attomOk = result.telemetry.attomOk;
      attomLatencyMs = result.telemetry.attomLatencyMs;
      sources = result.telemetry.sources;
      mlsSearchHit = result.telemetry.mlsSearchOk;
      mlsDetailsHit = result.telemetry.mlsDetailsOk;
      mlsImagesHit = result.telemetry.mlsImagesOk;
    }
  } catch {
    body = { status: "error", code: "unhandled" };
  }

  const cacheHit =
    body.status === "ok" ||
    body.status === "ok-partial" ||
    body.status === "no-match"
      ? body.cacheHit
      : false;

  logOne({
    at: new Date().toISOString(),
    submissionId: input.submissionId,
    addressKey: key,
    status: body.status,
    durationMs: Math.round(performance.now() - startedAt),
    mlsHits: {
      search: mlsSearchHit,
      details: mlsDetailsHit,
      images: mlsImagesHit,
    },
    attomOk,
    attomLatencyMs,
    sources,
    cacheHit,
    kind: "enrich",
  });

  trackEnrichmentStatus(body.status, cacheHit);

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

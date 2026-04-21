import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { devMockEnrich, devMockSuggest } from "@/lib/enrichment/fixtures";
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

const AZ_ZIP_REGEX = /^8[5-6]\d{3}$/;

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Accept-Encoding",
} as const;

/**
 * SHA-256 hex of the canonicalized address. Mirrors the algorithm S3
 * will move into `src/lib/enrichment/normalize.ts`; inlining here keeps
 * S1 self-contained without pulling S3 forward.
 */
function addressKey(addr: EnrichInput["address"]): string {
  const canonical = [
    addr.street1.trim().toLowerCase(),
    (addr.street2 ?? "").trim().toLowerCase(),
    addr.city.trim().toLowerCase(),
    "AZ",
    addr.zip.trim(),
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

function suggestKey(query: string): string {
  return createHash("sha256").update(query.trim().toLowerCase()).digest("hex");
}

function isAzZip(zip: string): boolean {
  return AZ_ZIP_REGEX.test(zip);
}

function isDevMockEnabled(): boolean {
  return process.env.ENRICHMENT_DEV_MOCK === "true";
}

/**
 * S1 stub — replaced in S3 by the real orchestrator wrapped in
 * `unstable_cache`. Thrown errors are caught by the route handler and
 * emitted as `{status: 'error'}`, keeping the envelope-always-200
 * contract intact.
 */
function getEnrichmentStub(_input: EnrichInput): EnrichmentEnvelope {
  void _input;
  throw new Error("not implemented — see E4-S3");
}

function getSuggestStub(_input: SuggestInput): SuggestEnvelope {
  void _input;
  throw new Error("not implemented — see E4-S3");
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
          {
            code: "custom",
            message: "Request body is not valid JSON",
            path: [],
          },
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

function handleEnrich(input: EnrichInput, startedAt: number): NextResponse {
  const key = addressKey(input.address);

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
    body = isDevMockEnabled()
      ? devMockEnrich(input)
      : getEnrichmentStub(input);
  } catch {
    body = { status: "error", code: "unhandled" };
  }

  const cacheHit = body.status === "ok" || body.status === "no-match"
    ? body.cacheHit
    : false;

  logOne({
    at: new Date().toISOString(),
    submissionId: input.submissionId,
    addressKey: key,
    status: body.status,
    durationMs: Math.round(performance.now() - startedAt),
    mlsHits: { search: false, details: false, images: false },
    cacheHit,
    kind: "enrich",
  });

  return NextResponse.json(body, { status: 200, headers: RESPONSE_HEADERS });
}

function handleSuggest(input: SuggestInput, startedAt: number): NextResponse {
  let body: SuggestEnvelope;
  try {
    body = isDevMockEnabled() ? devMockSuggest(input) : getSuggestStub(input);
  } catch {
    body = { status: "error", code: "unhandled" };
  }

  logOne({
    at: new Date().toISOString(),
    submissionId: null,
    addressKey: suggestKey(input.query),
    status: body.status,
    durationMs: Math.round(performance.now() - startedAt),
    mlsHits: { search: false, details: false, images: false },
    cacheHit: false,
    kind: "suggest",
  });

  return NextResponse.json(body, { status: 200, headers: RESPONSE_HEADERS });
}

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  AI_SESSION_COOKIE,
  createSession,
  loadSession,
} from "@/lib/ai/session";

export const runtime = "nodejs";
export const maxDuration = 30;

const PostBodySchema = z
  .object({
    submissionId: z.string().uuid().optional(),
  })
  .strict();

function firstIp(request: NextRequest): string | null {
  const header = request.headers.get("x-forwarded-for");
  if (!header) return null;
  const first = header.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let rawBody: unknown = {};
  try {
    if (request.headers.get("content-length") !== "0") {
      rawBody = await request.json();
    }
  } catch {
    rawBody = {};
  }

  const parsed = PostBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await createSession({
    submissionId: parsed.data.submissionId,
    ip: firstIp(request),
  });

  const jar = await cookies();
  jar.set(AI_SESSION_COOKIE, result.cookieValue, result.cookieOptions);

  return NextResponse.json({ sessionId: result.sessionId }, { status: 201 });
}

export async function GET(): Promise<NextResponse> {
  const jar = await cookies();
  const cookie = jar.get(AI_SESSION_COOKIE);
  if (!cookie?.value) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const session = await loadSession(cookie.value);
  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  return NextResponse.json({
    sessionId: session.id,
    context: session.context,
    tokensUsedIn: session.tokensUsed.in,
    tokensUsedOut: session.tokensUsed.out,
  });
}

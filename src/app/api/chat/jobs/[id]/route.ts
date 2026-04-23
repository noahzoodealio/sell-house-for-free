import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { AI_SESSION_COOKIE } from "@/lib/ai/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ToolRunRow {
  id: string;
  session_id: string;
  tool_name: string;
  status: "pending" | "running" | "ok" | "error" | "timeout";
  output_json: { artifactId?: string; valuationSummary?: unknown } | null;
  error_detail: Record<string, unknown> | null;
  latency_ms: number | null;
  created_at: string;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const jar = await cookies();
  const cookie = jar.get(AI_SESSION_COOKIE);
  if (!cookie?.value) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: runRaw, error } = await supabase
    .from("ai_tool_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !runRaw) {
    return NextResponse.json({ error: "job_not_found" }, { status: 404 });
  }

  const run = runRaw as ToolRunRow;
  if (run.session_id !== cookie.value) {
    return NextResponse.json({ error: "job_not_found" }, { status: 404 });
  }

  const artifactId = run.output_json?.artifactId;
  let artifact: unknown = null;
  if (artifactId) {
    const { data: artifactRow } = await supabase
      .from("ai_artifacts")
      .select("*")
      .eq("id", artifactId)
      .maybeSingle();
    artifact = artifactRow;
  }

  return NextResponse.json({
    jobId: run.id,
    status: run.status,
    latencyMs: run.latency_ms,
    error: run.error_detail,
    summary: run.output_json?.valuationSummary ?? null,
    artifact,
  });
}

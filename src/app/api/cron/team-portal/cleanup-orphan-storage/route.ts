import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ALLOWED_BUCKETS, type DocumentBucket } from "@/lib/team/documents";
import { emitTeamPortalEvent } from "@/lib/team/telemetry";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min

const ORPHAN_GRACE_MS = 60 * 60 * 1000; // 1 hour — avoids racing in-flight uploads

interface StorageObjectListEntry {
  name: string;
  created_at?: string;
  metadata?: { size?: number } | null;
}

async function listAllUnderSubmission(
  admin: ReturnType<typeof getSupabaseAdmin>,
  bucket: DocumentBucket,
  prefix: string,
): Promise<StorageObjectListEntry[]> {
  // storage.from().list() is one level deep at a time. For the team-portal
  // path convention (`<submission_id>/<filename>`) we do two passes: top
  // level for submission folders, then list each folder for its files.
  const result: StorageObjectListEntry[] = [];
  const { data: entries } = await admin.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });
  for (const entry of entries ?? []) {
    if (!entry.name) continue;
    if (prefix === "") {
      // Top-level: each entry is a submission folder. Recurse one level.
      const sub = await listAllUnderSubmission(admin, bucket, entry.name);
      result.push(...sub);
    } else {
      result.push({
        name: `${prefix}/${entry.name}`,
        created_at: entry.created_at ?? undefined,
        metadata: (entry.metadata as { size?: number } | null) ?? null,
      });
    }
  }
  return result;
}

/**
 * Weekly cron — sweeps storage.objects in the three team-portal buckets
 * that have no matching documents row AND are older than ORPHAN_GRACE_MS.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` per Vercel cron
 * convention. Manual invocations from cURL must include the same.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }
  const provided = request.headers.get("authorization");
  if (provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const cutoffIso = new Date(Date.now() - ORPHAN_GRACE_MS).toISOString();

  const summary: Array<{
    bucket: DocumentBucket;
    scanned: number;
    deleted: number;
    samplePaths: string[];
  }> = [];

  for (const bucket of ALLOWED_BUCKETS) {
    const orphanPaths: string[] = [];
    const all = await listAllUnderSubmission(admin, bucket, "");
    const aged = all.filter(
      (entry) => !entry.created_at || entry.created_at < cutoffIso,
    );
    if (aged.length === 0) {
      summary.push({ bucket, scanned: all.length, deleted: 0, samplePaths: [] });
      continue;
    }

    const paths = aged.map((entry) => entry.name);
    const { data: docRows } = await admin
      .from("documents")
      .select("storage_path")
      .eq("bucket", bucket)
      .in("storage_path", paths);
    const known = new Set(
      (docRows ?? []).map((d) => (d as { storage_path: string }).storage_path),
    );

    for (const path of paths) {
      if (!known.has(path)) orphanPaths.push(path);
    }

    if (orphanPaths.length > 0) {
      let deleted = 0;
      for (let i = 0; i < orphanPaths.length; i += 100) {
        const slice = orphanPaths.slice(i, i + 100);
        const { error } = await admin.storage.from(bucket).remove(slice);
        if (!error) deleted += slice.length;
      }
      summary.push({
        bucket,
        scanned: all.length,
        deleted,
        samplePaths: orphanPaths.slice(0, 5),
      });
    } else {
      summary.push({
        bucket,
        scanned: all.length,
        deleted: 0,
        samplePaths: [],
      });
    }
  }

  const totalDeleted = summary.reduce((acc, s) => acc + s.deleted, 0);
  emitTeamPortalEvent({
    event: "team_orphan_storage_swept",
    severity: "warning",
    tags: { totalDeleted, summary },
  });

  return NextResponse.json({
    ok: true,
    totalDeleted,
    summary,
  });
}

export function POST() {
  return new NextResponse(null, { status: 405, headers: { Allow: "GET" } });
}
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;

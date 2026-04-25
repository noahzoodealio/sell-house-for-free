import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  ALLOWED_BUCKETS,
  ALLOWED_DOC_KINDS,
  ALLOWED_STATUSES,
  MAX_UPLOAD_BYTES,
  buildStoragePath,
  isAllowedBucketForRole,
  isAllowedContentType,
  sanitizeFilename,
  type DocumentBucket,
  type DocumentKind,
  type DocumentRow,
  type DocumentStatus,
} from "./documents-shared";

export {
  ALLOWED_BUCKETS,
  ALLOWED_DOC_KINDS,
  ALLOWED_STATUSES,
  MAX_UPLOAD_BYTES,
  buildStoragePath,
  isAllowedBucketForRole,
  isAllowedContentType,
  sanitizeFilename,
  type DocumentBucket,
  type DocumentKind,
  type DocumentRow,
  type DocumentStatus,
};

export async function listDocumentsForSubmission(
  submissionRowId: string,
): Promise<DocumentRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, submission_id, bucket, storage_path, doc_kind, filename, content_type, size_bytes, status, uploaded_by, uploaded_at, last_downloaded_at",
    )
    .eq("submission_id", submissionRowId)
    .order("uploaded_at", { ascending: false });

  if (error || !data) return [];

  const docs = data.map((row) => row as Record<string, unknown>);

  // Resolve uploader names via two separate lookups (profiles + team_members)
  // so we don't blow up a single-table join on RLS.
  const uploaderIds = Array.from(
    new Set(
      docs
        .map((d) => (d.uploaded_by as string | null) ?? null)
        .filter((v): v is string => !!v),
    ),
  );

  const nameById = new Map<string, string>();
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uploaderIds);
    for (const p of profiles ?? []) {
      const row = p as { id: string; full_name: string };
      nameById.set(row.id, row.full_name);
    }
    const { data: members } = await supabase
      .from("team_members")
      .select("auth_user_id, first_name, last_name")
      .in("auth_user_id", uploaderIds);
    for (const m of members ?? []) {
      const row = m as {
        auth_user_id: string | null;
        first_name: string;
        last_name: string;
      };
      if (row.auth_user_id) {
        nameById.set(
          row.auth_user_id,
          `${row.first_name} ${row.last_name}`.trim(),
        );
      }
    }
  }

  return docs.map((row) => ({
    id: row.id as string,
    submissionRowId: row.submission_id as string,
    bucket: row.bucket as DocumentBucket,
    storagePath: row.storage_path as string,
    docKind: row.doc_kind as DocumentKind,
    filename: row.filename as string,
    contentType: (row.content_type as string | null) ?? null,
    sizeBytes: (row.size_bytes as number | null) ?? null,
    status: row.status as DocumentStatus,
    uploadedBy: (row.uploaded_by as string | null) ?? null,
    uploadedByName: nameById.get((row.uploaded_by as string) ?? "") ?? null,
    uploadedAt: row.uploaded_at as string,
    lastDownloadedAt: (row.last_downloaded_at as string | null) ?? null,
  }));
}

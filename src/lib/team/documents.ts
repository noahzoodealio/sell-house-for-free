import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const ALLOWED_BUCKETS = [
  "seller-docs",
  "seller-photos",
  "team-uploads",
] as const;
export type DocumentBucket = (typeof ALLOWED_BUCKETS)[number];

export const ALLOWED_DOC_KINDS = [
  "listing-agreement",
  "t47-disclosure",
  "hoa-disclosure",
  "title-commitment",
  "inspection-report",
  "offer-contract",
  "seller-photo",
  "other",
] as const;
export type DocumentKind = (typeof ALLOWED_DOC_KINDS)[number];

export const ALLOWED_STATUSES = [
  "uploaded",
  "awaiting-signature",
  "signed",
  "received",
  "archived",
] as const;
export type DocumentStatus = (typeof ALLOWED_STATUSES)[number];

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isAllowedContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return ALLOWED_CONTENT_TYPES.has(lower);
}

const FILENAME_DISALLOWED = /[\x00-\x1f\x7f<>:"\\|?*]/g;

/**
 * Sanitizes a user-supplied filename for use as the leaf segment of a
 * Storage path. Strips path traversal markers and control characters,
 * collapses whitespace, lowercases the extension, and falls back to a
 * timestamped `file` name if the cleaned result is empty.
 */
export function sanitizeFilename(raw: string): string {
  let name = raw
    .replace(/^.*[\\/]/, "") // strip any path prefix
    .replace(FILENAME_DISALLOWED, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || name === "." || name === "..") {
    name = `file-${Date.now()}`;
  }
  // Lowercase extension only (preserve case in stem for human readability).
  const dot = name.lastIndexOf(".");
  if (dot > 0 && dot < name.length - 1) {
    const stem = name.slice(0, dot);
    const ext = name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
    name = `${stem}.${ext}`;
  }
  // Cap length so it can't blow up a path-prefix index.
  if (name.length > 200) {
    name = name.slice(0, 200);
  }
  return name;
}

export function buildStoragePath(
  submissionRowId: string,
  filename: string,
): string {
  const sanitized = sanitizeFilename(filename);
  // Add a short timestamp prefix to disambiguate same-name uploads.
  const stamp = Date.now().toString(36);
  return `${submissionRowId}/${stamp}-${sanitized}`;
}

export function isAllowedBucketForRole(args: {
  bucket: DocumentBucket;
  isTeam: boolean;
  isSeller: boolean;
}): boolean {
  if (args.isTeam) return true; // team can upload to any bucket
  if (args.isSeller) {
    // Sellers may upload only to seller-docs / seller-photos.
    return args.bucket === "seller-docs" || args.bucket === "seller-photos";
  }
  return false;
}

export interface DocumentRow {
  id: string;
  submissionRowId: string;
  bucket: DocumentBucket;
  storagePath: string;
  docKind: DocumentKind;
  filename: string;
  contentType: string | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  uploadedBy: string | null;
  uploadedByName: string | null;
  uploadedAt: string;
  lastDownloadedAt: string | null;
}

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

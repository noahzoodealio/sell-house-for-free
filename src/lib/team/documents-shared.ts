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
    .replace(/^.*[\\/]/, "")
    .replace(FILENAME_DISALLOWED, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || name === "." || name === "..") {
    name = `file-${Date.now()}`;
  }
  const dot = name.lastIndexOf(".");
  if (dot > 0 && dot < name.length - 1) {
    const stem = name.slice(0, dot);
    const ext = name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
    name = `${stem}.${ext}`;
  }
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
  const stamp = Date.now().toString(36);
  return `${submissionRowId}/${stamp}-${sanitized}`;
}

export function isAllowedBucketForRole(args: {
  bucket: DocumentBucket;
  isTeam: boolean;
  isSeller: boolean;
}): boolean {
  if (args.isTeam) return true;
  if (args.isSeller) {
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

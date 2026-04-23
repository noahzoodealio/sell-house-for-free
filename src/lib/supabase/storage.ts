import "server-only";

import { getSupabaseAdmin } from "./server";

const AI_DOCS_BUCKET = "ai-docs";
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class UploadValidationError extends Error {
  constructor(
    public code: "invalid_mime" | "file_too_large",
    message: string,
  ) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export interface UploadInput {
  bytes: Buffer | Uint8Array;
  mime: string;
  originalName: string;
}

export interface UploadResult {
  storagePath: string;
}

export async function uploadToAiDocs(
  sessionId: string,
  file: UploadInput,
): Promise<UploadResult> {
  if (!ALLOWED_MIME.has(file.mime)) {
    throw new UploadValidationError(
      "invalid_mime",
      `MIME ${file.mime} not allowed; expected application/pdf or image/{jpeg,png,webp}`,
    );
  }
  const byteLength =
    file.bytes instanceof Buffer
      ? file.bytes.byteLength
      : (file.bytes as Uint8Array).byteLength;
  if (byteLength > MAX_BYTES) {
    throw new UploadValidationError(
      "file_too_large",
      `File ${byteLength} bytes exceeds ${MAX_BYTES} byte cap`,
    );
  }

  const ext = MIME_TO_EXT[file.mime];
  const storagePath = `${sessionId}/${crypto.randomUUID()}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(AI_DOCS_BUCKET)
    .upload(storagePath, file.bytes, {
      contentType: file.mime,
      upsert: false,
    });

  if (error) {
    throw new Error(`ai-docs upload failed: ${error.message}`);
  }

  return { storagePath };
}

export async function mintSignedUrl(
  storagePath: string,
  ttlSeconds = 3600,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(AI_DOCS_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(
      `mintSignedUrl failed for ${storagePath}: ${error?.message ?? "unknown"}`,
    );
  }
  return data.signedUrl;
}

export async function deleteFromAiDocs(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(AI_DOCS_BUCKET)
    .remove([storagePath]);
  if (error) {
    throw new Error(
      `deleteFromAiDocs failed for ${storagePath}: ${error.message}`,
    );
  }
}

export const AI_DOCS_UPLOAD_LIMITS = Object.freeze({
  maxBytes: MAX_BYTES,
  allowedMime: Array.from(ALLOWED_MIME),
} as const);

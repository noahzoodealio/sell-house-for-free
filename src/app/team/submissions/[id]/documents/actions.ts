"use server";

import { revalidatePath } from "next/cache";

import { captureException } from "@/lib/pm-service/observability";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import {
  ALLOWED_BUCKETS,
  ALLOWED_DOC_KINDS,
  ALLOWED_STATUSES,
  buildStoragePath,
  isAllowedBucketForRole,
  isAllowedContentType,
  MAX_UPLOAD_BYTES,
  type DocumentBucket,
  type DocumentKind,
  type DocumentStatus,
} from "@/lib/team/documents";

const SIGNED_DOWNLOAD_TTL_SECONDS = 600; // 10 min

export interface AuthorizationContext {
  authUserId: string;
  isTeam: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  teamMemberId: string | null;
}

async function authorizeSubmission(
  submissionRowId: string,
): Promise<AuthorizationContext | null> {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseAdmin();
  const { data: subRow } = await admin
    .from("submissions")
    .select("id, pm_user_id, seller_id")
    .eq("id", submissionRowId)
    .maybeSingle();
  if (!subRow) return null;
  const sub = subRow as {
    id: string;
    pm_user_id: string | null;
    seller_id: string;
  };

  const isSeller = sub.seller_id === user.id;
  const member = await findTeamMemberByAuthUserId(user.id);
  const isTeam = !!member?.active && sub.pm_user_id === member.id;
  const isAdmin = !!member?.active && member.isAdmin;

  if (!isSeller && !isTeam && !isAdmin) return null;
  return {
    authUserId: user.id,
    isTeam: isTeam || isAdmin,
    isSeller,
    isAdmin,
    teamMemberId: member?.id ?? null,
  };
}

export interface MintUploadInput {
  submissionRowId: string;
  bucket: DocumentBucket;
  docKind: DocumentKind;
  filename: string;
  sizeBytes: number;
  contentType: string;
}

export type MintUploadResult =
  | { ok: true; signedUrl: string; token: string; storagePath: string }
  | {
      ok: false;
      reason: "unauthorized" | "validation" | "internal";
    };

export async function mintUploadUrl(
  input: MintUploadInput,
): Promise<MintUploadResult> {
  const ctx = await authorizeSubmission(input.submissionRowId);
  if (!ctx) return { ok: false, reason: "unauthorized" };

  if (!ALLOWED_BUCKETS.includes(input.bucket)) {
    return { ok: false, reason: "validation" };
  }
  if (!ALLOWED_DOC_KINDS.includes(input.docKind)) {
    return { ok: false, reason: "validation" };
  }
  if (!isAllowedBucketForRole({
    bucket: input.bucket,
    isTeam: ctx.isTeam,
    isSeller: ctx.isSeller,
  })) {
    return { ok: false, reason: "unauthorized" };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, reason: "validation" };
  }
  if (input.sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "validation" };
  }
  if (!isAllowedContentType(input.contentType)) {
    return { ok: false, reason: "validation" };
  }

  const storagePath = buildStoragePath(input.submissionRowId, input.filename);
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.storage
    .from(input.bucket)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    captureException({
      event: "team_message_insert_failed", // reusing — narrowest error class
      severity: "error",
      extras: {
        op: "mintUploadUrl",
        error: error?.message ?? "unknown",
        bucket: input.bucket,
      },
    });
    return { ok: false, reason: "internal" };
  }

  return {
    ok: true,
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
  };
}

export interface FinalizeUploadInput {
  submissionRowId: string;
  bucket: DocumentBucket;
  storagePath: string;
  docKind: DocumentKind;
  filename: string;
  sizeBytes: number;
  contentType: string;
}

export type FinalizeUploadResult =
  | { ok: true; documentId: string }
  | {
      ok: false;
      reason: "unauthorized" | "validation" | "size_mismatch" | "internal";
    };

export async function finalizeUpload(
  input: FinalizeUploadInput,
): Promise<FinalizeUploadResult> {
  const ctx = await authorizeSubmission(input.submissionRowId);
  if (!ctx) return { ok: false, reason: "unauthorized" };

  if (!ALLOWED_BUCKETS.includes(input.bucket)) {
    return { ok: false, reason: "validation" };
  }
  if (!ALLOWED_DOC_KINDS.includes(input.docKind)) {
    return { ok: false, reason: "validation" };
  }
  if (!input.storagePath.startsWith(`${input.submissionRowId}/`)) {
    return { ok: false, reason: "validation" };
  }

  const admin = getSupabaseAdmin();

  // Verify the object exists + measure actual size for tamper guard.
  const { data: meta, error: metaError } = await admin.storage
    .from(input.bucket)
    .list(input.submissionRowId, {
      search: input.storagePath.slice(input.submissionRowId.length + 1),
    });

  if (metaError) {
    return { ok: false, reason: "internal" };
  }
  const found = (meta ?? []).find(
    (entry) => `${input.submissionRowId}/${entry.name}` === input.storagePath,
  );
  if (!found) {
    return { ok: false, reason: "validation" };
  }

  const actualBytes =
    typeof found.metadata?.size === "number" ? found.metadata.size : 0;
  if (
    actualBytes > 0 &&
    Math.abs(actualBytes - input.sizeBytes) >
      Math.max(1024, input.sizeBytes * 0.1)
  ) {
    // Size mismatch beyond tolerance — treat as tampered upload.
    await admin.storage.from(input.bucket).remove([input.storagePath]);
    return { ok: false, reason: "size_mismatch" };
  }

  const { data: insertRow, error: insertError } = await admin
    .from("documents")
    .insert({
      submission_id: input.submissionRowId,
      bucket: input.bucket,
      storage_path: input.storagePath,
      doc_kind: input.docKind,
      filename: input.filename,
      content_type: input.contentType,
      size_bytes: actualBytes || input.sizeBytes,
      uploaded_by: ctx.authUserId,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (insertError || !insertRow) {
    // Object orphaned — sweep cron in S10 will clean it up. Log + bail.
    captureException({
      event: "team_message_insert_failed",
      severity: "error",
      extras: {
        op: "finalizeUpload",
        error: insertError?.message ?? "unknown",
        bucket: input.bucket,
      },
    });
    return { ok: false, reason: "internal" };
  }

  await admin.from("team_activity_events").insert({
    submission_id: input.submissionRowId,
    team_user_id: ctx.authUserId,
    event_type: "document_uploaded",
    event_data: {
      bucket: input.bucket,
      doc_kind: input.docKind,
      document_id: (insertRow as { id: string }).id,
      filename: input.filename,
    },
  });

  revalidatePath(`/team/submissions/${input.submissionRowId}/documents`);
  revalidatePath(`/team/submissions/${input.submissionRowId}`);
  return { ok: true, documentId: (insertRow as { id: string }).id };
}

export type DownloadResult =
  | { ok: true; signedUrl: string; filename: string }
  | { ok: false; reason: "not_found" };

export async function downloadDocument(
  documentId: string,
): Promise<DownloadResult> {
  const admin = getSupabaseAdmin();
  const { data: docRow } = await admin
    .from("documents")
    .select("id, submission_id, bucket, storage_path, filename")
    .eq("id", documentId)
    .maybeSingle();
  if (!docRow) return { ok: false, reason: "not_found" };
  const doc = docRow as {
    id: string;
    submission_id: string;
    bucket: DocumentBucket;
    storage_path: string;
    filename: string;
  };

  const ctx = await authorizeSubmission(doc.submission_id);
  if (!ctx) return { ok: false, reason: "not_found" };
  // Sellers cannot read team-uploads.
  if (doc.bucket === "team-uploads" && !ctx.isTeam) {
    return { ok: false, reason: "not_found" };
  }

  const { data: signed, error } = await admin.storage
    .from(doc.bucket)
    .createSignedUrl(doc.storage_path, SIGNED_DOWNLOAD_TTL_SECONDS);
  if (error || !signed) {
    return { ok: false, reason: "not_found" };
  }

  await admin
    .from("documents")
    .update({ last_downloaded_at: new Date().toISOString() })
    .eq("id", doc.id);

  await admin.from("team_activity_events").insert({
    submission_id: doc.submission_id,
    team_user_id: ctx.authUserId,
    event_type: "document_downloaded",
    event_data: {
      bucket: doc.bucket,
      document_id: doc.id,
      filename: doc.filename,
    },
  });

  return { ok: true, signedUrl: signed.signedUrl, filename: doc.filename };
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "not_found" | "internal" };

export async function deleteDocument(documentId: string): Promise<DeleteResult> {
  const admin = getSupabaseAdmin();
  const { data: docRow } = await admin
    .from("documents")
    .select("id, submission_id, bucket, storage_path, uploaded_by, filename")
    .eq("id", documentId)
    .maybeSingle();
  if (!docRow) return { ok: false, reason: "not_found" };
  const doc = docRow as {
    id: string;
    submission_id: string;
    bucket: DocumentBucket;
    storage_path: string;
    uploaded_by: string | null;
    filename: string;
  };

  const ctx = await authorizeSubmission(doc.submission_id);
  if (!ctx) return { ok: false, reason: "unauthorized" };
  // Only the uploader or an admin can delete.
  if (doc.uploaded_by !== ctx.authUserId && !ctx.isAdmin) {
    return { ok: false, reason: "unauthorized" };
  }

  const { error: storageError } = await admin.storage
    .from(doc.bucket)
    .remove([doc.storage_path]);
  if (storageError) {
    return { ok: false, reason: "internal" };
  }

  const { error: deleteError } = await admin
    .from("documents")
    .delete()
    .eq("id", doc.id);
  if (deleteError) {
    return { ok: false, reason: "internal" };
  }

  await admin.from("team_activity_events").insert({
    submission_id: doc.submission_id,
    team_user_id: ctx.authUserId,
    event_type: "document_deleted",
    event_data: {
      bucket: doc.bucket,
      filename: doc.filename,
    },
  });

  revalidatePath(`/team/submissions/${doc.submission_id}/documents`);
  revalidatePath(`/team/submissions/${doc.submission_id}`);
  return { ok: true };
}

export interface UpdateDocumentFieldInput {
  documentId: string;
  status?: DocumentStatus;
  docKind?: DocumentKind;
}

export type UpdateDocumentFieldResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "validation" | "internal" };

export async function updateDocumentField(
  input: UpdateDocumentFieldInput,
): Promise<UpdateDocumentFieldResult> {
  if (
    input.status !== undefined &&
    !ALLOWED_STATUSES.includes(input.status)
  ) {
    return { ok: false, reason: "validation" };
  }
  if (
    input.docKind !== undefined &&
    !ALLOWED_DOC_KINDS.includes(input.docKind)
  ) {
    return { ok: false, reason: "validation" };
  }
  if (input.status === undefined && input.docKind === undefined) {
    return { ok: false, reason: "validation" };
  }

  const admin = getSupabaseAdmin();
  const { data: docRow } = await admin
    .from("documents")
    .select("id, submission_id")
    .eq("id", input.documentId)
    .maybeSingle();
  if (!docRow) return { ok: false, reason: "unauthorized" };
  const doc = docRow as { id: string; submission_id: string };

  const ctx = await authorizeSubmission(doc.submission_id);
  if (!ctx || (!ctx.isTeam && !ctx.isAdmin)) {
    return { ok: false, reason: "unauthorized" };
  }

  const patch: Record<string, unknown> = {};
  if (input.status !== undefined) patch.status = input.status;
  if (input.docKind !== undefined) patch.doc_kind = input.docKind;

  const { error: updateError } = await admin
    .from("documents")
    .update(patch)
    .eq("id", doc.id);
  if (updateError) {
    return { ok: false, reason: "internal" };
  }

  await admin.from("team_activity_events").insert({
    submission_id: doc.submission_id,
    team_user_id: ctx.authUserId,
    event_type: "status_changed",
    event_data: {
      target: "document",
      document_id: doc.id,
      status: input.status,
      doc_kind: input.docKind,
    },
  });

  revalidatePath(`/team/submissions/${doc.submission_id}/documents`);
  return { ok: true };
}

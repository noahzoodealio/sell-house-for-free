"use client";

import { useRef, useState, useTransition } from "react";

import {
  finalizeUpload,
  mintUploadUrl,
} from "@/app/team/submissions/[id]/documents/actions";
import {
  ALLOWED_DOC_KINDS,
  type DocumentBucket,
  type DocumentKind,
} from "@/lib/team/documents";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface DocumentUploaderProps {
  submissionRowId: string;
  bucket: DocumentBucket;
  defaultDocKind: DocumentKind;
  bucketLabel: string;
}

export function DocumentUploader({
  submissionRowId,
  bucket,
  defaultDocKind,
  bucketLabel,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docKind, setDocKind] = useState<DocumentKind>(defaultDocKind);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function pickFile() {
    inputRef.current?.click();
  }

  async function uploadFile(file: File) {
    setError(null);
    startTransition(async () => {
      const mintResult = await mintUploadUrl({
        submissionRowId,
        bucket,
        docKind,
        filename: file.name,
        sizeBytes: file.size,
        contentType: file.type || "application/octet-stream",
      });
      if (!mintResult.ok) {
        setError(
          mintResult.reason === "validation"
            ? "File type or size not allowed."
            : mintResult.reason === "unauthorized"
              ? "Not authorized to upload here."
              : "Upload setup failed. Try again.",
        );
        return;
      }

      const putResp = await fetch(mintResult.signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "x-upsert": "false",
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      if (!putResp.ok) {
        setError(`Upload to storage failed (${putResp.status}).`);
        return;
      }

      const finalize = await finalizeUpload({
        submissionRowId,
        bucket,
        storagePath: mintResult.storagePath,
        docKind,
        filename: file.name,
        sizeBytes: file.size,
        contentType: file.type || "application/octet-stream",
      });
      if (!finalize.ok) {
        setError(
          finalize.reason === "size_mismatch"
            ? "Upload size mismatch. The file was rejected."
            : "Upload finalize failed. Try again.",
        );
      }
    });
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
    event.target.value = "";
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      className="flex flex-col gap-2 rounded-lg border border-dashed border-ink-border bg-white p-4"
      aria-label={`${bucketLabel} upload`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-ink-heading">
          Type
          <select
            value={docKind}
            onChange={(event) => setDocKind(event.target.value as DocumentKind)}
            disabled={busy}
            className="ml-2 rounded-md border border-ink-border px-2 py-1 text-sm"
          >
            {ALLOWED_DOC_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className="rounded-md bg-brand-primary px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Choose file"}
        </button>
        <span className="text-xs text-ink-subtle">or drag & drop</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onFileChange}
        disabled={busy}
        className="hidden"
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface UploadedFile {
  documentId: string;
  previewUrl: string;
  originalName: string;
  mime: string;
}

interface DocUploadProps {
  onUploaded: (file: UploadedFile) => void;
}

export function DocUpload({ onUploaded }: DocUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHover, setIsHover] = useState(false);
  const [lastUpload, setLastUpload] = useState<UploadedFile | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_MIME.has(file.type)) {
      setError("Only PDFs and JPG/PNG/WebP images are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("This file is too large (10 MB max).");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const payload: { error?: string; maxBytes?: number } = await res
          .json()
          .catch(() => ({}));
        if (payload.error === "file_too_large") {
          setError("This file is too large (10 MB max).");
        } else if (payload.error === "invalid_mime") {
          setError("Only PDFs and JPG/PNG/WebP images are supported.");
        } else if (payload.error === "no_session") {
          setError("Your session expired. Reload the page and try again.");
        } else {
          setError("Upload failed. Please try again.");
        }
        return;
      }
      const payload = (await res.json()) as UploadedFile;
      setLastUpload(payload);
      onUploaded(payload);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsHover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a PDF or image"
        onClick={() => inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          setIsHover(true);
        }}
        onDragLeave={() => setIsHover(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg px-4 py-3 text-sm cursor-pointer transition-colors ${
          isHover
            ? "border-brand bg-surface-tint"
            : "border-border hover:border-brand/60"
        }`}
      >
        {uploading ? (
          <span aria-live="polite">Uploading…</span>
        ) : (
          <span className="text-ink-muted">
            Drop a PDF or image here, or click to pick a file (10 MB max).
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-[var(--color-error)] text-sm"
        >
          {error}
        </p>
      )}

      {lastUpload && !uploading && (
        <div className="flex items-center gap-3 bg-surface border border-border rounded-md px-3 py-2">
          {lastUpload.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lastUpload.previewUrl}
              alt={lastUpload.originalName}
              className="w-12 h-12 object-contain rounded"
            />
          ) : (
            <span
              aria-hidden="true"
              className="w-12 h-12 flex items-center justify-center bg-surface-tint rounded text-xs font-mono"
            >
              PDF
            </span>
          )}
          <span className="text-sm truncate">{lastUpload.originalName}</span>
          <button
            type="button"
            aria-label="Remove attachment"
            className="ml-auto text-ink-muted hover:text-ink-body"
            onClick={() => setLastUpload(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

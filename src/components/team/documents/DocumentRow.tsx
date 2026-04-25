"use client";

import { useState, useTransition } from "react";

import {
  deleteDocument,
  downloadDocument,
  updateDocumentField,
} from "@/app/team/submissions/[id]/documents/actions";
import {
  ALLOWED_DOC_KINDS,
  ALLOWED_STATUSES,
  type DocumentKind,
  type DocumentRow as DocumentRowType,
  type DocumentStatus,
} from "@/lib/team/documents";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface DocumentRowProps {
  doc: DocumentRowType;
  canDelete: boolean;
  canEdit: boolean;
}

export function DocumentRow({ doc, canDelete, canEdit }: DocumentRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function onDownload() {
    setError(null);
    startTransition(async () => {
      const result = await downloadDocument(doc.id);
      if (!result.ok) {
        setError("File not available.");
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    });
  }

  function onDelete() {
    if (!confirm(`Delete ${doc.filename}? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDocument(doc.id);
      if (!result.ok) {
        setError("Delete failed.");
      }
    });
  }

  function onChangeStatus(event: React.ChangeEvent<HTMLSelectElement>) {
    const status = event.target.value as DocumentStatus;
    setError(null);
    startTransition(async () => {
      const result = await updateDocumentField({
        documentId: doc.id,
        status,
      });
      if (!result.ok) setError("Status update failed.");
    });
  }

  function onChangeKind(event: React.ChangeEvent<HTMLSelectElement>) {
    const docKind = event.target.value as DocumentKind;
    setError(null);
    startTransition(async () => {
      const result = await updateDocumentField({
        documentId: doc.id,
        docKind,
      });
      if (!result.ok) setError("Type update failed.");
    });
  }

  return (
    <li className="flex flex-col gap-2 border-b border-ink-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-medium text-ink-heading">
          {doc.filename}
        </span>
        <span className="rounded-full bg-ink-subtle/10 px-2 py-0.5 text-xs text-ink-subtle">
          {doc.docKind}
        </span>
        <span className="text-xs text-ink-subtle">
          {formatBytes(doc.sizeBytes)}
        </span>
        <span className="text-xs text-ink-subtle">
          uploaded {formatRelative(doc.uploadedAt)}
          {doc.uploadedByName ? ` by ${doc.uploadedByName}` : null}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <>
            <label className="text-xs text-ink-subtle">
              Status
              <select
                value={doc.status}
                onChange={onChangeStatus}
                disabled={busy}
                className="ml-1 rounded-md border border-ink-border px-2 py-0.5 text-xs"
              >
                {ALLOWED_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-subtle">
              Type
              <select
                value={doc.docKind}
                onChange={onChangeKind}
                disabled={busy}
                className="ml-1 rounded-md border border-ink-border px-2 py-0.5 text-xs"
              >
                {ALLOWED_DOC_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className="rounded-md border border-ink-border bg-white px-3 py-1 text-xs text-ink-heading hover:bg-ink-subtle/5 disabled:opacity-60"
        >
          {busy ? "…" : "Download"}
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Delete
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function DocumentBucketSection({
  title,
  description,
  docs,
  canDelete,
  canEdit,
}: {
  title: string;
  description: string;
  docs: DocumentRowType[];
  canDelete: (uploadedBy: string | null) => boolean;
  canEdit: boolean;
}) {
  if (docs.length === 0) {
    return (
      <p className="text-sm text-ink-subtle">
        No {title.toLowerCase()} yet. {description}
      </p>
    );
  }
  return (
    <ul className="rounded-lg border border-ink-border bg-white px-4">
      {docs.map((doc) => (
        <DocumentRow
          key={doc.id}
          doc={doc}
          canDelete={canDelete(doc.uploadedBy)}
          canEdit={canEdit}
        />
      ))}
    </ul>
  );
}

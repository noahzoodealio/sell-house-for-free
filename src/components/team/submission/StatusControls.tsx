"use client";

import { useState, useTransition } from "react";

import { advanceStatus } from "@/app/team/submissions/[id]/actions";
import {
  STATUS_ADVANCE_MAP,
  STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/team/submissions";

export function StatusControls({
  submissionRowId,
  currentStatus,
}: {
  submissionRowId: string;
  currentStatus: SubmissionStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const allowed = STATUS_ADVANCE_MAP[currentStatus] ?? [];

  if (allowed.length === 0) {
    return (
      <p className="text-xs text-ink-subtle">
        No further status transitions from <strong>{STATUS_LABELS[currentStatus]}</strong>.
      </p>
    );
  }

  function onClick(target: SubmissionStatus) {
    if (
      !confirm(
        `Move status from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[target]}?`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await advanceStatus(submissionRowId, target);
      if (!result.ok) {
        setError(
          result.reason === "invalid_transition"
            ? "Status transition no longer valid (someone may have advanced it)."
            : "Could not change status.",
        );
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowed.map((target) => (
        <button
          key={target}
          type="button"
          onClick={() => onClick(target)}
          disabled={pending}
          className="rounded-md bg-brand-primary px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "…" : `Advance to ${STATUS_LABELS[target]}`}
        </button>
      ))}
      {error ? (
        <p role="alert" className="w-full text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

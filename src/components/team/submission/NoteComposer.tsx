"use client";

import { useState, useTransition } from "react";

import { addNote } from "@/app/team/submissions/[id]/actions";

const MAX_NOTE = 5_000;

export function NoteComposer({ submissionRowId }: { submissionRowId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      setError("Note cannot be empty.");
      return;
    }
    startTransition(async () => {
      const result = await addNote(submissionRowId, trimmed);
      if (!result.ok) {
        setError(
          result.reason === "validation"
            ? "Note must be 1–5,000 characters."
            : "Save failed.",
        );
        return;
      }
      setBody("");
      setSuccess(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        disabled={pending}
        maxLength={MAX_NOTE}
        placeholder="Internal note — visible to team only"
        className="w-full rounded-md border border-ink-border px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-ink-subtle/10"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-subtle">
          {body.length.toLocaleString()} / {MAX_NOTE.toLocaleString()}
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-primary px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save note"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="text-xs text-emerald-700">
          Note saved.
        </p>
      ) : null}
    </form>
  );
}

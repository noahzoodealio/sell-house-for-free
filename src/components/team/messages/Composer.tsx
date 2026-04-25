"use client";

import { useState, useTransition } from "react";

import { sendTeamMessage } from "@/app/team/submissions/[id]/messages/actions";

const MAX_BODY_CHARS = 10_000;

export function Composer({ submissionRowId }: { submissionRowId: string }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required.");
      return;
    }
    if (body.length > MAX_BODY_CHARS) {
      setError(`Body exceeds ${MAX_BODY_CHARS.toLocaleString()} characters.`);
      return;
    }

    startTransition(async () => {
      const result = await sendTeamMessage({
        submissionRowId,
        subject: subject.trim(),
        body: body.trim(),
      });
      if (result.ok) {
        setSubject("");
        setBody("");
        return;
      }
      if (result.reason === "validation") {
        setError("Subject and body are required.");
      } else if (result.reason === "not_assignee") {
        setError("You are not assigned to this submission.");
      } else if (result.reason === "unauthenticated") {
        setError("Your session has expired. Sign in again.");
      } else if (result.reason === "send_failed") {
        setError("Email send failed. Try again in a moment.");
      } else {
        setError("Something went wrong. Try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-ink-border pt-4">
      <label className="text-sm font-medium text-ink-heading">
        Subject
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          disabled={pending}
          required
          className="mt-1 w-full rounded-lg border border-ink-border px-3 py-2 text-sm text-ink-heading focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-ink-subtle/10"
          maxLength={300}
        />
      </label>
      <label className="text-sm font-medium text-ink-heading">
        Message
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={pending}
          required
          rows={6}
          className="mt-1 w-full rounded-lg border border-ink-border px-3 py-2 font-mono text-sm text-ink-heading focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-ink-subtle/10"
          maxLength={MAX_BODY_CHARS}
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-ink-subtle">
          {body.length.toLocaleString()} / {MAX_BODY_CHARS.toLocaleString()} characters
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send to seller"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}

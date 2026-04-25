"use client";

import { useState } from "react";

import {
  buildAiContextBrief,
  extractText,
  truncate,
  type AiArtifactRow,
  type AiSessionWithMessages,
} from "@/lib/team/ai-context";

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionCard({
  session,
  artifacts,
}: {
  session: AiSessionWithMessages;
  artifacts: AiArtifactRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyBrief() {
    const text = buildAiContextBrief(session);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // navigator.clipboard fails on http:// — silent.
    }
  }

  const firstQuestion =
    session.firstUserText || "(no user turns recorded)";
  const lastAnswer =
    session.lastAssistantText || "(no assistant turns recorded)";

  return (
    <article className="rounded-lg border border-ink-border bg-white p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-heading">
            Session
          </h3>
          <p className="text-xs text-ink-subtle">
            Active {relative(session.session.lastActiveAt)} · started{" "}
            {relative(session.session.startedAt)}
          </p>
        </div>
        <div className="text-right text-xs text-ink-subtle">
          <p>
            {session.messageCount} messages · {session.session.tokensIn}/
            {session.session.tokensOut} tokens
          </p>
        </div>
      </header>

      <dl className="mt-3 grid gap-2 text-sm">
        <div>
          <dt className="text-xs text-ink-subtle">First question</dt>
          <dd className="text-ink-body">{truncate(firstQuestion, 200)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-subtle">Most recent answer</dt>
          <dd className="text-ink-body">{truncate(lastAnswer, 300)}</dd>
        </div>
      </dl>

      {artifacts.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-ink-subtle">
            Artifacts ({artifacts.length})
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {artifacts.map((artifact) => (
              <li
                key={artifact.id}
                className="rounded-full bg-ink-subtle/10 px-3 py-1 text-xs"
              >
                {artifact.kind} · {relative(artifact.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-brand-primary underline"
        >
          {expanded ? "Hide transcript" : "Show transcript"}
        </button>
        <button
          type="button"
          onClick={copyBrief}
          className="text-xs text-brand-primary underline"
        >
          {copied ? "Copied!" : "Copy brief"}
        </button>
      </div>

      {expanded ? (
        <ol className="mt-3 flex flex-col gap-2 border-t border-ink-border pt-3">
          {session.messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-md px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-ink-subtle/10 text-ink-heading"
                  : message.role === "assistant"
                    ? "bg-brand-primary/5 text-ink-body"
                    : "bg-amber-50 text-ink-body"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-ink-subtle">
                {message.role}
              </p>
              <p className="whitespace-pre-wrap">
                {extractText(message.contentJson) ||
                  "(non-text content — see ai_messages.content_json)"}
              </p>
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}

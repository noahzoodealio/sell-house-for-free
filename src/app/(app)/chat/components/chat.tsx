"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { Message } from "./message";

interface ChatProps {
  sessionId: string;
}

interface BudgetError {
  error: "budget_exceeded" | "no_session" | string;
  reason?: string;
}

export function Chat({ sessionId }: ChatProps) {
  const [input, setInput] = useState("");
  const [serverError, setServerError] = useState<BudgetError | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sessionId },
      }),
    [sessionId],
  );

  const { messages, sendMessage, status } = useChat({
    id: sessionId,
    transport,
    onError: (err) => {
      try {
        const parsed = JSON.parse(err.message);
        setServerError(parsed);
      } catch {
        setServerError({ error: "unknown", reason: err.message });
      }
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    setServerError(null);
    setInput("");
    void sendMessage({ text: trimmed });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <section
        aria-label="Conversation"
        role="log"
        aria-live="polite"
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {messages.length === 0 ? (
            <p className="text-ink-muted text-sm">
              Ask anything about pricing, offers, contract terms, or which
              selling path makes sense for your situation.
            </p>
          ) : (
            messages.map((m) => <Message key={m.id} message={m} />)
          )}
        </div>
      </section>

      {serverError?.error === "budget_exceeded" && (
        <div
          role="alert"
          className="bg-[var(--color-error)]/10 border-t border-[var(--color-error)] px-4 py-3 text-sm"
        >
          <div className="max-w-4xl mx-auto">
            <p>{serverError.reason}</p>
            <a
              href="/get-started"
              className="underline text-brand mt-1 inline-block"
            >
              Talk to your PM →
            </a>
          </div>
        </div>
      )}

      {serverError?.error === "no_session" && (
        <div
          role="alert"
          className="bg-surface-tint border-t border-border px-4 py-3 text-sm"
        >
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <span>Your session expired.</span>
            <Button
              size="xs"
              onClick={() => {
                window.location.reload();
              }}
            >
              Start a new conversation
            </Button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-4 py-3 bg-surface"
        aria-label="Send a message"
      >
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <Textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const form = e.currentTarget.form;
                form?.requestSubmit();
              }
            }}
            placeholder="Ask about your home, an offer, or a contract term…"
            className="min-h-[52px] max-h-[200px] flex-1"
            rows={1}
            disabled={isBusy}
          />
          <Button
            type="submit"
            size="sm"
            disabled={isBusy || input.trim().length === 0}
          >
            {isBusy ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}

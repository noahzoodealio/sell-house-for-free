"use client";

import { useState, useTransition } from "react";

import { resendMagicLink } from "../actions";

type Tab = "email" | "phone";

export function ResendForm() {
  const [tab, setTab] = useState<Tab>("email");
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) return;

    startTransition(async () => {
      const result = await resendMagicLink({
        identifier: value,
        identifierType: tab,
      });

      if (result.ok) {
        setStatus("ok");
        setMessage(
          tab === "email"
            ? "Check your email — we sent a fresh sign-in link."
            : "Check your phone — we sent a fresh sign-in code.",
        );
        return;
      }

      setStatus("error");
      if (result.reason === "rate_limited") {
        const minutes = Math.max(
          1,
          Math.ceil(result.retryAfterMs / 60_000),
        );
        setMessage(
          `Too many send attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        );
      } else if (result.reason === "tcpa_missing") {
        setMessage(
          "We need your texting consent on file before we can send a code. Use email instead, or contact support.",
        );
      } else if (result.reason === "invalid_input") {
        setMessage("Double-check your entry and try again.");
      } else {
        setMessage(
          "We couldn't send that link. Try again in a moment or contact support.",
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2" role="tablist" aria-label="Send method">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "email"}
          onClick={() => setTab("email")}
          className={
            "flex-1 rounded-lg border-2 px-4 py-2 text-sm font-semibold " +
            (tab === "email"
              ? "border-brand bg-brand/5 text-brand"
              : "border-transparent text-ink-body hover:bg-surface-tint")
          }
        >
          Email me a link
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "phone"}
          onClick={() => setTab("phone")}
          className={
            "flex-1 rounded-lg border-2 px-4 py-2 text-sm font-semibold " +
            (tab === "phone"
              ? "border-brand bg-brand/5 text-brand"
              : "border-transparent text-ink-body hover:bg-surface-tint")
          }
        >
          Text me a code
        </button>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-heading">
        {tab === "email" ? "Email address" : "Phone number"}
        <input
          type={tab === "email" ? "email" : "tel"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoComplete={tab === "email" ? "email" : "tel"}
          inputMode={tab === "email" ? "email" : "tel"}
          className="h-12 rounded-lg border-2 border-surface-edge px-4 text-base focus:border-brand focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-brand px-6 font-semibold text-brand-foreground disabled:opacity-50"
      >
        {pending ? "Sending…" : tab === "email" ? "Send link" : "Send code"}
      </button>

      {message && (
        <p
          role="status"
          className={
            "text-sm " +
            (status === "ok" ? "text-emerald-700" : "text-red-700")
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}

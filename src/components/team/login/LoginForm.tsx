"use client";

import { useState, useTransition } from "react";

import { sendTeamLoginLink } from "@/app/team/login/actions";

type Status = "idle" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await sendTeamLoginLink({ email: trimmed });
      if (result.ok) {
        setStatus("sent");
        setMessage(
          "If your email is on the team roster, a sign-in link is on its way. The link expires in 24 hours.",
        );
        return;
      }
      setStatus("error");
      if (result.reason === "rate_limited") {
        const minutes = Math.max(1, Math.ceil(result.retryAfterMs / 60_000));
        setMessage(
          `Too many send attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        );
      } else if (result.reason === "invalid_input") {
        setMessage("Double-check your email and try again.");
      } else {
        setMessage("Something went wrong. Try again in a moment.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label htmlFor="team-login-email" className="text-sm font-medium text-ink-heading">
        Work email
      </label>
      <input
        id="team-login-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={pending || status === "sent"}
        className="rounded-lg border border-ink-border px-4 py-3 text-base text-ink-heading focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-ink-subtle/10"
        placeholder="you@sellyourhousefree.com"
      />
      <button
        type="submit"
        disabled={pending || status === "sent"}
        className="rounded-lg bg-brand-primary px-4 py-3 text-base font-semibold text-white transition disabled:opacity-60"
      >
        {pending
          ? "Sending…"
          : status === "sent"
            ? "Sent"
            : "Send sign-in link"}
      </button>

      {message ? (
        <p
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={
            status === "error"
              ? "text-sm text-red-600"
              : "text-sm text-ink-body"
          }
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

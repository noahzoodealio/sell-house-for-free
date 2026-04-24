"use client";

import { useCallback, useState, useTransition } from "react";

import { requestOtp, verifyOtpAndSignIn } from "@/app/portal/login/actions";

import { OtpCodeInput } from "./OtpCodeInput";

type Tab = "email" | "phone";
type Stage = "input" | "verify";

export function LoginForm({ redirect }: { redirect: string | null }) {
  const [tab, setTab] = useState<Tab>("email");
  const [identifier, setIdentifier] = useState("");
  const [normalizedIdentifier, setNormalizedIdentifier] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [verifyFailures, setVerifyFailures] = useState(0);
  const [locked, setLocked] = useState(false);
  const [pending, startTransition] = useTransition();

  function resetTo(nextTab: Tab) {
    setTab(nextTab);
    setStage("input");
    setIdentifier("");
    setNormalizedIdentifier("");
    setMessage(null);
    setStatus("idle");
    setVerifyFailures(0);
    setLocked(false);
  }

  function onSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = identifier.trim();
    if (!raw) return;

    startTransition(async () => {
      const result = await requestOtp(
        tab === "email"
          ? { method: "email", identifier: raw }
          : { method: "phone", identifier: raw },
      );

      if (result.ok) {
        setNormalizedIdentifier(result.normalizedIdentifier);
        setStage("verify");
        setStatus("ok");
        setVerifyFailures(0);
        setLocked(false);
        setMessage(
          tab === "email"
            ? "We sent a 6-digit code. Check your email."
            : "We sent a 6-digit code. Check your phone.",
        );
        return;
      }

      setStatus("error");
      if (result.reason === "rate_limited") {
        const minutes = Math.max(1, Math.ceil(result.retryAfterMs / 60_000));
        setMessage(
          `Too many send attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        );
      } else if (result.reason === "tcpa_missing") {
        setMessage(
          "We need your texting consent on file before we can send a code. Use email instead, or contact support.",
        );
      } else if (result.reason === "user_not_found") {
        setMessage(
          `We don't see an account with that ${tab}. Double-check it or contact support.`,
        );
      } else if (result.reason === "invalid_input") {
        setMessage("Double-check your entry and try again.");
      } else {
        setMessage("Something went wrong. Try again in a moment.");
      }
    });
  }

  const onCodeComplete = useCallback(
    (code: string) => {
      if (locked || pending) return;
      startTransition(async () => {
        const result = await verifyOtpAndSignIn({
          method: tab,
          identifier: normalizedIdentifier,
          token: code,
          redirect,
        });
        if (result.ok) {
          window.location.href = result.redirect;
          return;
        }
        const nextFailures = verifyFailures + 1;
        setVerifyFailures(nextFailures);
        setStatus("error");
        if (nextFailures >= 3) {
          setLocked(true);
          setMessage(
            "Too many incorrect codes. Request a new one to continue.",
          );
          return;
        }
        if (result.reason === "expired") {
          setMessage("That code expired. Request a new one.");
          setLocked(true);
          return;
        }
        setMessage("That code didn't match. Double-check and try again.");
      });
    },
    [
      locked,
      normalizedIdentifier,
      pending,
      redirect,
      tab,
      verifyFailures,
    ],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2" role="tablist" aria-label="Send method">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "email"}
          onClick={() => resetTo("email")}
          disabled={pending}
          className={
            "flex-1 rounded-lg border-2 px-4 py-2 text-sm font-semibold " +
            (tab === "email"
              ? "border-brand bg-brand/5 text-brand"
              : "border-transparent text-ink-body hover:bg-surface-tint")
          }
        >
          Email me a code
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "phone"}
          onClick={() => resetTo("phone")}
          disabled={pending}
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

      {stage === "input" ? (
        <form onSubmit={onSend} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-heading">
            {tab === "email" ? "Email address" : "Phone number"}
            <input
              type={tab === "email" ? "email" : "tel"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete={tab === "email" ? "email" : "tel"}
              inputMode={tab === "email" ? "email" : "tel"}
              placeholder={tab === "email" ? "you@example.com" : "(555) 555-5555"}
              className="h-12 rounded-lg border-2 border-surface-edge px-4 text-base focus:border-brand focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-12 rounded-lg bg-brand px-6 font-semibold text-brand-foreground disabled:opacity-50"
          >
            {pending ? "Sending…" : tab === "email" ? "Send code" : "Send code"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-body">
            Enter the 6-digit code we just sent.
          </p>
          <OtpCodeInput
            onComplete={onCodeComplete}
            disabled={pending || locked}
          />
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => resetTo(tab)}
              className="text-ink-subtle underline hover:text-ink-heading"
              disabled={pending}
            >
              Use a different {tab === "email" ? "email" : "phone"}
            </button>
            <button
              type="button"
              onClick={() => {
                // Resend = same server action, counted against rate limit.
                startTransition(async () => {
                  setMessage(null);
                  const result = await requestOtp(
                    tab === "email"
                      ? {
                          method: "email",
                          identifier: normalizedIdentifier,
                        }
                      : {
                          method: "phone",
                          identifier: normalizedIdentifier,
                        },
                  );
                  if (result.ok) {
                    setStatus("ok");
                    setLocked(false);
                    setVerifyFailures(0);
                    setMessage("Sent a fresh code.");
                  } else if (result.reason === "rate_limited") {
                    const minutes = Math.max(
                      1,
                      Math.ceil(result.retryAfterMs / 60_000),
                    );
                    setStatus("error");
                    setMessage(
                      `Too many send attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
                    );
                  } else {
                    setStatus("error");
                    setMessage("Couldn't resend — try again in a moment.");
                  }
                });
              }}
              disabled={pending}
              className="text-brand underline hover:brightness-110 disabled:opacity-50"
            >
              Didn&apos;t get it? Re-send
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}

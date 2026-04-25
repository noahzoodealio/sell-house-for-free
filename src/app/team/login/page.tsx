import type { Metadata } from "next";

import { LoginForm } from "@/components/team/login/LoginForm";

export const metadata: Metadata = {
  title: "Team sign in — Sell Your House Free",
  robots: { index: false, follow: false },
};

type Reason = "expired" | "inactive" | "error";

function copyForError(reason: Reason): string | null {
  if (reason === "inactive") {
    return "Your team account is not active. If this is unexpected, contact an admin to be re-enabled.";
  }
  if (reason === "expired") {
    return "That sign-in link expired or was already used. Send yourself a fresh one below.";
  }
  return null;
}

export default async function TeamLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const raw = params?.error;
  const errorReason: Reason | null =
    raw === "inactive" || raw === "expired" ? raw : null;
  const errorCopy = errorReason ? copyForError(errorReason) : null;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold text-ink-heading">Team sign in</h1>
      <p className="mt-3 text-ink-body">
        Enter your work email and we&apos;ll send you a one-time sign-in link.
        The link expires in 24 hours.
      </p>
      {errorCopy ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorCopy}
        </p>
      ) : null}
      <div className="mt-8">
        <LoginForm />
      </div>
      <p className="mt-10 text-sm text-ink-subtle">
        For team members only. If you&apos;re a seller, sign in at{" "}
        <a href="/portal/login" className="underline">
          /portal/login
        </a>
        .
      </p>
    </main>
  );
}

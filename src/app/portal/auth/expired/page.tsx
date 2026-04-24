import type { Metadata } from "next";

import { ResendForm } from "./ResendForm";

export const metadata: Metadata = {
  title: "Your sign-in link — Sell Your House Free",
  robots: { index: false, follow: false },
};

type Reason = "expired" | "used" | "error";

function copyFor(reason: Reason): { heading: string; body: string } {
  if (reason === "expired") {
    return {
      heading: "Your sign-in link expired",
      body: "Magic links expire after 24 hours for security. Enter your email or phone below and we'll send you a fresh one.",
    };
  }
  if (reason === "used") {
    return {
      heading: "That sign-in link was already used",
      body: "Each sign-in link works once. Enter your email or phone below and we'll send you a new one.",
    };
  }
  return {
    heading: "We couldn't sign you in",
    body: "Something went wrong completing your sign-in. Enter your email or phone below and we'll send you a fresh link.",
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const raw = params?.reason;
  const reason: Reason =
    raw === "expired" || raw === "used" ? raw : "error";
  const { heading, body } = copyFor(reason);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold text-ink-heading">{heading}</h1>
      <p className="mt-3 text-ink-body">{body}</p>
      <div className="mt-8">
        <ResendForm />
      </div>
      <p className="mt-10 text-sm text-ink-subtle">
        Sell Your House Free is a technology platform, not a broker.
      </p>
    </main>
  );
}

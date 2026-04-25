import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign-in link — Sell Your House Free",
  robots: { index: false, follow: false },
};

type Reason = "expired" | "used" | "error";

function copyFor(reason: Reason): { heading: string; body: string } {
  if (reason === "expired") {
    return {
      heading: "Your sign-in link expired",
      body: "Magic links expire after 24 hours. Head back to the team sign-in page and we'll send a fresh one.",
    };
  }
  if (reason === "used") {
    return {
      heading: "That sign-in link was already used",
      body: "Each link works once. Send yourself a new one from the team sign-in page.",
    };
  }
  return {
    heading: "We couldn't sign you in",
    body: "Something went wrong completing sign-in. Try again from the team sign-in page.",
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
      <Link
        href="/team/login"
        className="mt-8 inline-flex w-fit items-center rounded-lg bg-brand-primary px-4 py-3 text-base font-semibold text-white"
      >
        Back to team sign in
      </Link>
    </main>
  );
}

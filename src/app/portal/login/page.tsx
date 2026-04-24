import type { Metadata } from "next";

import { LoginForm } from "@/components/portal/login/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Sell Your House Free",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirect =
    typeof params?.redirect === "string" ? params.redirect : null;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold text-ink-heading">
        Sign in to your portal
      </h1>
      <p className="mt-3 text-ink-body">
        No password needed. We&apos;ll send you a 6-digit code.
      </p>
      <div className="mt-8">
        <LoginForm redirect={redirect} />
      </div>
      <p className="mt-10 text-sm text-ink-subtle">
        Sell Your House Free is a technology platform, not a broker.
      </p>
    </main>
  );
}

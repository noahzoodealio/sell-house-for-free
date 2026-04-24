import type { Metadata } from "next";

import { PortalApp } from "@/components/portal/portal-app";
import { snapshotToPortalData } from "@/lib/portal/adapter";
import { getPortalSnapshot } from "@/lib/portal/queries";
import { buildMetadata } from "@/lib/seo";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

export const metadata: Metadata = buildMetadata({
  title: "Your portal",
  description: "Manage your sale — offers, listing, photos, team, and docs.",
  path: "/portal",
  noindex: true,
});

async function loadInitialData() {
  try {
    const supabase = await createServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { hasSession: false, data: null as null | ReturnType<typeof snapshotToPortalData> };
    const snapshot = await getPortalSnapshot(supabase);
    return { hasSession: true, data: snapshotToPortalData(snapshot) };
  } catch {
    return { hasSession: false, data: null };
  }
}

export default async function Page() {
  const { hasSession, data } = await loadInitialData();

  if (!hasSession) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
        <h1 className="text-3xl font-semibold text-ink-heading">
          Sign in to continue
        </h1>
        <p className="mt-3 text-ink-body">
          Your portal is private. Use the link in your confirmation email —
          or request a new one if it expired — to sign in and see your
          offers, team, and documents.
        </p>
        <a
          href="/portal/login"
          className="mt-6 inline-flex h-12 w-fit items-center rounded-lg bg-brand px-6 font-semibold text-brand-foreground"
        >
          Sign in
        </a>
        <p className="mt-10 text-sm text-ink-subtle">
          Sell Your House Free is a technology platform, not a broker.
        </p>
      </main>
    );
  }

  return <PortalApp initialData={data ?? undefined} />;
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkQueueLive } from "@/components/team/queue/WorkQueueLive";
import { WorkQueueTable } from "@/components/team/queue/WorkQueueTable";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import { loadQueue, type QueueTab, type QueueView } from "@/lib/team/queue";

export const dynamic = "force-dynamic";

function parseTab(raw: string | undefined): QueueTab {
  return raw === "closed" ? "closed" : "open";
}

function parseView(raw: string | undefined, isAdmin: boolean): QueueView {
  if (!isAdmin) return "mine";
  return raw === "all" ? "all" : "mine";
}

export default async function TeamHomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const params = await searchParams;
  const tab = parseTab(params?.tab);

  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/team/login");
  }

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member) {
    redirect("/team/login?error=inactive");
  }

  if (!member.active) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-ink-heading">
          Account inactive
        </h1>
        <p className="mt-3 text-ink-body">
          Your team account is currently inactive. Reach out to an admin to
          get reactivated.
        </p>
        <Link
          href="/team/login"
          className="mt-8 inline-block text-sm text-ink-subtle underline"
        >
          Back to sign-in
        </Link>
      </main>
    );
  }

  const view = parseView(params?.view, member.isAdmin);

  const { rows, unreadTotal } = await loadQueue({
    authUserId: user.id,
    teamMemberId: member.id,
    tab,
    view,
    isAdmin: member.isAdmin,
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <WorkQueueLive unreadTotal={unreadTotal} />
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-heading">
            Work queue
          </h1>
          <p className="text-sm text-ink-subtle">
            {rows.length === 0
              ? "Nothing to triage right now."
              : `${rows.length} ${tab === "open" ? "open" : "closed"} submission${rows.length === 1 ? "" : "s"}.`}
            {unreadTotal > 0 ? ` ${unreadTotal} unread.` : ""}
          </p>
        </div>
        <nav aria-label="Queue filters" className="flex flex-wrap items-center gap-2">
          <Link
            href={`/team?tab=open${view === "all" ? "&view=all" : ""}`}
            className={`rounded-md px-3 py-1 text-sm ${
              tab === "open"
                ? "bg-brand-primary text-white"
                : "bg-ink-subtle/10 text-ink-heading"
            }`}
          >
            Open
          </Link>
          <Link
            href={`/team?tab=closed${view === "all" ? "&view=all" : ""}`}
            className={`rounded-md px-3 py-1 text-sm ${
              tab === "closed"
                ? "bg-brand-primary text-white"
                : "bg-ink-subtle/10 text-ink-heading"
            }`}
          >
            Closed
          </Link>
          {member.isAdmin ? (
            <>
              <span className="mx-2 text-xs text-ink-subtle">|</span>
              <Link
                href={`/team?tab=${tab}`}
                className={`rounded-md px-3 py-1 text-sm ${
                  view === "mine"
                    ? "bg-brand-primary text-white"
                    : "bg-ink-subtle/10 text-ink-heading"
                }`}
              >
                Mine
              </Link>
              <Link
                href={`/team?tab=${tab}&view=all`}
                className={`rounded-md px-3 py-1 text-sm ${
                  view === "all"
                    ? "bg-brand-primary text-white"
                    : "bg-ink-subtle/10 text-ink-heading"
                }`}
              >
                All (admin)
              </Link>
            </>
          ) : null}
        </nav>
      </header>

      <div className="mt-6">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-border bg-white px-6 py-10 text-center">
            <p className="text-base font-medium text-ink-heading">
              {tab === "open"
                ? "You're clear — the open queue is empty."
                : "No closed submissions yet."}
            </p>
            <p className="mt-1 text-sm text-ink-subtle">
              {tab === "open"
                ? "New seller submissions assigned to you will surface here."
                : "Submissions you mark closed_won or closed_lost will live here."}
            </p>
          </div>
        ) : (
          <WorkQueueTable rows={rows} showAssignee={view === "all"} />
        )}
      </div>
      <p className="mt-6 text-xs text-ink-subtle">
        Tip: focus the table and use <kbd>j</kbd>/<kbd>k</kbd> to move between
        rows, <kbd>Enter</kbd> to open. Auto-refreshes every minute.
      </p>
    </main>
  );
}

import { notFound, redirect } from "next/navigation";

import { ActionRail } from "@/components/team/submission/ActionRail";
import { ActivityTimeline } from "@/components/team/submission/ActivityTimeline";
import { NoteComposer } from "@/components/team/submission/NoteComposer";
import { OfferOverrideRow } from "@/components/team/submission/OfferOverrideRow";
import { PropertySnapshot } from "@/components/team/submission/PropertySnapshot";
import { SellerPathCard } from "@/components/team/submission/SellerPathCard";
import { StatusControls } from "@/components/team/submission/StatusControls";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import {
  loadActivityTimeline,
  loadSubmissionDetail,
  loadSubmissionOffers,
  STATUS_LABELS,
} from "@/lib/team/submissions";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/team/login?redirect=${encodeURIComponent(`/team/submissions/${id}`)}`,
    );
  }

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active) {
    redirect("/team/login?error=inactive");
  }

  const submission = await loadSubmissionDetail(id);
  if (!submission) notFound();

  const isAssignee = submission.pmUserId === member.id;
  if (!isAssignee && !member.isAdmin) {
    redirect("/team");
  }

  const [offers, timeline] = await Promise.all([
    loadSubmissionOffers(submission.id),
    loadActivityTimeline(submission.id),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-heading">
            {submission.sellerFirstName} {submission.sellerLastName}
          </h1>
          <p className="text-sm text-ink-subtle">
            {submission.addressLine1}, {submission.city}, {submission.state}{" "}
            {submission.zip}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {submission.sellerEmail}
            {submission.sellerPhone ? ` · ${submission.sellerPhone}` : ""}
          </p>
        </div>
        <div className="text-right">
          <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
            {STATUS_LABELS[submission.status]}
          </span>
          <p className="mt-1 text-xs text-ink-subtle">
            Assigned {formatRelative(submission.assignedAt)}
            {submission.pmFirstName ? ` to ${submission.pmFirstName} ${submission.pmLastName ?? ""}` : ""}
          </p>
          <p className="text-xs text-ink-subtle">
            Ref {submission.referralCode}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <PropertySnapshot submission={submission} />
          <SellerPathCard submission={submission} />

          <section className="rounded-lg border border-ink-border bg-white p-4">
            <h2 className="text-sm font-semibold text-ink-heading">
              Offervana results
            </h2>
            {offers.length === 0 ? (
              <p className="mt-2 text-sm text-ink-subtle">
                No offers returned for this submission yet.
              </p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-border text-left text-xs text-ink-subtle">
                    <th className="py-2 pr-4">Path</th>
                    <th className="py-2 pr-4">Range</th>
                    <th className="py-2 pr-4">Team note</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <OfferOverrideRow key={offer.id} offer={offer} />
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="rounded-lg border border-ink-border bg-white p-4">
            <h2 className="text-sm font-semibold text-ink-heading">Status</h2>
            <p className="mt-1 text-xs text-ink-subtle">
              Currently <strong>{STATUS_LABELS[submission.status]}</strong>.
              Status changes write an audit row.
            </p>
            <div className="mt-3">
              <StatusControls
                submissionRowId={submission.id}
                currentStatus={submission.status}
              />
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <ActionRail submissionRowId={submission.id} />
          <section className="rounded-lg border border-ink-border bg-white p-4">
            <h2 className="text-sm font-semibold text-ink-heading">
              Internal note
            </h2>
            <p className="mt-1 text-xs text-ink-subtle">
              Visible to team only. Logs to the activity timeline.
            </p>
            <div className="mt-3">
              <NoteComposer submissionRowId={submission.id} />
            </div>
          </section>
        </aside>
      </div>

      <section className="mt-8 rounded-lg border border-ink-border bg-white p-4">
        <h2 className="text-sm font-semibold text-ink-heading">Activity</h2>
        <p className="mt-1 text-xs text-ink-subtle">
          Most recent first. Includes messages, document operations, status
          changes, notes, and assignment events.
        </p>
        <div className="mt-3">
          <ActivityTimeline events={timeline} />
        </div>
      </section>
    </main>
  );
}

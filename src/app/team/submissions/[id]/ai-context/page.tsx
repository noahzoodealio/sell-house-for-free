import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionCard } from "@/components/team/ai-context/SessionCard";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  loadAiArtifacts,
  loadAiContextForSubmission,
  recordAiContextViews,
} from "@/lib/team/ai-context";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";

export const dynamic = "force-dynamic";

export default async function AiContextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: submissionRowId } = await params;

  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/team/login?redirect=${encodeURIComponent(`/team/submissions/${submissionRowId}/ai-context`)}`,
    );
  }

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active) {
    redirect("/team/login?error=inactive");
  }

  const admin = getSupabaseAdmin();
  const { data: subRow } = await admin
    .from("submissions")
    .select(
      "id, submission_id, pm_user_id, address_line1, city, state",
    )
    .eq("id", submissionRowId)
    .maybeSingle();
  if (!subRow) notFound();
  const submission = subRow as {
    id: string;
    submission_id: string;
    pm_user_id: string | null;
    address_line1: string;
    city: string;
    state: string;
  };

  const isAssignee = submission.pm_user_id === member.id;
  if (!isAssignee && !member.isAdmin) notFound();

  const sessions = await loadAiContextForSubmission(submission.submission_id);
  const sessionIds = sessions.map((s) => s.session.id);
  const artifacts = await loadAiArtifacts(sessionIds);

  await recordAiContextViews({
    submissionRowId: submission.id,
    teamUserId: user.id,
    sessionIds,
  });

  const artifactsBySession = new Map<string, typeof artifacts>();
  for (const artifact of artifacts) {
    const list = artifactsBySession.get(artifact.sessionId) ?? [];
    list.push(artifact);
    artifactsBySession.set(artifact.sessionId, list);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/team/submissions/${submission.id}`}
        className="text-sm text-ink-subtle underline"
      >
        ← Back to submission
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink-heading">
        AI context — {submission.address_line1}, {submission.city},{" "}
        {submission.state}
      </h1>

      <aside
        role="note"
        aria-label="AI disclaimer"
        className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
      >
        <p>
          <strong>This AI agent is a tech-platform feature</strong>, not legal,
          financial, or fiduciary advice. Sell Free is a technology platform;
          JK Realty is a third-party licensed broker. AI outputs are not
          licensed professional opinions — when in doubt, consult a licensed
          professional.
        </p>
      </aside>

      <section className="mt-6 flex flex-col gap-4">
        {sessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-border bg-white px-6 py-10 text-center text-sm text-ink-subtle">
            This seller hasn&apos;t used the AI agent yet. They can start a
            session at <code>/portal/chat</code> on the seller portal.
          </p>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session.session.id}
              session={session}
              artifacts={artifactsBySession.get(session.session.id) ?? []}
            />
          ))
        )}
      </section>
    </main>
  );
}

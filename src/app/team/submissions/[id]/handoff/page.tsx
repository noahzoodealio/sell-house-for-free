import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { HandoffForm } from "@/components/team/handoff/HandoffForm";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import { listHandoffCandidates } from "@/lib/team/handoff";

export const dynamic = "force-dynamic";

export default async function HandoffPage({
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
      `/team/login?redirect=${encodeURIComponent(`/team/submissions/${submissionRowId}/handoff`)}`,
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
  if (!isAssignee && !member.isAdmin) {
    redirect("/team");
  }

  const candidates = await listHandoffCandidates(member.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href={`/team/submissions/${submission.id}`}
        className="text-sm text-ink-subtle underline"
      >
        ← Back to submission
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink-heading">
        Hand off submission
      </h1>
      <p className="mt-1 text-sm text-ink-subtle">
        {submission.address_line1}, {submission.city}, {submission.state} ·{" "}
        Reference {submission.submission_id}
      </p>
      <p className="mt-4 text-sm text-ink-body">
        Reassigning resets the SLA clock for the new team member and writes
        an audit row in <code>assignment_events</code>. Both team members
        receive an email; the seller stays silent unless you opt to send a
        re-intro.
      </p>
      <div className="mt-6">
        <HandoffForm
          submissionRowId={submission.id}
          candidates={candidates}
          isAdmin={member.isAdmin}
        />
      </div>
    </main>
  );
}

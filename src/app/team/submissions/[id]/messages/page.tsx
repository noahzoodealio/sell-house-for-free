import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { Composer } from "@/components/team/messages/Composer";
import { Thread } from "@/components/team/messages/Thread";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import { listThread, markThreadRead } from "@/lib/team/messages";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
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
      `/team/login?redirect=${encodeURIComponent(`/team/submissions/${submissionRowId}/messages`)}`,
    );
  }

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active) {
    redirect("/team/login?error=inactive");
  }

  const admin = getSupabaseAdmin();
  const { data: submissionRow } = await admin
    .from("submissions")
    .select(
      "id, submission_id, pm_user_id, seller_id, address_line1, city, state",
    )
    .eq("id", submissionRowId)
    .maybeSingle();

  if (!submissionRow) {
    notFound();
  }
  const submission = submissionRow as {
    id: string;
    submission_id: string;
    pm_user_id: string | null;
    seller_id: string;
    address_line1: string;
    city: string;
    state: string;
  };

  const isAssignee = submission.pm_user_id === member.id;
  if (!isAssignee && !member.isAdmin) {
    notFound();
  }

  await markThreadRead(submission.id);
  const messages = await listThread(submission.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/team/submissions/${submission.id}`}
        className="text-sm text-ink-subtle underline"
      >
        ← Back to submission
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink-heading">
        Messages — {submission.address_line1}, {submission.city},{" "}
        {submission.state}
      </h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Reference {submission.submission_id}
      </p>
      <section className="mt-6">
        <Thread messages={messages} />
      </section>
      <section className="mt-8">
        <Composer submissionRowId={submission.id} />
      </section>
    </main>
  );
}

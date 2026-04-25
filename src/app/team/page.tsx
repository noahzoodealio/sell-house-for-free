import { redirect } from "next/navigation";

import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";

export const dynamic = "force-dynamic";

// Stub page. E11-S3 (work-queue home) replaces this with the real queue
// view. For now it confirms the session round-trips correctly and bounces
// inactive / non-roster sessions back to /team/login. No analytics on
// /team/* per docs/analytics-policy.md.
export default async function TeamHomePage() {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/team/login");
  }

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active) {
    redirect("/team/login?error=inactive");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-ink-heading">Team portal</h1>
      <p className="mt-3 text-ink-body">
        Signed in as{" "}
        <span className="font-medium text-ink-heading">{member.email}</span>.
      </p>
      <p className="mt-6 text-ink-body">
        The work queue lands in the next story (E11-S3). For now, this
        confirms team auth is wired end-to-end.
      </p>
    </main>
  );
}

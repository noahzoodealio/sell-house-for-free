import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AddMemberForm } from "@/components/team/roster/AddMemberForm";
import { RosterRowControls } from "@/components/team/roster/RosterRowControls";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import { listRoster } from "@/lib/team/roster";

export const dynamic = "force-dynamic";

function relative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function AdminRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string }>;
}) {
  const params = await searchParams;
  const includeInactive = params?.inactive === "1";

  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/team/login?redirect=${encodeURIComponent("/team/admin/roster")}`,
    );
  }

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active) {
    redirect("/team/login?error=inactive");
  }
  if (!member.isAdmin) {
    notFound();
  }

  const rows = await listRoster({ includeInactive });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/team" className="text-sm text-ink-subtle underline">
        ← Back to queue
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink-heading">
        Team roster
      </h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Admin-only. Add new members, edit role badges + coverage + capacity,
        deactivate departing members. Every change writes a
        <code> team_activity_events </code> audit row.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AddMemberForm />
        <Link
          href={includeInactive ? "/team/admin/roster" : "/team/admin/roster?inactive=1"}
          className="text-xs text-ink-subtle underline"
        >
          {includeInactive ? "Hide inactive" : "Show inactive"}
        </Link>
      </div>

      <ul className="mt-6 flex flex-col gap-4">
        {rows.length === 0 ? (
          <li className="rounded-lg border border-dashed border-ink-border bg-white px-4 py-6 text-center text-sm text-ink-subtle">
            No team members.{" "}
            {includeInactive ? null : "Try Show inactive."}
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className={`flex flex-col gap-3 rounded-lg border bg-white p-4 ${
                row.active
                  ? "border-ink-border"
                  : "border-ink-border opacity-70"
              }`}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink-heading">
                    {row.firstName} {row.lastName}
                    {row.active ? null : (
                      <span className="ml-2 text-xs text-ink-subtle">
                        (inactive)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-subtle">{row.email}</p>
                  {row.phone ? (
                    <p className="text-xs text-ink-subtle">{row.phone}</p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-ink-subtle">
                  <p>Last login {relative(row.lastLoginAt)}</p>
                  <p>Joined {relative(row.createdAt)}</p>
                </div>
              </header>
              <RosterRowControls row={row} />
            </li>
          ))
        )}
      </ul>
    </main>
  );
}

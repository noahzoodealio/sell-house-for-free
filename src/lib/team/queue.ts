import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

import { computeSlaBand, type SlaBand } from "./sla";
import type { SubmissionStatus } from "./submissions";

export type QueueTab = "open" | "closed";
export type QueueView = "mine" | "all";

const OPEN_STATUSES: SubmissionStatus[] = ["assigned", "active"];
const CLOSED_STATUSES: SubmissionStatus[] = ["closed_won", "closed_lost"];

export interface QueueRow {
  submissionRowId: string;
  submissionId: string;
  status: SubmissionStatus;
  sellerFirstName: string;
  sellerFullName: string;
  addressLine1: string;
  city: string;
  state: string;
  pillarHint: string | null;
  sellerPaths: string[];
  assignedAt: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastTouchedAt: string | null;
  assigneeName: string | null;
  slaBand: SlaBand;
}

export interface LoadQueueArgs {
  authUserId: string;
  teamMemberId: string;
  tab: QueueTab;
  view: QueueView;
  isAdmin: boolean;
  limit?: number;
}

export interface QueueResult {
  rows: QueueRow[];
  unreadTotal: number;
}

export async function loadQueue(args: LoadQueueArgs): Promise<QueueResult> {
  const supabase = getSupabaseAdmin();
  const limit = args.limit ?? 100;
  const statuses = args.tab === "closed" ? CLOSED_STATUSES : OPEN_STATUSES;

  let submissionQuery = supabase
    .from("submissions")
    .select(
      "id, submission_id, status, pm_user_id, seller_id, address_line1, city, state, pillar_hint, seller_paths, assigned_at",
    )
    .in("status", statuses)
    .order("assigned_at", { ascending: true })
    .limit(limit);

  if (args.view === "mine" || !args.isAdmin) {
    submissionQuery = submissionQuery.eq("pm_user_id", args.teamMemberId);
  }

  const { data: subs, error } = await submissionQuery;
  if (error || !subs) return { rows: [], unreadTotal: 0 };

  const submissionRows = subs.map((row) => row as Record<string, unknown>);
  if (submissionRows.length === 0) {
    return { rows: [], unreadTotal: 0 };
  }

  const submissionIds = submissionRows.map((r) => r.id as string);
  const sellerIds = Array.from(
    new Set(submissionRows.map((r) => r.seller_id as string)),
  );
  const teamMemberIds = Array.from(
    new Set(
      submissionRows
        .map((r) => r.pm_user_id as string | null)
        .filter((v): v is string => !!v),
    ),
  );

  const [
    profilesRes,
    teamMembersRes,
    unreadCountsRes,
    lastMessageRes,
    lastTouchedRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", sellerIds),
    teamMemberIds.length
      ? supabase
          .from("team_members")
          .select("id, first_name, last_name")
          .in("id", teamMemberIds)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("messages")
      .select("submission_id")
      .in("submission_id", submissionIds)
      .eq("direction", "inbound")
      .is("read_at", null),
    supabase
      .from("messages")
      .select("submission_id, created_at")
      .in("submission_id", submissionIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("team_activity_events")
      .select("submission_id, created_at")
      .in("submission_id", submissionIds)
      .eq("team_user_id", args.authUserId)
      .order("created_at", { ascending: false }),
  ]);

  const sellerNameById = new Map<string, string>();
  for (const p of (profilesRes.data ?? []) as Array<{
    id: string;
    full_name: string;
  }>) {
    sellerNameById.set(p.id, p.full_name);
  }

  const teamMemberNameById = new Map<string, string>();
  for (const m of (teamMembersRes.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>) {
    teamMemberNameById.set(m.id, `${m.first_name} ${m.last_name}`.trim());
  }

  const unreadById = new Map<string, number>();
  for (const row of (unreadCountsRes.data ?? []) as Array<{
    submission_id: string;
  }>) {
    unreadById.set(row.submission_id, (unreadById.get(row.submission_id) ?? 0) + 1);
  }

  const lastMessageById = new Map<string, string>();
  for (const row of (lastMessageRes.data ?? []) as Array<{
    submission_id: string;
    created_at: string;
  }>) {
    if (!lastMessageById.has(row.submission_id)) {
      lastMessageById.set(row.submission_id, row.created_at);
    }
  }

  const lastTouchedById = new Map<string, string>();
  for (const row of (lastTouchedRes.data ?? []) as Array<{
    submission_id: string;
    created_at: string;
  }>) {
    if (!lastTouchedById.has(row.submission_id)) {
      lastTouchedById.set(row.submission_id, row.created_at);
    }
  }

  const rows: QueueRow[] = submissionRows.map((row) => {
    const sellerId = row.seller_id as string;
    const fullName = sellerNameById.get(sellerId) ?? "";
    const split = fullName.split(/\s+/);
    const submissionId = row.id as string;
    const unread = unreadById.get(submissionId) ?? 0;
    const assignedAt = (row.assigned_at as string | null) ?? null;
    const lastTouched = lastTouchedById.get(submissionId) ?? null;
    const sla = computeSlaBand({
      assignedAt,
      unreadCount: unread,
      lastTouchedAt: lastTouched,
    });
    return {
      submissionRowId: submissionId,
      submissionId: row.submission_id as string,
      status: row.status as SubmissionStatus,
      sellerFirstName: split[0] ?? fullName,
      sellerFullName: fullName,
      addressLine1: row.address_line1 as string,
      city: row.city as string,
      state: row.state as string,
      pillarHint: (row.pillar_hint as string | null) ?? null,
      sellerPaths:
        ((row.seller_paths as string[] | null) ?? []) as string[],
      assignedAt,
      unreadCount: unread,
      lastMessageAt: lastMessageById.get(submissionId) ?? null,
      lastTouchedAt: lastTouched,
      assigneeName:
        teamMemberNameById.get((row.pm_user_id as string) ?? "") ?? null,
      slaBand: sla,
    };
  });

  // Re-sort: unread-first, then oldest assigned_at.
  rows.sort((a, b) => {
    if ((a.unreadCount > 0) !== (b.unreadCount > 0)) {
      return a.unreadCount > 0 ? -1 : 1;
    }
    const aAt = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
    const bAt = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
    return aAt - bAt;
  });

  const unreadTotal = rows.reduce((acc, row) => acc + row.unreadCount, 0);
  return { rows, unreadTotal };
}

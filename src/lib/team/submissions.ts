import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  labelSellerPath,
  STATUS_ADVANCE_MAP,
  STATUS_LABELS,
  type ActivityEvent,
  type SubmissionDetail,
  type SubmissionOffer,
  type SubmissionStatus,
} from "./submissions-shared";

export {
  labelSellerPath,
  STATUS_ADVANCE_MAP,
  STATUS_LABELS,
  type ActivityEvent,
  type SubmissionDetail,
  type SubmissionOffer,
  type SubmissionStatus,
};

export async function loadSubmissionDetail(
  submissionRowId: string,
): Promise<SubmissionDetail | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .select(
      "id, submission_id, referral_code, status, pm_user_id, seller_id, address_line1, address_line2, city, state, zip, beds, baths, sqft, year_built, seller_paths, pillar_hint, timeline, assigned_at, created_at",
    )
    .eq("id", submissionRowId)
    .maybeSingle();
  if (error || !data) return null;
  const sub = data as Record<string, unknown>;

  const sellerId = sub.seller_id as string;
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", sellerId)
    .maybeSingle();
  const profile = profileRow as
    | { full_name: string; email: string; phone: string | null }
    | null;
  const fullName = profile?.full_name ?? "";
  const split = fullName.split(/\s+/);
  const firstName = split[0] ?? "";
  const lastName = split.slice(1).join(" ");

  let pmFirst: string | null = null;
  let pmLast: string | null = null;
  if (sub.pm_user_id) {
    const { data: tmRow } = await supabase
      .from("team_members")
      .select("first_name, last_name")
      .eq("id", sub.pm_user_id as string)
      .maybeSingle();
    if (tmRow) {
      const tm = tmRow as { first_name: string; last_name: string };
      pmFirst = tm.first_name;
      pmLast = tm.last_name;
    }
  }

  return {
    id: sub.id as string,
    submissionId: sub.submission_id as string,
    referralCode: sub.referral_code as string,
    status: sub.status as SubmissionStatus,
    pmUserId: (sub.pm_user_id as string | null) ?? null,
    pmFirstName: pmFirst,
    pmLastName: pmLast,
    sellerId,
    sellerFirstName: firstName,
    sellerLastName: lastName,
    sellerEmail: profile?.email ?? "",
    sellerPhone: profile?.phone ?? null,
    addressLine1: sub.address_line1 as string,
    addressLine2: (sub.address_line2 as string | null) ?? null,
    city: sub.city as string,
    state: sub.state as string,
    zip: sub.zip as string,
    beds: (sub.beds as number | null) ?? null,
    baths: (sub.baths as number | null) ?? null,
    sqft: (sub.sqft as number | null) ?? null,
    yearBuilt: (sub.year_built as number | null) ?? null,
    sellerPaths: ((sub.seller_paths as string[] | null) ?? []) as string[],
    pillarHint: (sub.pillar_hint as string | null) ?? null,
    timeline: (sub.timeline as string | null) ?? null,
    assignedAt: (sub.assigned_at as string | null) ?? null,
    createdAt: sub.created_at as string,
  };
}

export async function loadSubmissionOffers(
  submissionRowId: string,
): Promise<SubmissionOffer[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submission_offers")
    .select("id, path, low_cents, high_cents, team_note, created_at")
    .eq("submission_id", submissionRowId)
    .order("path", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => {
    const r = row as {
      id: string;
      path: string;
      low_cents: number | null;
      high_cents: number | null;
      team_note: string | null;
      created_at: string;
    };
    return {
      id: r.id,
      path: r.path,
      lowCents: r.low_cents,
      highCents: r.high_cents,
      teamNote: r.team_note,
      createdAt: r.created_at,
    };
  });
}

export async function loadActivityTimeline(
  submissionRowId: string,
  limit = 50,
): Promise<ActivityEvent[]> {
  const supabase = getSupabaseAdmin();

  const [activityRes, messagesRes, assignmentsRes] = await Promise.all([
    supabase
      .from("team_activity_events")
      .select("id, team_user_id, event_type, event_data, created_at")
      .eq("submission_id", submissionRowId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("messages")
      .select(
        "id, direction, sender_user_id, sender_email, subject, created_at",
      )
      .eq("submission_id", submissionRowId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("assignment_events")
      .select("id, team_member_id, kind, reason, created_at")
      .eq("submission_id", submissionRowId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const events: ActivityEvent[] = [];

  for (const row of activityRes.data ?? []) {
    const r = row as {
      id: number;
      team_user_id: string;
      event_type: string;
      event_data: Record<string, unknown>;
      created_at: string;
    };
    events.push({
      source: "team_activity",
      id: `team_activity:${r.id}`,
      createdAt: r.created_at,
      actorAuthUserId: r.team_user_id,
      actorName: null,
      eventType: r.event_type,
      summary: summarizeTeamActivity(r.event_type, r.event_data),
      data: r.event_data,
    });
  }

  for (const row of messagesRes.data ?? []) {
    const r = row as {
      id: string;
      direction: "inbound" | "outbound";
      sender_user_id: string | null;
      sender_email: string | null;
      subject: string | null;
      created_at: string;
    };
    events.push({
      source: "messages",
      id: `messages:${r.id}`,
      createdAt: r.created_at,
      actorAuthUserId: r.sender_user_id,
      actorName: r.sender_email,
      eventType: r.direction === "inbound" ? "message_received" : "message_sent",
      summary:
        r.direction === "inbound"
          ? `Inbound: ${r.subject ?? "(no subject)"}`
          : `Outbound: ${r.subject ?? "(no subject)"}`,
      data: { direction: r.direction, subject: r.subject },
    });
  }

  for (const row of assignmentsRes.data ?? []) {
    const r = row as {
      id: string;
      team_member_id: string | null;
      kind: string;
      reason: string | null;
      created_at: string;
    };
    events.push({
      source: "assignment_events",
      id: `assignment_events:${r.id}`,
      createdAt: r.created_at,
      actorAuthUserId: null,
      actorName: null,
      eventType: r.kind,
      summary: `Assignment ${r.kind}${r.reason ? ` (${r.reason})` : ""}`,
      data: { kind: r.kind, reason: r.reason },
    });
  }

  events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // Resolve actor names — single batch lookup against profiles + team_members.
  const actorIds = Array.from(
    new Set(
      events
        .map((e) => e.actorAuthUserId)
        .filter((v): v is string => !!v),
    ),
  );
  if (actorIds.length > 0) {
    const nameMap = new Map<string, string>();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      const row = p as { id: string; full_name: string };
      nameMap.set(row.id, row.full_name);
    }
    const { data: members } = await supabase
      .from("team_members")
      .select("auth_user_id, first_name, last_name")
      .in("auth_user_id", actorIds);
    for (const m of members ?? []) {
      const row = m as {
        auth_user_id: string | null;
        first_name: string;
        last_name: string;
      };
      if (row.auth_user_id) {
        nameMap.set(
          row.auth_user_id,
          `${row.first_name} ${row.last_name}`.trim(),
        );
      }
    }
    for (const event of events) {
      if (event.actorAuthUserId && !event.actorName) {
        event.actorName = nameMap.get(event.actorAuthUserId) ?? null;
      }
    }
  }

  return events.slice(0, limit);
}

function summarizeTeamActivity(
  eventType: string,
  data: Record<string, unknown>,
): string {
  switch (eventType) {
    case "email_sent":
      return `Email sent — ${(data.subject as string | undefined) ?? "(no subject)"}`;
    case "note_added":
      return `Note added`;
    case "handoff_initiated":
      return `Handoff initiated`;
    case "handoff_completed":
      return `Handoff completed`;
    case "ai_context_viewed":
      return `AI context viewed`;
    case "document_uploaded":
      return `Document uploaded — ${(data.filename as string | undefined) ?? ""}`;
    case "document_downloaded":
      return `Document downloaded — ${(data.filename as string | undefined) ?? ""}`;
    case "document_deleted":
      return `Document deleted — ${(data.filename as string | undefined) ?? ""}`;
    case "status_changed":
      return `Status changed${data.from ? ` (${data.from} → ${data.to})` : ""}`;
    case "login":
      return `Logged in`;
    case "login_rejected_inactive":
      return `Login rejected (inactive)`;
    default:
      return eventType;
  }
}

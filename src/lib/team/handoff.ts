import "server-only";

import { render } from "@react-email/render";
import { Resend } from "resend";

import {
  HandoffIncoming,
  HandoffOutgoing,
} from "@/lib/email/templates/handoff-emails";
import { captureException } from "@/lib/pm-service/observability";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const HANDOFF_REASONS = [
  "vacation",
  "expertise_mismatch",
  "coverage_region_gap",
  "seller_request",
  "performance_issue",
  "other",
] as const;
export type HandoffReason = (typeof HANDOFF_REASONS)[number];

export interface CandidateTeamMember {
  id: string;
  fullName: string;
  authUserId: string | null;
  active: boolean;
  capacityCurrent: number;
  capacityMax: number;
  coverageRegions: string[];
  isAdmin: boolean;
}

export async function listHandoffCandidates(
  excludeTeamMemberId: string,
): Promise<CandidateTeamMember[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("team_members")
    .select(
      "id, first_name, last_name, auth_user_id, active, capacity_active_current, capacity_active_max, coverage_regions, role",
    )
    .eq("active", true)
    .neq("id", excludeTeamMemberId)
    .order("first_name", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => {
    const r = row as {
      id: string;
      first_name: string;
      last_name: string;
      auth_user_id: string | null;
      active: boolean;
      capacity_active_current: number;
      capacity_active_max: number;
      coverage_regions: string[] | null;
      role: string[] | null;
    };
    return {
      id: r.id,
      fullName: `${r.first_name} ${r.last_name}`.trim(),
      authUserId: r.auth_user_id,
      active: r.active,
      capacityCurrent: r.capacity_active_current,
      capacityMax: r.capacity_active_max,
      coverageRegions: r.coverage_regions ?? [],
      isAdmin: Array.isArray(r.role) && r.role.includes("admin"),
    };
  });
}

export interface HandoffRpcResult {
  outgoingTeamMemberId: string | null;
  outgoingAuthUserId: string | null;
  incomingAuthUserId: string | null;
  assignmentEventId: string | null;
}

export async function callHandoffRpc(args: {
  submissionRowId: string;
  toTeamMemberId: string;
  actorAuthUserId: string;
  reason: HandoffReason;
  note: string | null;
  adminOverride: boolean;
}): Promise<{ ok: true; result: HandoffRpcResult } | { ok: false; reason: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("team_handoff", {
    p_submission_id: args.submissionRowId,
    p_to_team_member_id: args.toTeamMemberId,
    p_actor_auth_user_id: args.actorAuthUserId,
    p_reason: args.reason,
    p_note: args.note,
    p_admin_override: args.adminOverride,
  });
  if (error) {
    return { ok: false, reason: error.message };
  }
  const rows = (data ?? []) as Array<{
    outgoing_team_member_id: string | null;
    outgoing_auth_user_id: string | null;
    incoming_auth_user_id: string | null;
    assignment_event_id: string | null;
  }>;
  const row = rows[0] ?? {
    outgoing_team_member_id: null,
    outgoing_auth_user_id: null,
    incoming_auth_user_id: null,
    assignment_event_id: null,
  };
  return {
    ok: true,
    result: {
      outgoingTeamMemberId: row.outgoing_team_member_id,
      outgoingAuthUserId: row.outgoing_auth_user_id,
      incomingAuthUserId: row.incoming_auth_user_id,
      assignmentEventId: row.assignment_event_id,
    },
  };
}

export interface SendHandoffEmailsArgs {
  outgoingEmail: string | null;
  outgoingName: string;
  incomingEmail: string | null;
  incomingName: string;
  sellerName: string;
  propertySummary: string;
  reason: HandoffReason;
  note: string | null;
  submissionUrl: string;
}

let _resend: Resend | null = null;
function resend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

function fromAddress(): string {
  const v = process.env.EMAIL_FROM;
  if (!v) {
    throw new Error("EMAIL_FROM is not set. Required for outbound email.");
  }
  return v;
}

export async function sendHandoffEmails(
  args: SendHandoffEmailsArgs,
): Promise<void> {
  const client = resend();
  if (!client) {
    captureException({
      event: "team_message_send_failed",
      severity: "warning",
      extras: { op: "sendHandoffEmails", reason: "no_resend_api_key" },
    });
    return;
  }

  const propsBase = {
    outgoingName: args.outgoingName,
    incomingName: args.incomingName,
    sellerName: args.sellerName,
    propertySummary: args.propertySummary,
    reason: args.reason,
    note: args.note,
    submissionUrl: args.submissionUrl,
  };

  if (args.outgoingEmail) {
    try {
      const element = HandoffOutgoing(propsBase);
      const html = await render(element);
      const text = await render(element, { plainText: true });
      const result = await client.emails.send({
        from: fromAddress(),
        to: args.outgoingEmail,
        subject: `Handoff confirmed: ${args.sellerName}`,
        html,
        text,
      });
      if (result.error) {
        captureException({
          event: "team_message_send_failed",
          severity: "warning",
          extras: {
            op: "sendHandoffEmails.outgoing",
            error: result.error.message,
          },
        });
      }
    } catch (err) {
      captureException({
        event: "team_message_send_failed",
        severity: "error",
        extras: {
          op: "sendHandoffEmails.outgoing",
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  if (args.incomingEmail) {
    try {
      const element = HandoffIncoming(propsBase);
      const html = await render(element);
      const text = await render(element, { plainText: true });
      const result = await client.emails.send({
        from: fromAddress(),
        to: args.incomingEmail,
        subject: `New submission for you: ${args.sellerName}`,
        html,
        text,
      });
      if (result.error) {
        captureException({
          event: "team_message_send_failed",
          severity: "warning",
          extras: {
            op: "sendHandoffEmails.incoming",
            error: result.error.message,
          },
        });
      }
    } catch (err) {
      captureException({
        event: "team_message_send_failed",
        severity: "error",
        extras: {
          op: "sendHandoffEmails.incoming",
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
}

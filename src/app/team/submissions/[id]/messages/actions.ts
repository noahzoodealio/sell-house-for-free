"use server";

import { revalidatePath } from "next/cache";

import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import {
  sendMessageFromTeam,
  type SendMessageInput,
} from "@/lib/team/messages";

export interface SendTeamMessageInput {
  submissionRowId: string;
  subject: string;
  body: string;
}

export type SendTeamMessageResult =
  | { ok: true; messageRowId: string }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "not_assignee"
        | "validation"
        | "send_failed"
        | "internal";
    };

export async function sendTeamMessage(
  input: SendTeamMessageInput,
): Promise<SendTeamMessageResult> {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active) {
    return { ok: false, reason: "unauthenticated" };
  }

  const admin = getSupabaseAdmin();
  const { data: submissionRow } = await admin
    .from("submissions")
    .select(
      "id, submission_id, seller_id, pm_user_id, address_line1, city, state",
    )
    .eq("id", input.submissionRowId)
    .maybeSingle();

  if (!submissionRow) {
    return { ok: false, reason: "not_assignee" };
  }
  const submission = submissionRow as {
    id: string;
    submission_id: string;
    seller_id: string;
    pm_user_id: string | null;
    address_line1: string;
    city: string;
    state: string;
  };

  // Authorize: assignee OR admin.
  const isAssignee = submission.pm_user_id === member.id;
  if (!isAssignee && !member.isAdmin) {
    return { ok: false, reason: "not_assignee" };
  }

  const { data: profileRow } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", submission.seller_id)
    .maybeSingle();
  if (!profileRow) {
    return { ok: false, reason: "internal" };
  }
  const profile = profileRow as { email: string; full_name: string };

  const { data: teamRow } = await admin
    .from("team_members")
    .select("first_name, last_name, email")
    .eq("id", member.id)
    .maybeSingle();
  if (!teamRow) {
    return { ok: false, reason: "internal" };
  }
  const team = teamRow as {
    first_name: string;
    last_name: string;
    email: string;
  };

  const sendInput: SendMessageInput = {
    submission: {
      submissionRowId: submission.id,
      submissionId: submission.submission_id,
      sellerEmail: profile.email,
      sellerFirstName: profile.full_name.split(/\s+/)[0] || profile.full_name,
    },
    teamMember: {
      authUserId: user.id,
      fullName: `${team.first_name} ${team.last_name}`.trim(),
      email: team.email,
    },
    subject: input.subject,
    body: input.body,
  };

  const result = await sendMessageFromTeam(sendInput);
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  revalidatePath(`/team/submissions/${submission.id}/messages`);
  revalidatePath(`/team/submissions/${submission.id}`);
  revalidatePath("/team");
  return { ok: true, messageRowId: result.messageRowId };
}

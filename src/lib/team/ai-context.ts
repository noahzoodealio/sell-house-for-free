import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface AiSessionRow {
  id: string;
  submissionId: string | null;
  startedAt: string;
  lastActiveAt: string;
  endedAt: string | null;
  tokensIn: number;
  tokensOut: number;
}

export interface AiMessageRow {
  id: string;
  role: string;
  contentJson: unknown;
  createdAt: string;
}

export interface AiArtifactRow {
  id: string;
  sessionId: string;
  kind: string;
  createdAt: string;
}

export interface AiSessionWithMessages {
  session: AiSessionRow;
  messages: AiMessageRow[];
  messageCount: number;
  firstUserText: string;
  lastAssistantText: string;
}

const SESSION_LIMIT = 5;
const MESSAGE_PREVIEW = 50;

/**
 * Best-effort plaintext extraction from an AI SDK v6 UIMessage `content_json`.
 * Mirrors the shape of `extractText` in src/lib/ai/session.ts: parts[] of
 * `{ type: 'text', text: '...' }` joined with newlines. Returns "" when the
 * shape is unrecognized — callers should treat that as "no readable text"
 * rather than crash.
 */
export function extractText(contentJson: unknown): string {
  if (!contentJson || typeof contentJson !== "object") return "";
  const root = contentJson as Record<string, unknown>;
  const parts = root.parts;
  if (Array.isArray(parts)) {
    const texts: string[] = [];
    for (const part of parts) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "text"
      ) {
        const t = (part as { text?: string }).text;
        if (typeof t === "string") texts.push(t);
      }
    }
    return texts.join("\n").trim();
  }
  // Fallback: legacy shape { content: string } or just `text`.
  if (typeof root.content === "string") return root.content;
  if (typeof root.text === "string") return root.text;
  return "";
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export async function loadAiContextForSubmission(
  submissionTextId: string,
): Promise<AiSessionWithMessages[]> {
  const supabase = getSupabaseAdmin();

  const { data: sessionRows } = await supabase
    .from("ai_sessions")
    .select(
      "id, submission_id, started_at, last_active_at, ended_at, tokens_used_in, tokens_used_out",
    )
    .eq("submission_id", submissionTextId)
    .order("last_active_at", { ascending: false })
    .limit(SESSION_LIMIT);

  const sessions = (sessionRows ?? []).map((row) => row as Record<string, unknown>);
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id as string);
  const { data: messageRows } = await supabase
    .from("ai_messages")
    .select("id, session_id, role, content_json, created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  const messagesBySession = new Map<string, AiMessageRow[]>();
  for (const row of messageRows ?? []) {
    const r = row as {
      id: string;
      session_id: string;
      role: string;
      content_json: unknown;
      created_at: string;
    };
    const list = messagesBySession.get(r.session_id) ?? [];
    list.push({
      id: r.id,
      role: r.role,
      contentJson: r.content_json,
      createdAt: r.created_at,
    });
    messagesBySession.set(r.session_id, list);
  }

  return sessions.map((row) => {
    const session: AiSessionRow = {
      id: row.id as string,
      submissionId: (row.submission_id as string | null) ?? null,
      startedAt: row.started_at as string,
      lastActiveAt: row.last_active_at as string,
      endedAt: (row.ended_at as string | null) ?? null,
      tokensIn: (row.tokens_used_in as number) ?? 0,
      tokensOut: (row.tokens_used_out as number) ?? 0,
    };
    const messages = (messagesBySession.get(session.id) ?? []).slice(
      0,
      MESSAGE_PREVIEW,
    );
    const firstUser = messages.find((m) => m.role === "user");
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    return {
      session,
      messages,
      messageCount: messages.length,
      firstUserText: extractText(firstUser?.contentJson ?? null),
      lastAssistantText: extractText(lastAssistant?.contentJson ?? null),
    };
  });
}

export async function loadAiArtifacts(
  sessionIds: string[],
): Promise<AiArtifactRow[]> {
  if (sessionIds.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("ai_artifacts")
    .select("id, session_id, kind, created_at")
    .in("session_id", sessionIds)
    .in("kind", ["doc_summary", "offer_analysis", "valuation"])
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      session_id: string;
      kind: string;
      created_at: string;
    };
    return {
      id: r.id,
      sessionId: r.session_id,
      kind: r.kind,
      createdAt: r.created_at,
    };
  });
}

export function buildAiContextBrief(session: AiSessionWithMessages): string {
  const lines: string[] = [];
  lines.push(`AI session ${session.session.id}`);
  lines.push(`Started ${session.session.startedAt}`);
  lines.push("");
  let userTurns = 0;
  for (const message of session.messages) {
    if (message.role === "user") {
      userTurns += 1;
      if (userTurns > 3) break;
      lines.push(`User: ${truncate(extractText(message.contentJson), 400)}`);
    } else if (message.role === "assistant") {
      lines.push(
        `Agent: ${truncate(extractText(message.contentJson), 400)}`,
      );
    }
  }
  lines.push("");
  lines.push("Source: /team/submissions/<id>/ai-context");
  return lines.join("\n");
}

/**
 * Inserts an `ai_context_viewed` audit row, debounced per (team_user_id,
 * session_id, day). Returns the count of rows actually inserted (0 if
 * already audited today).
 */
export async function recordAiContextViews(args: {
  submissionRowId: string;
  teamUserId: string;
  sessionIds: string[];
}): Promise<number> {
  if (args.sessionIds.length === 0) return 0;
  const supabase = getSupabaseAdmin();
  const startOfDayIso = new Date(
    new Date().setHours(0, 0, 0, 0),
  ).toISOString();

  let inserted = 0;
  for (const sessionId of args.sessionIds) {
    const { data: existingRows } = await supabase
      .from("team_activity_events")
      .select("id")
      .eq("submission_id", args.submissionRowId)
      .eq("team_user_id", args.teamUserId)
      .eq("event_type", "ai_context_viewed")
      .gte("created_at", startOfDayIso)
      .contains("event_data", { session_id: sessionId })
      .limit(1);

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      continue;
    }

    const { error } = await supabase.from("team_activity_events").insert({
      submission_id: args.submissionRowId,
      team_user_id: args.teamUserId,
      event_type: "ai_context_viewed",
      event_data: { session_id: sessionId },
    });
    if (!error) inserted += 1;
  }
  return inserted;
}

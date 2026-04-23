import "server-only";

import { createHash } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const AI_SESSION_COOKIE = "shf_ai_session";
const DEFAULT_MESSAGE_WINDOW = 24;
const DEFAULT_MAX_AGE_DAYS = 30;

export type UIMessagePart =
  | { type: "text"; text: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown }
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      result: unknown;
    }
  | { type: string; [key: string]: unknown };

export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  parts: UIMessagePart[];
}

export interface SessionContext {
  address?: string;
  pillarHint?: string;
  condition?: string;
  timeline?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  motivation?: string;
  enrichment?: {
    attomId?: string;
    mlsRecordId?: string;
    avmLow?: number;
    avmHigh?: number;
  };
  [key: string]: unknown;
}

const PII_KEYS = new Set([
  "phone",
  "email",
  "firstName",
  "lastName",
  "first_name",
  "last_name",
  "street1",
  "street2",
  "address1",
  "address2",
]);

const SAFE_CONTEXT_KEYS = [
  "address",
  "pillarHint",
  "condition",
  "timeline",
  "beds",
  "baths",
  "sqft",
  "motivation",
] as const;

export interface LoadedSession {
  id: string;
  submissionId: string | null;
  context: SessionContext;
  tokenBudgets: { in: number; out: number };
  tokensUsed: { in: number; out: number };
  messages: UIMessage[];
  ipHash: string | null;
}

export interface CreateSessionOptions {
  submissionId?: string;
  seed?: SessionContext;
  ip?: string | null;
}

export interface CreateSessionResult {
  sessionId: string;
  cookieValue: string;
  cookieOptions: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: 604800;
  };
}

let saltWarningLogged = false;

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.AI_IP_HASH_SALT;
  if (!salt) {
    if (!saltWarningLogged) {
      console.warn(
        '{"level":"warn","kind":"session.ip_hash.no_salt","message":"AI_IP_HASH_SALT unset; storing null ip_hash"}',
      );
      saltWarningLogged = true;
    }
    return null;
  }
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

function messageWindow(): number {
  const env = process.env.AI_SESSION_MESSAGE_WINDOW;
  if (!env) return DEFAULT_MESSAGE_WINDOW;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MESSAGE_WINDOW;
}

function maxAgeDays(): number {
  const env = process.env.AI_SESSION_MAX_AGE_DAYS;
  if (!env) return DEFAULT_MAX_AGE_DAYS;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_AGE_DAYS;
}

function dropPii<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (PII_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out as Partial<T>;
}

async function fetchSubmissionSeed(
  submissionId: string,
): Promise<SessionContext | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();

  if (error || !data) {
    console.warn(
      JSON.stringify({
        level: "warn",
        kind: "session.seed.missing_submission",
        submissionId,
        reason: error?.message ?? "not_found",
      }),
    );
    return null;
  }

  const row = data as Record<string, unknown>;
  const seed: SessionContext = {};
  for (const key of SAFE_CONTEXT_KEYS) {
    const value = row[key];
    if (value != null) seed[key] = value as never;
  }

  const enrichmentSource = (row.enrichment ?? row.enrichment_slot) as
    | Record<string, unknown>
    | null
    | undefined;
  if (enrichmentSource && typeof enrichmentSource === "object") {
    const enrichment: SessionContext["enrichment"] = {};
    if (enrichmentSource.attomId)
      enrichment.attomId = String(enrichmentSource.attomId);
    if (enrichmentSource.mlsRecordId)
      enrichment.mlsRecordId = String(enrichmentSource.mlsRecordId);
    if (typeof enrichmentSource.avmLow === "number")
      enrichment.avmLow = enrichmentSource.avmLow;
    if (typeof enrichmentSource.avmHigh === "number")
      enrichment.avmHigh = enrichmentSource.avmHigh;
    if (Object.keys(enrichment).length > 0) seed.enrichment = enrichment;
  }

  return dropPii(seed) as SessionContext;
}

export async function createSession(
  options: CreateSessionOptions = {},
): Promise<CreateSessionResult> {
  const supabase = getSupabaseAdmin();

  let baseSeed: SessionContext = {};
  let resolvedSubmissionId: string | null = null;

  if (options.submissionId) {
    const seedFromSubmission = await fetchSubmissionSeed(options.submissionId);
    if (seedFromSubmission) {
      baseSeed = seedFromSubmission;
      resolvedSubmissionId = options.submissionId;
    }
  }

  const contextJson = options.seed
    ? { ...baseSeed, ...dropPii(options.seed as Record<string, unknown>) }
    : baseSeed;

  const { data, error } = await supabase
    .from("ai_sessions")
    .insert({
      submission_id: resolvedSubmissionId,
      context_json: contextJson,
      ip_hash: hashIp(options.ip ?? null),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`createSession failed: ${error?.message ?? "unknown"}`);
  }

  const sessionId = (data as { id: string }).id;

  return {
    sessionId,
    cookieValue: sessionId,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    },
  };
}

interface AiSessionRow {
  id: string;
  submission_id: string | null;
  context_json: SessionContext | null;
  token_budget_in: number;
  token_budget_out: number;
  tokens_used_in: number;
  tokens_used_out: number;
  ip_hash: string | null;
  created_at: string;
  last_active_at: string;
  ended_at: string | null;
}

interface AiMessageRow {
  id: number;
  session_id: string;
  role: UIMessage["role"];
  content_json: UIMessage;
  token_in: number | null;
  token_out: number | null;
  created_at: string;
}

function extractText(message: UIMessage): string {
  const texts: string[] = [];
  for (const part of message.parts ?? []) {
    if (part.type === "text" && typeof part.text === "string") {
      texts.push(part.text);
    }
  }
  return texts.join(" ").trim();
}

function compactOlderMessages(older: UIMessage[]): UIMessage | null {
  const chunks: string[] = [];
  for (const m of older) {
    const text = extractText(m);
    if (text) chunks.push(`${m.role}: ${text}`);
  }
  if (chunks.length === 0) return null;
  return {
    id: "system:compacted",
    role: "system",
    parts: [
      {
        type: "text",
        text: `[Prior conversation summary — older turns compacted]\n${chunks.join("\n")}`,
      },
    ],
  };
}

export async function loadSession(id: string): Promise<LoadedSession | null> {
  const supabase = getSupabaseAdmin();

  const { data: sessionData, error: sessionError } = await supabase
    .from("ai_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (sessionError || !sessionData) return null;

  const row = sessionData as AiSessionRow;
  if (row.ended_at) return null;

  const ageMs = Date.now() - new Date(row.created_at).getTime();
  if (ageMs > maxAgeDays() * 86_400_000) return null;

  const window = messageWindow();

  const { data: totalCountData } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", id);
  const totalCount =
    (totalCountData as unknown as { count?: number })?.count ?? null;

  const { data: messagesData, error: messagesError } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(`loadSession messages failed: ${messagesError.message}`);
  }

  const allRows = (messagesData ?? []) as AiMessageRow[];
  let messages: UIMessage[] = allRows.map((r) => r.content_json);

  if (messages.length > window) {
    const overflow = messages.length - (window - 1);
    const older = messages.slice(0, overflow);
    const recent = messages.slice(overflow);
    const synthetic = compactOlderMessages(older);
    messages = synthetic ? [synthetic, ...recent] : recent;
  }

  void totalCount;

  return {
    id: row.id,
    submissionId: row.submission_id,
    context: (row.context_json ?? {}) as SessionContext,
    tokenBudgets: { in: row.token_budget_in, out: row.token_budget_out },
    tokensUsed: { in: row.tokens_used_in, out: row.tokens_used_out },
    messages,
    ipHash: row.ip_hash,
  };
}

export async function persistUserMessage(
  sessionId: string,
  uiMessage: UIMessage,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("ai_messages").insert({
    session_id: sessionId,
    role: "user",
    content_json: uiMessage,
    token_in: null,
    token_out: null,
  });
  if (error) {
    throw new Error(`persistUserMessage failed: ${error.message}`);
  }
}

export interface AssistantMessageUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface PersistAssistantInput {
  uiMessage: UIMessage;
  usage?: AssistantMessageUsage;
}

export async function persistAssistantMessage(
  sessionId: string,
  input: PersistAssistantInput,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const inputTokens = input.usage?.inputTokens ?? null;
  const outputTokens = input.usage?.outputTokens ?? null;

  const { error: insertError } = await supabase.from("ai_messages").insert({
    session_id: sessionId,
    role: "assistant",
    content_json: input.uiMessage,
    token_in: inputTokens,
    token_out: outputTokens,
  });
  if (insertError) {
    throw new Error(`persistAssistantMessage insert failed: ${insertError.message}`);
  }

  if (inputTokens != null || outputTokens != null) {
    // Read-modify-write counter update. Orchestrator turns are serial per
    // session (cookie-bound, no concurrent writes from the same browser), so
    // lost-update concurrency does not apply. A crash after the message insert
    // but before this update leaves the counter under-counted — preferred over
    // the double-count risk of a retry-based replay.
    const { data: current } = await supabase
      .from("ai_sessions")
      .select("tokens_used_in, tokens_used_out")
      .eq("id", sessionId)
      .single();
    const curr = (current ?? {
      tokens_used_in: 0,
      tokens_used_out: 0,
    }) as { tokens_used_in: number; tokens_used_out: number };

    const { error: updateError } = await supabase
      .from("ai_sessions")
      .update({
        tokens_used_in: curr.tokens_used_in + (inputTokens ?? 0),
        tokens_used_out: curr.tokens_used_out + (outputTokens ?? 0),
        last_active_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (updateError) {
      throw new Error(
        `persistAssistantMessage counter update failed: ${updateError.message}`,
      );
    }
  }
}

export async function bumpSessionActivity(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("ai_sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) {
    throw new Error(`bumpSessionActivity failed: ${error.message}`);
  }
}

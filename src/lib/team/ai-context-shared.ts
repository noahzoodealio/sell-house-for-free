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
  if (typeof root.content === "string") return root.content;
  if (typeof root.text === "string") return root.text;
  return "";
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
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

import { after, NextResponse, type NextRequest } from "next/server";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage as AiUIMessage,
} from "ai";
import { z } from "zod";

import { gateway, models } from "@/lib/ai/gateway";
import { enforceBudget } from "@/lib/ai/budget";
import { redact } from "@/lib/ai/redact";
import { transactionManagerPrompt } from "@/lib/ai/prompts/transaction-manager";
import { explainTermsTool } from "@/lib/ai/tools/explain-terms";
import { reviewPdfTool } from "@/lib/ai/tools/review-pdf";
import {
  bumpSessionActivity,
  loadSession,
  persistAssistantMessage,
  persistUserMessage,
  type UIMessage,
} from "@/lib/ai/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const UIMessagePartSchema = z.looseObject({ type: z.string() });
const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "tool", "system"]),
  parts: z.array(UIMessagePartSchema),
});

const PostBodySchema = z.object({
  sessionId: z.string().uuid(),
  messages: z.array(UIMessageSchema).min(1),
});

function lastUiMessageText(message: UIMessage): string {
  const parts = message.parts ?? [];
  const texts: string[] = [];
  for (const part of parts) {
    if (part.type === "text" && typeof part.text === "string") {
      texts.push(part.text);
    }
  }
  return texts.join(" ").trim();
}

export async function POST(request: NextRequest): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", details: "body must be JSON" },
      { status: 400 },
    );
  }

  const parsed = PostBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { sessionId, messages } = parsed.data as {
    sessionId: string;
    messages: UIMessage[];
  };

  const session = await loadSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const budget = await enforceBudget(
    {
      tokens_used_in: session.tokensUsed.in,
      tokens_used_out: session.tokensUsed.out,
      token_budget_in: session.tokenBudgets.in,
      token_budget_out: session.tokenBudgets.out,
    },
    request,
  );
  if (!budget.ok) {
    return NextResponse.json(
      { error: "budget_exceeded", reason: budget.reason },
      { status: budget.status },
    );
  }

  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage.role === "user") {
    console.log(
      redact(
        JSON.stringify({
          level: "info",
          kind: "chat.turn.user",
          sessionId,
          preview: lastUiMessageText(lastUserMessage).slice(0, 200),
        }),
      ),
    );
    await persistUserMessage(sessionId, lastUserMessage);
  }

  const modelMessages = await convertToModelMessages(
    messages as unknown as AiUIMessage[],
  );

  const result = streamText({
    model: gateway(models.orchestrator),
    system: transactionManagerPrompt(session.context),
    messages: modelMessages,
    tools: {
      review_pdf: reviewPdfTool({ id: sessionId }),
      explain_terms: explainTermsTool({ id: sessionId }),
    },
    stopWhen: stepCountIs(8),
    experimental_telemetry: {
      isEnabled: true,
      functionId: "sell-house-for-free/chat",
    },
    onFinish: async ({ text, usage, response }) => {
      const assistantUiMessage: UIMessage = {
        id: `assistant:${Date.now()}`,
        role: "assistant",
        parts: [{ type: "text", text: text ?? "" }],
      };
      void response;
      await persistAssistantMessage(sessionId, {
        uiMessage: assistantUiMessage,
        usage: {
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
        },
      });
    },
  });

  after(async () => {
    try {
      await bumpSessionActivity(sessionId);
    } catch (err) {
      console.warn(
        redact(
          JSON.stringify({
            level: "warn",
            kind: "chat.after.bump_failed",
            sessionId,
            message: err instanceof Error ? err.message : String(err),
          }),
        ),
      );
    }
  });

  return result.toUIMessageStreamResponse();
}

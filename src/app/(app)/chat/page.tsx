import { cookies } from "next/headers";
import type { Metadata } from "next";

import {
  AI_SESSION_COOKIE,
  createSession,
  loadSession,
  type SessionContext,
  type UIMessage,
} from "@/lib/ai/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

import { Chat } from "./components/chat";
import { DisclaimerBanner } from "./components/disclaimer-banner";

export const metadata: Metadata = {
  title: "Chat with your AI assistant",
  description:
    "Friend-style advice on pricing, offers, contracts, and negotiation from Sell Your House Free's AI assistant.",
};

interface ChatPageProps {
  searchParams: Promise<{ bootstrap?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  const submissionId =
    typeof params.bootstrap === "string" && params.bootstrap.length > 0
      ? params.bootstrap
      : undefined;

  const jar = await cookies();
  const cookieValue = jar.get(AI_SESSION_COOKIE)?.value;

  let sessionId: string | null = null;
  let context: SessionContext = {};
  let freshSession = false;

  if (cookieValue) {
    const existing = await loadSession(cookieValue);
    if (existing) {
      sessionId = existing.id;
      context = existing.context;
    }
  }

  if (!sessionId) {
    const minted = await createSession({ submissionId });
    jar.set(AI_SESSION_COOKIE, minted.cookieValue, minted.cookieOptions);
    sessionId = minted.sessionId;
    freshSession = true;

    const fresh = await loadSession(sessionId);
    if (fresh) context = fresh.context;
  }

  // Seed a context-aware first assistant turn when the session was just
  // minted via ?bootstrap=... and carries non-empty context. Skipped for
  // returning sessions (which already have a turn history) and for the
  // no-context fallback path where the first assistant turn should ask
  // for the address instead.
  const contextAware = freshSession && Object.keys(context).length > 0;
  if (contextAware) {
    const greeting = buildContextAwareGreeting(context);
    const uiMessage: UIMessage = {
      id: `assistant:greeting:${sessionId}`,
      role: "assistant",
      parts: [{ type: "text", text: greeting }],
    };
    const supabase = getSupabaseAdmin();
    await supabase.from("ai_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content_json: uiMessage,
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[100dvh]">
      <DisclaimerBanner />
      <Chat sessionId={sessionId} />
    </div>
  );
}

function buildContextAwareGreeting(ctx: SessionContext): string {
  const parts: string[] = [];
  parts.push(
    "Heads up — I'm an AI assistant giving you friend-style advice. I'm not a licensed real-estate professional and I'm not your fiduciary, so treat this as input, not gospel.",
  );

  const anchors: string[] = [];
  if (ctx.address) anchors.push(`your place at ${ctx.address}`);
  if (ctx.pillarHint) anchors.push(`the ${ctx.pillarHint} path`);
  if (ctx.timeline) anchors.push(`a ${ctx.timeline} timeline`);

  if (anchors.length > 0) {
    parts.push(
      `I have the context on ${anchors.join(", ")}. What would be most useful to dig into first — offer strategy, a comp run, or something on the contract side?`,
    );
  } else {
    parts.push(
      "What's most useful to dig into first — offer strategy, a comp run, or something on the contract side?",
    );
  }

  return parts.join("\n\n");
}

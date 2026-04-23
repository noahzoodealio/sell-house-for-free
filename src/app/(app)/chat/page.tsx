import { cookies } from "next/headers";
import type { Metadata } from "next";

import {
  AI_SESSION_COOKIE,
  createSession,
  loadSession,
} from "@/lib/ai/session";

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
  if (cookieValue) {
    const existing = await loadSession(cookieValue);
    if (existing) sessionId = existing.id;
  }

  if (!sessionId) {
    const minted = await createSession({ submissionId });
    jar.set(AI_SESSION_COOKIE, minted.cookieValue, minted.cookieOptions);
    sessionId = minted.sessionId;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[100dvh]">
      <DisclaimerBanner />
      <Chat sessionId={sessionId} />
    </div>
  );
}

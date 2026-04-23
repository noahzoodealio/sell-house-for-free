"use client";

import { useEffect, useState } from "react";

import { Chat } from "./chat";
import { DisclaimerBanner } from "./disclaimer-banner";

/**
 * Client-side session bootstrap for the portal's AI assistant surface.
 * GETs /api/chat/sessions; if 401, POSTs to mint. Renders <Chat/> once
 * we have a sessionId. No server-side rendering of the session — the
 * portal is already behind the /portal gate (host-admin + seller
 * verification flow), so the session cookie is minted at first visit.
 */
export function ChatBootstrap() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await fetch("/api/chat/sessions", {
          cache: "no-store",
        });
        if (!cancelled && existing.ok) {
          const data = (await existing.json()) as { sessionId?: string };
          if (data.sessionId) {
            setSessionId(data.sessionId);
            return;
          }
        }
        const minted = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        if (cancelled) return;
        if (!minted.ok) {
          setError("We couldn't start the AI assistant right now.");
          return;
        }
        const payload = (await minted.json()) as { sessionId?: string };
        if (payload.sessionId) setSessionId(payload.sessionId);
        else setError("We couldn't start the AI assistant right now.");
      } catch {
        if (!cancelled) {
          setError("We couldn't start the AI assistant right now.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="portal-section">
        <p role="alert" className="text-[var(--color-error)]">
          {error}
        </p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="portal-section" aria-live="polite">
        <p className="text-ink-muted text-sm">Starting the AI assistant…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-h-[70vh]">
      <DisclaimerBanner />
      <div className="flex-1 min-h-0 flex flex-col border border-border rounded-lg overflow-hidden">
        <Chat sessionId={sessionId} />
      </div>
    </div>
  );
}

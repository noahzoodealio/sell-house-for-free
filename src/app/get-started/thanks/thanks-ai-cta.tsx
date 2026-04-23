"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const SUBMISSION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Thanks-page "Talk to your AI assistant" CTA.
 *
 * Gating: parent server component already checked
 * `process.env.AI_CHAT_ENABLED === 'true'` before rendering this
 * component. We do NOT re-check the env here — keeping the env server-only
 * prevents it from leaking into the client bundle, and Next tree-shakes
 * the whole Suspense branch when the parent decides not to render.
 *
 * Behavior: reads `?submission=<uuid>` from the thanks URL and deep-links
 * to `/chat?bootstrap=<submissionId>`. When the param is absent or not a
 * valid UUID, links to `/chat` without a bootstrap (S22 owns the
 * fallback greeting path).
 */
export function ThanksAiCta() {
  const params = useSearchParams();
  const raw = params.get("submission");
  const submissionId = raw && SUBMISSION_PATTERN.test(raw) ? raw : null;

  const href = submissionId
    ? `/chat?bootstrap=${submissionId}`
    : "/chat";

  return (
    <Link href={href} className="btn btn-secondary btn-lg">
      Talk to your AI assistant →
    </Link>
  );
}

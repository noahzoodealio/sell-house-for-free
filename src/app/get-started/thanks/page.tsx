import { Suspense } from "react";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { ThanksAiCta } from "./thanks-ai-cta";
import { ThanksRef } from "./thanks-ref";

export const metadata = buildMetadata({
  title: "Thanks",
  description: "Your submission has been received.",
  path: "/get-started/thanks",
  noindex: true,
});

export default function GetStartedThanksPage() {
  const aiChatEnabled = process.env.AI_CHAT_ENABLED === "true";
  return (
    <div className="sellfree-flow">
      <div className="flow-page flow-page-done">
        <header className="flow-page-nav">
          <Link href="/" className="wordmark" aria-label="sellfree.ai — home">
            <span className="dot">sellfree</span>
            <span className="ai">.ai</span>
          </Link>
          <span className="flow-step-n">Submission complete</span>
          <Link href="/" className="flow-exit" aria-label="Return home">
            Back to home ×
          </Link>
        </header>

        <main className="flow-page-body">
          <div className="flow-page-content" style={{ textAlign: "center" }}>
            <div
              className="flow-success-check"
              style={{ margin: "0 auto 32px" }}
              aria-hidden="true"
            >
              ✓
            </div>
            <span
              className="eyebrow"
              style={{ marginBottom: 12, display: "block" }}
            >
              Submitted
            </span>
            <h1 className="flow-page-title">Report on the way.</h1>
            <p
              className="flow-page-lede"
              style={{ maxWidth: 520, margin: "0 auto 32px" }}
            >
              Your property report is generating now. A licensed Arizona Project
              Manager will reach out shortly — keep an eye on your email and
              phone.
            </p>
            <div className="success-stats">
              <div className="success-stat">
                <div className="v">24h</div>
                <div className="k">PM reach-out</div>
              </div>
              <div className="success-stat inverted">
                <div className="v">$0</div>
                <div className="k">Listing commission</div>
              </div>
              <div className="success-stat">
                <div className="v">18d</div>
                <div className="k">Avg close</div>
              </div>
            </div>
            <div
              style={{
                marginTop: 32,
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/" className="btn btn-primary btn-lg">
                Back to home
              </Link>
              {aiChatEnabled && (
                <Suspense fallback={null}>
                  <ThanksAiCta />
                </Suspense>
              )}
            </div>
            <Suspense fallback={null}>
              <ThanksRef />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

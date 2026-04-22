import { Suspense } from "react";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { ThanksRef } from "./thanks-ref";

export const metadata = buildMetadata({
  title: "Thanks",
  description: "Your submission has been received.",
  path: "/get-started/thanks",
  noindex: true,
});

export default function GetStartedThanksPage() {
  return (
    <div className="sellfree-flow">
      <div className="flow-head">
        <Link href="/" className="wordmark" aria-label="sellfree.ai — home">
          <span className="dot">sellfree</span>
          <span className="ai">.ai</span>
        </Link>
        <div className="flow-progress" aria-hidden="true">
          <div className="flow-progress-fill" style={{ width: "100%" }} />
        </div>
        <span className="flow-step-n">Done</span>
        <Link href="/" className="flow-close" aria-label="Return home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
      </div>

      <div className="flow-body">
        <div className="flow-success">
          <div className="flow-success-check" aria-hidden="true">
            ✓
          </div>
          <h2>Submission received.</h2>
          <p className="lede">
            We’re pulling together your full property report. A licensed Arizona
            Project Manager will be in touch shortly to walk through your
            options — keep an eye on your email and phone.
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
          <Suspense fallback={null}>
            <ThanksRef />
          </Suspense>
        </div>
      </div>

      <div className="flow-foot">
        <div className="flow-foot-inner" style={{ justifyContent: "flex-end" }}>
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

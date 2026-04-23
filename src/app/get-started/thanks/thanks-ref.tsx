"use client";

import { useSearchParams } from "next/navigation";

const REF_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function ThanksRef() {
  const params = useSearchParams();
  const raw = params.get("ref");
  const ref = raw && REF_PATTERN.test(raw) ? raw : null;

  if (ref === "pending") {
    return (
      <p className="text-ink-muted text-[14px] leading-[22px]">
        Looks like we already have you on file. Your Project Manager will follow
        up within one business day to pick up where we left off — no need to
        resubmit.
      </p>
    );
  }

  if (ref === "unassigned") {
    return (
      <p className="text-ink-muted text-[14px] leading-[22px]">
        We got your submission but hit a hiccup finishing the handoff. A Project
        Manager will still reach out within one business day — our side, not
        yours.
      </p>
    );
  }

  if (!ref) return null;
  return (
    <p
      style={{
        fontFamily: "var(--sf-font-mono)",
        fontSize: 11,
        letterSpacing: "0.04em",
        color: "var(--muted)",
        marginTop: 24,
      }}
    >
      Ref: {ref}
    </p>
  );
}

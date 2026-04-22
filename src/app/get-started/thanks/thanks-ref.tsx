"use client";

import { useSearchParams } from "next/navigation";

const REF_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function ThanksRef() {
  const params = useSearchParams();
  const raw = params.get("ref");
  const ref = raw && REF_PATTERN.test(raw) ? raw : null;
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

"use client";

import { useSearchParams } from "next/navigation";

const REF_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function ThanksRef() {
  const params = useSearchParams();
  const raw = params.get("ref");
  const ref = raw && REF_PATTERN.test(raw) ? raw : null;
  if (!ref) return null;
  return <p className="text-ink-muted text-[13px]">Ref: {ref}</p>;
}

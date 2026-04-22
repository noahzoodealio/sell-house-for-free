"use client";

import type { EnrichmentHookStatus } from "@/lib/enrichment/use-address-enrichment";
import { cn } from "@/lib/cn";

export type EnrichmentBadgeProps = {
  status: EnrichmentHookStatus;
  className?: string;
};

type Tone = "neutral" | "ok" | "info" | "warn" | "error";
type Icon = "spinner" | "check" | "info" | "warn" | "error";

type BadgeCopy = { label: string; tone: Tone; icon: Icon };

const COPY: Record<Exclude<EnrichmentHookStatus, "idle">, BadgeCopy> = {
  loading: { label: "Looking up your home…", tone: "neutral", icon: "spinner" },
  ok: { label: "✓ Found your home", tone: "ok", icon: "check" },
  "out-of-area": {
    label: "Sorry — we're Arizona-only right now",
    tone: "warn",
    icon: "warn",
  },
  "no-match": {
    label:
      "We couldn't find this address in public records — that's OK, you can keep going",
    tone: "info",
    icon: "info",
  },
  timeout: {
    label: "Couldn't reach our records right now — you can keep going",
    tone: "warn",
    icon: "warn",
  },
  error: {
    label: "Couldn't reach our records right now — you can keep going",
    tone: "warn",
    icon: "error",
  },
};

const TONE_CLASS: Record<Tone, string> = {
  neutral:
    "border-border bg-[color:color-mix(in_srgb,var(--color-ink-muted)_8%,transparent)] text-ink-body",
  ok: "border-[color:color-mix(in_srgb,var(--color-brand)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-brand)_8%,transparent)] text-ink-body",
  info: "border-border bg-[color:color-mix(in_srgb,var(--color-ink-muted)_6%,transparent)] text-ink-body",
  warn: "border-[color:color-mix(in_srgb,var(--color-error)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--color-error)_5%,transparent)] text-ink-body",
  error:
    "border-[var(--color-error)] bg-[color:color-mix(in_srgb,var(--color-error)_6%,transparent)] text-[var(--color-error)]",
};

export function EnrichmentBadge({ status, className }: EnrichmentBadgeProps) {
  if (status === "idle") return null;

  const copy = COPY[status];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-enrichment-status={status}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] leading-[18px]",
        TONE_CLASS[copy.tone],
        className,
      )}
    >
      <BadgeIcon icon={copy.icon} />
      <span>{copy.label}</span>
    </div>
  );
}

function BadgeIcon({ icon }: { icon: Icon }) {
  if (icon === "spinner") {
    return (
      <span
        aria-hidden="true"
        className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
    );
  }
  if (icon === "check") {
    // The check glyph is already embedded in the label copy ("✓ Found your
    // home"), so the decorative icon is suppressed for this state.
    return null;
  }
  if (icon === "info") {
    return (
      <span aria-hidden="true" className="text-[14px] leading-none">
        ℹ
      </span>
    );
  }
  if (icon === "warn") {
    return (
      <span aria-hidden="true" className="text-[14px] leading-none">
        ⚠
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="text-[14px] leading-none">
      ✕
    </span>
  );
}

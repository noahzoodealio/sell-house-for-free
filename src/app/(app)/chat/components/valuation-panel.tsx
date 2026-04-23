"use client";

import { useEffect, useState } from "react";

import type { Valuation } from "@/lib/ai/schemas/valuation";
import { cn } from "@/lib/cn";

import { CompCard } from "./comp-card";

interface JobStatusResponse {
  jobId: string;
  status: "pending" | "running" | "ok" | "error" | "timeout";
  latencyMs: number | null;
  error: Record<string, unknown> | null;
  summary: {
    low: number;
    mid: number;
    high: number;
    confidence: number;
  } | null;
  artifact: { payload_json?: Valuation } | null;
}

interface ValuationPanelProps {
  jobId: string;
  pollUrl: string;
  initialValuation?: Valuation;
  pollIntervalMs?: number;
}

function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function confidenceLabel(c: number): {
  label: string;
  tone: "low" | "mid" | "high";
} {
  if (c >= 0.7) return { label: "High confidence", tone: "high" };
  if (c >= 0.4) return { label: "Medium confidence", tone: "mid" };
  return { label: "Low confidence", tone: "low" };
}

export function ValuationPanel({
  jobId,
  pollUrl,
  initialValuation,
  pollIntervalMs = 3000,
}: ValuationPanelProps) {
  const [valuation, setValuation] = useState<Valuation | null>(
    initialValuation ?? null,
  );
  const [status, setStatus] = useState<JobStatusResponse["status"]>(
    initialValuation ? "ok" : "running",
  );

  useEffect(() => {
    if (initialValuation) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(pollUrl, { cache: "no-store" });
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const payload = (await res.json()) as JobStatusResponse;
        setStatus(payload.status);
        if (payload.status === "ok" && payload.artifact?.payload_json) {
          setValuation(payload.artifact.payload_json);
          return;
        }
        if (payload.status === "running" || payload.status === "pending") {
          setTimeout(poll, pollIntervalMs);
        }
      } catch {
        setStatus("error");
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [initialValuation, pollIntervalMs, pollUrl]);

  if (status === "running" || status === "pending") {
    return (
      <article
        className="border border-border rounded-lg p-4 bg-surface flex items-center gap-3"
        aria-live="polite"
      >
        <span className="inline-block w-3 h-3 bg-brand rounded-full animate-pulse" />
        <p className="text-sm">Pulling comps — about 30-90 seconds…</p>
      </article>
    );
  }

  if (status === "error" || !valuation) {
    return (
      <article className="border border-[var(--color-error)] rounded-lg p-4 bg-red-50 text-sm text-red-900">
        We hit a problem pulling comps for this one. Your PM can run a
        comparative market analysis manually — just ask.
      </article>
    );
  }

  const conf = confidenceLabel(valuation.confidence);
  void jobId;

  return (
    <article className="border border-border rounded-lg p-4 flex flex-col gap-4 bg-surface">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Estimated value</h3>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded border cursor-help",
              conf.tone === "high"
                ? "bg-green-50 text-green-900 border-green-300"
                : conf.tone === "mid"
                  ? "bg-yellow-50 text-yellow-900 border-yellow-300"
                  : "bg-red-50 text-red-900 border-red-300",
            )}
            title={valuation.methodology.rubricNotes ?? conf.label}
          >
            {conf.label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-xs text-ink-muted">Low</p>
            <p className="text-base">{money(valuation.low)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Mid</p>
            <p className="text-base font-semibold">{money(valuation.mid)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">High</p>
            <p className="text-base">{money(valuation.high)}</p>
          </div>
        </div>
      </header>

      {valuation.pickedComps.length > 0 && (
        <section>
          <h4 className="text-xs uppercase text-ink-muted mb-2">
            Picked comps ({valuation.pickedComps.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {valuation.pickedComps.map((c) => (
              <CompCard
                key={c.mlsRecordId}
                address={c.address}
                soldPrice={c.soldPrice}
                adjustedSoldPrice={c.adjustedSoldPrice}
                totalDelta={c.totalDelta}
                condition={c.condition}
                whyThisComp={c.whyThisComp}
              />
            ))}
          </div>
        </section>
      )}

      {valuation.discardedComps.length > 0 && (
        <section>
          <h4 className="text-xs uppercase text-ink-muted mb-1">
            Discarded ({valuation.discardedComps.length})
          </h4>
          <ul className="flex flex-col gap-1 text-xs text-ink-muted">
            {valuation.discardedComps.map((c) => (
              <li key={c.mlsRecordId}>
                <span className="font-medium">{c.address}</span> — {c.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-xs text-ink-muted border-t border-border pt-2">
        {valuation.disclaimer}
      </footer>
    </article>
  );
}

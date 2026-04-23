"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

interface CompCardProps {
  address: string;
  soldPrice: number | null;
  adjustedSoldPrice: number | null;
  totalDelta: number;
  condition: "poor" | "fair" | "good" | "excellent" | "unknown";
  whyThisComp: string;
  photoUrls?: string[];
}

function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function CompCard({
  address,
  soldPrice,
  adjustedSoldPrice,
  totalDelta,
  condition,
  whyThisComp,
  photoUrls = [],
}: CompCardProps) {
  const [expanded, setExpanded] = useState(false);
  const deltaSign = totalDelta >= 0 ? "+" : "-";

  return (
    <article className="border border-border rounded-lg p-3 flex flex-col gap-2 bg-surface">
      <header className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium truncate">{address}</p>
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded border",
            condition === "excellent" || condition === "good"
              ? "bg-green-50 text-green-900 border-green-300"
              : condition === "fair"
                ? "bg-yellow-50 text-yellow-900 border-yellow-300"
                : condition === "poor"
                  ? "bg-red-50 text-red-900 border-red-300"
                  : "bg-surface-tint text-ink-muted border-border",
          )}
        >
          {condition}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-ink-muted">Sold</p>
          <p>{money(soldPrice)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Adjusted</p>
          <p>
            {money(adjustedSoldPrice)}{" "}
            <span className="text-xs text-ink-muted">
              ({deltaSign}
              {money(Math.abs(totalDelta))})
            </span>
          </p>
        </div>
      </div>

      {photoUrls.length > 0 && (
        <div className="flex gap-1 overflow-x-auto">
          {photoUrls.slice(0, 4).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`Comp photo ${i + 1}`}
              className="w-16 h-16 object-cover rounded flex-shrink-0"
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="text-xs text-brand underline self-start"
      >
        {expanded ? "Hide" : "Why this comp"}
      </button>
      {expanded && (
        <p className="text-xs text-ink-muted leading-relaxed">{whyThisComp}</p>
      )}
    </article>
  );
}

import type { OfferAnalysis } from "@/lib/ai/schemas/offer-analysis";

const POSITION_LABEL: Record<OfferAnalysis["vsAvm"]["positionWord"], string> = {
  "below-low": "Below your AVM",
  "near-low": "Near the low end",
  mid: "Mid-range",
  "near-high": "Near the top",
  "above-high": "Above your AVM",
  "avm-unavailable": "AVM not on file",
};

const POSITION_STYLE: Record<OfferAnalysis["vsAvm"]["positionWord"], string> = {
  "below-low": "bg-red-50 text-red-900 border-red-300",
  "near-low": "bg-yellow-50 text-yellow-900 border-yellow-300",
  mid: "bg-surface-tint text-ink-body border-border",
  "near-high": "bg-green-50 text-green-900 border-green-300",
  "above-high": "bg-green-50 text-green-900 border-green-300",
  "avm-unavailable": "bg-surface-tint text-ink-muted border-border",
};

function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function OfferAnalysisCard({ analysis }: { analysis: OfferAnalysis }) {
  return (
    <article
      className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3"
      aria-label="Offer analysis"
    >
      <header className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">{analysis.counterparty}</p>
        <h3 className="text-base font-semibold">
          {money(analysis.headlinePrice)} headline price
        </h3>
        <span
          className={`inline-block w-fit border rounded px-2 py-0.5 text-xs ${POSITION_STYLE[analysis.vsAvm.positionWord]}`}
        >
          {POSITION_LABEL[analysis.vsAvm.positionWord]}
        </span>
        <p className="text-sm text-ink-muted">{analysis.vsAvm.comment}</p>
      </header>

      <section className="bg-surface-tint rounded-md px-3 py-2">
        <h4 className="text-xs uppercase text-ink-muted mb-1">My take</h4>
        <p className="text-sm leading-relaxed">{analysis.friendlyTake}</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <h4 className="text-xs uppercase text-ink-muted mb-1">Pros</h4>
          <ul className="flex flex-col gap-1 text-sm">
            {analysis.pros.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.label}:</span> {p.detail}
              </li>
            ))}
          </ul>
        </div>
        {analysis.cons.length > 0 && (
          <div>
            <h4 className="text-xs uppercase text-ink-muted mb-1">Cons</h4>
            <ul className="flex flex-col gap-1 text-sm">
              {analysis.cons.map((c, i) => (
                <li key={i}>
                  <span className="font-medium">{c.label}:</span> {c.detail}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h4 className="text-xs uppercase text-ink-muted mb-1">Net</h4>
        <p className="text-sm">
          <span className="font-medium">Close proceeds (est.):</span>{" "}
          {money(analysis.net.estimatedCloseProceeds)}
        </p>
        {analysis.net.concessions.length > 0 && (
          <p className="text-sm mt-1">
            <span className="font-medium">Concessions:</span>{" "}
            {analysis.net.concessions.join(", ")}
          </p>
        )}
        {analysis.net.notes && (
          <p className="text-xs text-ink-muted mt-1">{analysis.net.notes}</p>
        )}
      </section>

      {analysis.pushbacks.length > 0 && (
        <section>
          <h4 className="text-xs uppercase text-ink-muted mb-1">
            Suggested pushbacks
          </h4>
          <ul className="flex flex-col gap-2">
            {analysis.pushbacks.map((p, i) => (
              <li
                key={i}
                className="border border-border rounded px-3 py-2 text-sm"
              >
                <p className="font-medium">{p.term}</p>
                <p>{p.suggestion}</p>
                <p className="text-xs text-ink-muted mt-1">{p.rationale}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-xs text-ink-muted border-t border-border pt-2">
        {analysis.disclaimer}
      </footer>
    </article>
  );
}

import type { DocSummary } from "@/lib/ai/schemas/doc-summary";

const SEVERITY_STYLES: Record<DocSummary["concerns"][number]["severity"], string> = {
  info: "bg-surface-tint text-ink-body border-border",
  caution: "bg-yellow-50 text-yellow-900 border-yellow-300",
  warn: "bg-red-50 text-red-900 border-red-300",
};

export function DocSummaryCard({ summary }: { summary: DocSummary }) {
  return (
    <article
      className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3"
      aria-label="Document summary"
    >
      <header className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">{summary.originalName}</p>
        <h3 className="text-base font-semibold">{summary.headline}</h3>
      </header>

      {summary.keyTerms.length > 0 && (
        <section>
          <h4 className="text-xs uppercase text-ink-muted mb-1">Key terms</h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {summary.keyTerms.map((kt, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <dt className="font-medium">{kt.label}:</dt>
                <dd>
                  {kt.value}
                  {kt.pageRef && (
                    <span className="text-ink-muted ml-1">(p. {kt.pageRef})</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {summary.concerns.length > 0 && (
        <section>
          <h4 className="text-xs uppercase text-ink-muted mb-1">Concerns</h4>
          <ul className="flex flex-col gap-1.5">
            {summary.concerns.map((c, i) => (
              <li
                key={i}
                className={`border rounded px-2 py-1 text-sm ${SEVERITY_STYLES[c.severity]}`}
              >
                <span className="uppercase text-[10px] tracking-wide mr-2 font-semibold">
                  {c.severity}
                </span>
                {c.note}
                {c.pageRef && (
                  <span className="text-ink-muted ml-1">(p. {c.pageRef})</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.citations.length > 0 && (
        <section>
          <h4 className="text-xs uppercase text-ink-muted mb-1">Citations</h4>
          <ul className="flex flex-col gap-1 text-sm">
            {summary.citations.map((c, i) => (
              <li key={i} className="text-ink-muted">
                <span className="font-mono text-xs">p. {c.pageRef}</span> —{" "}
                <span className="italic">“{c.excerpt}”</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-xs text-ink-muted border-t border-border pt-2">
        {summary.disclaimer}
      </footer>
    </article>
  );
}

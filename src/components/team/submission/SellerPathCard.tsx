import { labelSellerPath, type SubmissionDetail } from "@/lib/team/submissions";

export function SellerPathCard({ submission }: { submission: SubmissionDetail }) {
  return (
    <section className="rounded-lg border border-ink-border bg-white p-4">
      <h2 className="text-sm font-semibold text-ink-heading">
        Seller-selected paths
      </h2>
      {submission.sellerPaths.length === 0 ? (
        <p className="mt-2 text-sm text-ink-subtle">
          No paths selected at submission.
        </p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {submission.sellerPaths.map((path) => (
            <li
              key={path}
              className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary"
            >
              {labelSellerPath(path)}
            </li>
          ))}
        </ul>
      )}
      {submission.pillarHint ? (
        <p className="mt-3 text-xs text-ink-subtle">
          Pillar hint: <span className="text-ink-body">{submission.pillarHint}</span>
        </p>
      ) : null}
      {submission.timeline ? (
        <p className="mt-1 text-xs text-ink-subtle">
          Timeline: <span className="text-ink-body">{submission.timeline}</span>
        </p>
      ) : null}
    </section>
  );
}

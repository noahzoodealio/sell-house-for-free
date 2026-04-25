import type { SubmissionDetail } from "@/lib/team/submissions-shared";

export function PropertySnapshot({ submission }: { submission: SubmissionDetail }) {
  const fields: Array<{ label: string; value: string | null }> = [
    { label: "Beds", value: submission.beds?.toString() ?? null },
    { label: "Baths", value: submission.baths?.toString() ?? null },
    {
      label: "Sqft",
      value: submission.sqft ? submission.sqft.toLocaleString() : null,
    },
    {
      label: "Year built",
      value: submission.yearBuilt?.toString() ?? null,
    },
  ];
  return (
    <section className="rounded-lg border border-ink-border bg-white p-4">
      <h2 className="text-sm font-semibold text-ink-heading">Property</h2>
      <p className="mt-1 text-sm text-ink-body">
        {submission.addressLine1}
        {submission.addressLine2 ? `, ${submission.addressLine2}` : ""}
        <br />
        {submission.city}, {submission.state} {submission.zip}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs text-ink-subtle">{field.label}</dt>
            <dd className="text-ink-heading">{field.value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

import Link from "next/link";

export function ActionRail({ submissionRowId }: { submissionRowId: string }) {
  const links = [
    {
      href: `/team/submissions/${submissionRowId}/messages`,
      label: "Messages",
      description: "View thread + send to seller",
    },
    {
      href: `/team/submissions/${submissionRowId}/documents`,
      label: "Documents",
      description: "Upload + download files",
    },
    {
      href: `/team/submissions/${submissionRowId}/handoff`,
      label: "Handoff",
      description: "Reassign to another team member",
    },
    {
      href: `/team/submissions/${submissionRowId}/ai-context`,
      label: "AI context",
      description: "Recent seller chat summaries",
    },
  ];
  return (
    <nav aria-label="Submission actions" className="flex flex-col gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="block rounded-md border border-ink-border bg-white px-3 py-2 hover:bg-ink-subtle/5"
        >
          <span className="block text-sm font-semibold text-ink-heading">
            {link.label}
          </span>
          <span className="text-xs text-ink-subtle">{link.description}</span>
        </Link>
      ))}
    </nav>
  );
}

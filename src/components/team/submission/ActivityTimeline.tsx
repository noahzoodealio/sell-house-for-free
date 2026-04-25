import type { ActivityEvent } from "@/lib/team/submissions-shared";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleString();
}

const ICON: Record<string, string> = {
  email_sent: "✉",
  message_sent: "✉",
  message_received: "↩",
  note_added: "📝",
  document_uploaded: "📎",
  document_downloaded: "⬇",
  document_deleted: "🗑",
  status_changed: "↔",
  handoff_initiated: "↪",
  handoff_completed: "✓",
  ai_context_viewed: "🧠",
  login: "→",
  login_rejected_inactive: "✕",
  assigned: "👤",
  reassigned: "↪",
  unassigned: "↩",
};

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-ink-subtle">
        No activity yet on this submission.
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-start gap-3 border-b border-ink-border pb-2 last:border-b-0"
        >
          <span aria-hidden className="mt-0.5 text-base">
            {ICON[event.eventType] ?? "•"}
          </span>
          <div className="flex-1">
            <p className="text-sm text-ink-heading">{event.summary}</p>
            <p className="text-xs text-ink-subtle">
              {event.actorName ?? "system"} · {formatRelative(event.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

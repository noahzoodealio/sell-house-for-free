import type { ThreadMessage } from "@/lib/team/messages";

const DELIVERY_BADGE_COPY: Record<string, { label: string; tone: string }> = {
  pending: { label: "Sending…", tone: "text-ink-subtle" },
  delivered: { label: "Delivered", tone: "text-emerald-700" },
  bounced: { label: "Bounced", tone: "text-red-700" },
  complained: { label: "Marked as spam", tone: "text-red-700" },
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function Thread({ messages }: { messages: ThreadMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ink-border px-4 py-6 text-sm text-ink-subtle">
        No messages yet. Send the seller a note below to start the thread.
      </p>
    );
  }

  return (
    <ol
      role="log"
      aria-live="polite"
      className="flex flex-col gap-3"
    >
      {messages.map((message) => {
        const isOutbound = message.direction === "outbound";
        const deliveryCopy = isOutbound
          ? DELIVERY_BADGE_COPY[message.deliveryStatus ?? "pending"]
          : null;
        return (
          <li
            key={message.id}
            className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
              isOutbound
                ? "ml-8 border-brand-primary/20 bg-brand-primary/5"
                : "mr-8 border-ink-border bg-white"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2 text-xs text-ink-subtle">
              <span className="font-medium text-ink-body">
                {isOutbound
                  ? `Team — ${message.senderEmail ?? "you"}`
                  : message.senderEmail ?? "Seller"}
              </span>
              <time dateTime={message.createdAt}>
                {formatTimestamp(message.createdAt)}
              </time>
            </div>
            {message.subject ? (
              <p className="text-sm font-semibold text-ink-heading">
                {message.subject}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap text-sm text-ink-body">
              {message.body}
            </p>
            {deliveryCopy ? (
              <span className={`text-xs ${deliveryCopy.tone}`}>
                {deliveryCopy.label}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

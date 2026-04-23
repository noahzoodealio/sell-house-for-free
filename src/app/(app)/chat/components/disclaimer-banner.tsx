export const CHAT_DISCLAIMER =
  "I'm Sell Your House Free's AI assistant. I'll give you real, friend-style advice on pricing, offers, contracts, and negotiation — but I'm not a licensed real-estate professional and I'm not your fiduciary, so treat what I say as input, not gospel. I don't sell your data.";

export function DisclaimerBanner() {
  return (
    <div
      role="region"
      aria-label="AI assistant disclaimer"
      className="bg-surface-tint border-b border-border px-4 py-3 text-sm text-ink-body"
    >
      <p className="max-w-4xl mx-auto">{CHAT_DISCLAIMER}</p>
    </div>
  );
}

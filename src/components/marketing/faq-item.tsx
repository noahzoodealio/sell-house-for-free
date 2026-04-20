import type { FaqEntry } from "@/content/faq/entries";

export type FAQItemProps = {
  entry: FaqEntry;
};

export function FAQItem({ entry }: FAQItemProps) {
  const paragraphs = entry.answer.split("\n\n");
  return (
    <details
      id={entry.id}
      className="group scroll-mt-24 border-b border-border py-4"
    >
      <summary
        className={
          "flex cursor-pointer items-start justify-between gap-4 list-none " +
          "[&::-webkit-details-marker]:hidden [&::marker]:hidden " +
          "text-[18px] leading-[28px] font-semibold text-ink-title " +
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        }
      >
        <span>{entry.question}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="mt-1 h-5 w-5 flex-none text-ink-muted transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </summary>
      <div className="mt-3 space-y-4 text-[16px] leading-[24px] text-ink-body">
        {paragraphs.map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
      </div>
    </details>
  );
}

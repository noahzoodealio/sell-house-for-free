import type { ReactNode } from "react";
import {
  FAQ_CATEGORIES,
  FAQ_CATEGORY_LABELS,
  type FaqCategory,
  type FaqEntry,
} from "@/content/faq/entries";
import { Container } from "@/components/layout/container";
import { FAQItem } from "./faq-item";

export type FAQProps = {
  entries: readonly FaqEntry[];
  title?: ReactNode;
  category?: FaqCategory;
};

function sortSkepticFirst(list: readonly FaqEntry[]): FaqEntry[] {
  return list
    .map((entry, idx) => ({ entry, idx }))
    .sort((a, b) => {
      const aFirst = a.entry.skepticFirst ? 0 : 1;
      const bFirst = b.entry.skepticFirst ? 0 : 1;
      if (aFirst !== bFirst) return aFirst - bFirst;
      return a.idx - b.idx;
    })
    .map(({ entry }) => entry);
}

export function FAQ({ entries, title, category }: FAQProps) {
  if (category) {
    const scoped = sortSkepticFirst(entries.filter((e) => e.category === category));
    if (scoped.length === 0) return null;
    return (
      <section className="py-12 md:py-16">
        <Container size="prose">
          {title ? (
            <h2 className="mb-6 text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] font-semibold text-ink-title">
              {title}
            </h2>
          ) : null}
          <div>
            {scoped.map((entry) => (
              <FAQItem key={entry.id} entry={entry} />
            ))}
          </div>
        </Container>
      </section>
    );
  }

  const byCategory = new Map<FaqCategory, FaqEntry[]>();
  for (const entry of entries) {
    const bucket = byCategory.get(entry.category) ?? [];
    bucket.push(entry);
    byCategory.set(entry.category, bucket);
  }

  return (
    <section className="py-12 md:py-16">
      <Container size="prose">
        {title ? (
          <h2 className="mb-8 text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] font-semibold text-ink-title">
            {title}
          </h2>
        ) : null}
        <div className="space-y-12">
          {FAQ_CATEGORIES.map((cat) => {
            const bucket = byCategory.get(cat);
            if (!bucket || bucket.length === 0) return null;
            const headingId = `faq-category-${cat}`;
            const sorted = sortSkepticFirst(bucket);
            return (
              <section key={cat} aria-labelledby={headingId}>
                <h3
                  id={headingId}
                  className="mb-4 text-[22px] leading-[28px] md:text-[24px] md:leading-[32px] font-semibold text-ink-title"
                >
                  {FAQ_CATEGORY_LABELS[cat]}
                </h3>
                <div>
                  {sorted.map((entry) => (
                    <FAQItem key={entry.id} entry={entry} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

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
  eyebrow?: string;
  category?: FaqCategory;
  /** "prose" = narrow reading column (default, used on the FAQ page).
   *  "page" = home-style wide section with the standard page gutters and
   *  a readable inner column. */
  size?: "prose" | "page";
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

export function FAQ({
  entries,
  title,
  eyebrow,
  category,
  size = "prose",
}: FAQProps) {
  const isPage = size === "page";
  const sectionPadding = isPage ? "py-20 md:py-24" : "py-12 md:py-16";
  const innerWrap = isPage ? "max-w-3xl" : "";
  const headerWrap = isPage ? "mb-10 md:mb-12 max-w-2xl" : "mb-6";
  const titleClass = isPage
    ? "text-[32px] leading-[1.15] md:text-[44px] md:leading-[1.1] font-semibold text-ink-title"
    : "text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] font-semibold text-ink-title";

  function Header() {
    if (!eyebrow && !title) return null;
    return (
      <div className={headerWrap}>
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        {title ? <h2 className={titleClass}>{title}</h2> : null}
      </div>
    );
  }

  if (category) {
    const scoped = sortSkepticFirst(entries.filter((e) => e.category === category));
    if (scoped.length === 0) return null;
    return (
      <section className={sectionPadding}>
        <Container size={isPage ? "page" : "prose"}>
          <div className={innerWrap}>
            <Header />
            <div>
              {scoped.map((entry) => (
                <FAQItem key={entry.id} entry={entry} />
              ))}
            </div>
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
    <section className={sectionPadding}>
      <Container size={isPage ? "page" : "prose"}>
        <div className={innerWrap}>
          <Header />
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
        </div>
      </Container>
    </section>
  );
}

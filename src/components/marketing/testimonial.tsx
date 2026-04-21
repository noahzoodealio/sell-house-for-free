import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

export type TestimonialAuthor = {
  name: string;
  title?: string;
};

export type TestimonialProps = {
  quote: ReactNode;
  author: TestimonialAuthor;
  eyebrow?: string;
};

function QuoteMark() {
  return (
    <svg
      viewBox="0 0 48 36"
      aria-hidden="true"
      className="size-10 text-brand-tint"
      fill="currentColor"
    >
      <path d="M0 36V20C0 9 7 1 18 0v6c-6 1-10 6-10 13h10v17H0Zm30 0V20C30 9 37 1 48 0v6c-6 1-10 6-10 13h10v17H30Z" />
    </svg>
  );
}

export function Testimonial({ quote, author, eyebrow }: TestimonialProps) {
  return (
    <section className="bg-surface py-20 md:py-24">
      <Container>
        <figure className="mx-auto max-w-3xl text-center">
          {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
          <div className="mb-6 flex justify-center">
            <QuoteMark />
          </div>
          <blockquote className="text-[22px] leading-[1.5] md:text-[26px] md:leading-[1.4] font-medium text-ink-title">
            {quote}
          </blockquote>
          <figcaption className="mt-8 text-[15px] text-ink-muted">
            <span className="font-semibold text-ink-title">{author.name}</span>
            {author.title ? (
              <>
                <span aria-hidden="true" className="mx-2">
                  ·
                </span>
                <span>{author.title}</span>
              </>
            ) : null}
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}

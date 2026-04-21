import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { LINKS } from "@/lib/links";
import { howToSchema } from "@/lib/schema";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/marketing/page-header";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { CTASection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/marketing/json-ld";

const PAGE_TITLE = "How it works";
const PAGE_DESCRIPTION =
  "How a Sell Your House Free sale runs, end-to-end: a 4-step process under your Project Manager and a licensed Arizona broker.";

const STEPS = [
  {
    heading: "Tell us about your home",
    body: "Start a free intake at /get-offer. A few minutes of address, condition, and timing is enough for your Project Manager to open your file.",
  },
  {
    heading: "Meet your PM",
    body: "A named, reachable PM on our Arizona team is assigned to your sale. They are the single point of contact for the entire transaction.",
  },
  {
    heading: "Choose your path",
    body: "Your PM models every path that fits your situation, Listing, Cash Offers, Cash+, or Renovation, with real numbers side-by-side. You pick.",
  },
  {
    heading: "Close on your timeline",
    body: "We coordinate the listing, the buyer, the inspections, title, and close under our licensed Arizona broker of record. You sign; the proceeds wire.",
  },
] as const;

export const metadata: Metadata = buildMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: LINKS.howItWorks,
});

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        heading="Straight sale, PM-assisted, no surprises"
        subcopy="Every path runs the same way: one PM on our Arizona team, one licensed broker of record, one set of honest numbers from intake through close."
      />
      <HowItWorks
        steps={[...STEPS]}
        cta={{ label: "Get my cash offer", href: LINKS.getOffer }}
      />
      <section className="py-12 md:py-16">
        <Container size="prose">
          <h2 className="text-[28px] leading-[36px] md:text-[32px] md:leading-[40px] font-semibold text-ink-title">
            Why PM-assisted, not self-serve
          </h2>
          <div className="mt-6 space-y-4 text-[17px] leading-[28px] text-ink-body">
            <p>
              A home sale has a lot of decisions packed into a short window:
              pricing, repairs, offers, inspections, closing dates. A real
              Project Manager keeps every one of those decisions in front of
              you, with the trade-offs named honestly, so you’re never guessing.
            </p>
            <p>
              The PM is paid to get your sale to a successful close, not to
              push you toward any particular path. That’s why every path on
              this site is priced for you up front, and you choose. We don’t
              steer.
            </p>
          </div>
        </Container>
      </section>
      <CTASection
        heading="Ready to start your sale?"
        subcopy="Free intake, no obligation, real PM on the other side."
        primaryCta={{ label: "Get my cash offer", href: LINKS.getOffer }}
        secondaryCta={{ label: "Common questions", href: LINKS.faq }}
      />
      <JsonLd
        id="ld-howto"
        data={howToSchema(
          { name: PAGE_TITLE, description: PAGE_DESCRIPTION },
          STEPS,
        )}
      />
    </>
  );
}

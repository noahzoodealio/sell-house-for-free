import { buildMetadata } from "@/lib/seo";
import { AddressSearchBar } from "@/components/marketing/address-search-bar";

type OfferCopy = { eyebrow: string; heading: string; buttonLabel: string };

const DEFAULT_COPY: OfferCopy = {
  eyebrow: "Free, no-obligation",
  heading: "Enter your home address to get started.",
  buttonLabel: "Get my cash offer",
};

const PILLAR_COPY: Record<string, OfferCopy> = {
  "cash-offer": {
    eyebrow: "Cash Offers",
    heading: "See your cash offer. Enter your home address.",
    buttonLabel: "Get my cash offer",
  },
  "cash-plus": {
    eyebrow: "Cash+",
    heading: "See your Cash+ path. Enter your home address.",
    buttonLabel: "See my Cash+ path",
  },
  listing: {
    eyebrow: "Listing + MLS",
    heading: "Start your free listing. Enter your home address.",
    buttonLabel: "Start my free listing",
  },
  renovation: {
    eyebrow: "Renovation",
    heading: "Explore Renovation. Enter your home address.",
    buttonLabel: "Explore Renovation",
  },
};

export const metadata = buildMetadata({
  title: "Get your offer",
  description:
    "Enter your Arizona home address to start a free, no-obligation offer.",
  path: "/get-offer",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickCopy(params: Record<string, string | string[] | undefined>): OfferCopy {
  for (const key of Object.keys(PILLAR_COPY)) {
    if (params[key] === "true") return PILLAR_COPY[key];
  }
  return DEFAULT_COPY;
}

export default async function GetOfferPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const copy = pickCopy(params);

  return (
    <section className="bg-surface-tint flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[var(--container-page)] flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center md:px-6 md:py-28 lg:px-8">
        <p className="text-brand text-[14px] font-semibold uppercase tracking-[0.08em]">
          {copy.eyebrow}
        </p>
        <h1 className="text-ink-title max-w-[720px] text-[32px] leading-[40px] md:text-[44px] md:leading-[52px]">
          {copy.heading}
        </h1>
        <div className="flex w-full justify-center">
          <AddressSearchBar buttonLabel={copy.buttonLabel} />
        </div>
      </div>
    </section>
  );
}

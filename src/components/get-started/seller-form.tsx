import type { AzCitySlug } from "@/lib/routes";

export const PILLAR_SLUGS = [
  "listing",
  "cash-offers",
  "cash-plus-repairs",
  "renovation-only",
] as const;

export const STEP_SLUGS = ["address", "property", "condition", "contact"] as const;

export type PillarSlug = (typeof PILLAR_SLUGS)[number];
export type StepSlug = (typeof STEP_SLUGS)[number];

export type SellerFormProps = {
  initialHints?: { pillar?: PillarSlug; city?: AzCitySlug };
  initialStep?: StepSlug;
};

export function SellerForm(_props: SellerFormProps) {
  return (
    <div className="py-8 text-ink-body">
      <p className="text-[16px] leading-[24px]">Loading form…</p>
    </div>
  );
}

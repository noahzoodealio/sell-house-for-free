import { Suspense } from "react";
import { buildMetadata } from "@/lib/seo";
import { AZ_CITY_SLUGS, type AzCitySlug } from "@/lib/routes";
import { SellerForm } from "@/components/get-started/seller-form";
import {
  PILLAR_SLUGS,
  STEP_SLUGS,
  type PillarSlug,
  type StepSlug,
} from "@/lib/seller-form/types";

export const metadata = buildMetadata({
  title: "Get started",
  description:
    "Start your free, no-obligation request on your Arizona home.",
  path: "/get-started",
  noindex: true,
});

type RawSearchParams = {
  pillar?: string | string[];
  city?: string | string[];
  step?: string | string[];
};

function coerce<T extends readonly string[]>(
  value: string | string[] | undefined,
  allowlist: T,
): T[number] | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return undefined;
  return (allowlist as readonly string[]).includes(first)
    ? (first as T[number])
    : undefined;
}

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const pillar: PillarSlug | undefined = coerce(params.pillar, PILLAR_SLUGS);
  const city: AzCitySlug | undefined = coerce(params.city, AZ_CITY_SLUGS);
  const step: StepSlug = coerce(params.step, STEP_SLUGS) ?? "address";

  return (
    <Suspense fallback={null}>
      <SellerForm initialHints={{ pillar, city }} initialStep={step} />
    </Suspense>
  );
}

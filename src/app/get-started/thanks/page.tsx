import { Suspense } from "react";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LINKS } from "@/lib/links";
import { ThanksRef } from "./thanks-ref";

export const metadata = buildMetadata({
  title: "Thanks",
  description: "Your submission has been received.",
  path: "/get-started/thanks",
  noindex: true,
});

export default function GetStartedThanksPage() {
  return (
    <div className="flex flex-col gap-6 py-12">
      <h1 className="text-ink-title text-[32px] font-semibold leading-[40px] md:text-[40px] md:leading-[48px]">
        Thanks — your Project Manager will reach out shortly.
      </h1>
      <p className="text-ink-body text-[18px] leading-[28px]">
        We received your information. A dedicated Project Manager will
        contact you within one business day to walk through your options.
      </p>
      <Suspense fallback={null}>
        <ThanksRef />
      </Suspense>
      <div>
        <Link
          href={LINKS.home}
          className="text-brand text-[16px] underline underline-offset-4"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

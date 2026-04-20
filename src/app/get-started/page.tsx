import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Get started",
  description:
    "Start your free, no-obligation cash offer on your Arizona home.",
  path: "/get-started",
});

export default function GetStartedPage() {
  return (
    <main className="bg-surface-tint flex min-h-screen flex-col">
      {/* TODO(E1-S8 cleanup): replace inline container with <Container /> */}
      <div className="mx-auto flex w-full max-w-[var(--container-page)] flex-1 flex-col gap-6 px-4 py-24 md:px-6 lg:px-8">
        <h1 className="text-ink-title text-[36px] leading-[44px] md:text-[48px] md:leading-[56px]">
          Get started
        </h1>
        <p className="text-ink-body max-w-[var(--container-prose)] text-[18px] leading-[28px]">
          This is where the short-form submission flow will live. It will ask
          a few questions about your property and request a no-obligation
          all-cash offer.
        </p>
        <Link
          href="/"
          className="text-brand text-[16px] underline underline-offset-4"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface-tint px-6 py-24">
      <h1 className="max-w-[var(--container-prose)] text-center text-[44px] leading-[50px] md:text-[80px]">
        Sell your house, free.
      </h1>
      <p className="max-w-[var(--container-prose)] text-center text-[18px] leading-[32px] text-ink-body md:text-[20px]">
        Final hero copy lands in E1-S11. This shell exists so E1-S1 can verify
        brand tokens, fonts, and layout against the Figma reference.
      </p>
      <Link
        href="/get-started"
        className="inline-flex h-[52px] items-center justify-center rounded-lg bg-brand px-6 text-[18px] font-semibold text-brand-foreground"
      >
        Get started
      </Link>
    </main>
  );
}

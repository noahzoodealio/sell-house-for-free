import Link from "next/link";

// Route-group layouts have no URL identity, so Next.js typegen emits no
// `LayoutRoutes` entry for `(marketing)`. Hand-typing children is the
// documented default (see next/dist/docs/.../layout.md).
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* TODO(E1-S9): replace placeholder with <Header /> */}
      <header className="border-border min-h-[72px] border-b">
        <div className="mx-auto flex h-[72px] max-w-[var(--container-page)] items-center px-4 md:px-6 lg:px-8">
          <Link
            href="/"
            className="text-ink-title text-[18px] font-semibold"
          >
            Sell Your House Free
          </Link>
        </div>
      </header>

      <main className="min-h-[calc(100vh-200px)]">
        {/* TODO(E1-S8 cleanup): replace inline container with <Container /> */}
        <div className="mx-auto max-w-[var(--container-page)] px-4 md:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* TODO(E1-S9): replace placeholder with <Footer /> */}
      <footer className="border-border border-t">
        <div className="text-ink-muted mx-auto max-w-[var(--container-page)] px-4 py-6 text-[14px] md:px-6 lg:px-8">
          Placeholder footer.
        </div>
      </footer>
    </>
  );
}

import Link from "next/link";
import { SITE } from "@/lib/site";

// Route-group layouts have no URL identity, so Next.js typegen emits no
// `LayoutRoutes` entry for `(legal)`. Hand-typing children is the
// documented default (see next/dist/docs/.../layout.md).
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();
  return (
    <>
      <header className="border-border border-b">
        <div className="mx-auto max-w-[var(--container-page)] px-4 py-4 md:px-6 lg:px-8">
          <Link
            href="/"
            className="text-ink-title text-[16px] font-semibold"
          >
            {SITE.name}
          </Link>
        </div>
      </header>

      <main className="min-h-[calc(100vh-160px)]">
        {/* TODO(E1-S8 cleanup): replace inline container with <Container /> */}
        <div className="mx-auto max-w-[var(--container-prose)] px-4 py-10 md:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <footer className="border-border border-t">
        <div className="text-ink-muted mx-auto max-w-[var(--container-page)] space-y-1 px-4 py-6 text-[14px] md:px-6 lg:px-8">
          <p>
            © {year} {SITE.name}
          </p>
          <p>Listing broker: {SITE.broker.name}</p>
        </div>
      </footer>
    </>
  );
}

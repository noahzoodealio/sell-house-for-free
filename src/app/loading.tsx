export default function Loading() {
  return (
    <main
      className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 px-6"
      role="status"
      aria-label="Loading"
    >
      <span
        aria-hidden="true"
        className="border-border border-t-brand inline-block h-10 w-10 animate-spin rounded-full border-4"
      />
      <span className="text-ink-muted text-[14px]">Loading…</span>
    </main>
  );
}

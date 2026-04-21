import { trackNavTransition } from "@/lib/seller-form/analytics";
import { ENTRY_STORAGE_KEY } from "@/lib/seller-form/draft";

try {
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    if (!sessionStorage.getItem(ENTRY_STORAGE_KEY)) {
      sessionStorage.setItem(
        ENTRY_STORAGE_KEY,
        JSON.stringify({
          entryTimestamp: new Date().toISOString(),
          entryPage: window.location.pathname + window.location.search,
        }),
      );
    }
  }
} catch {
  // first-load instrumentation must never break hydration.
}

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
): void {
  try {
    trackNavTransition(url, navigationType);
  } catch {
    // swallow — analytics failures must not disrupt navigation.
  }
}

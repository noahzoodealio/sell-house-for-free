import { track } from "@vercel/analytics";
import type { StepSlug } from "./types";

export function trackStepEntered(step: StepSlug): void {
  track("seller_step_entered", { step });
}

export function trackStepCompleted(step: StepSlug): void {
  track("seller_step_completed", { step });
}

export function trackFormSubmitted(submissionId: string): void {
  track("seller_form_submitted", { submissionId });
}

export function trackFormAbandoned(step: StepSlug): void {
  track("seller_form_abandoned", { step });
}

export function trackNavTransition(
  url: string,
  navigationType: "push" | "replace" | "traverse",
): void {
  track("seller_nav_transition", { url, type: navigationType });
}

"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AzCitySlug } from "@/lib/routes";
import { submitSellerForm } from "@/app/get-started/actions";
import { captureAttribution } from "@/lib/seller-form/attribution";
import { readDraft, writeDraft } from "@/lib/seller-form/draft";
import { useIdempotencyKey } from "@/lib/seller-form/idempotency";
import type {
  AttributionFields,
  StepSlug,
  SubmitState,
} from "@/lib/seller-form/types";
import { STEP_SLUGS } from "@/lib/seller-form/types";
import { Progress } from "./progress";
import { StepNav } from "./step-nav";
import { PlaceholderStep } from "./steps/placeholder-step";

export const PILLAR_SLUGS = [
  "listing",
  "cash-offers",
  "cash-plus-repairs",
  "renovation-only",
] as const;

export { STEP_SLUGS } from "@/lib/seller-form/types";
export type { StepSlug } from "@/lib/seller-form/types";

export type PillarSlug = (typeof PILLAR_SLUGS)[number];

export type SellerFormProps = {
  initialHints?: { pillar?: PillarSlug; city?: AzCitySlug };
  initialStep?: StepSlug;
  onStepChange?: (from: StepSlug, to: StepSlug) => void;
};

const STEP_LABELS = [
  "Address",
  "Property facts",
  "Condition & timeline",
  "Contact & consent",
] as const;

const INITIAL_SUBMIT_STATE: SubmitState = { ok: true, submissionId: "" };

function stepIndex(slug: StepSlug): number {
  return STEP_SLUGS.indexOf(slug);
}

function stepBySlug(slug: string | null | undefined): StepSlug {
  if (slug && (STEP_SLUGS as readonly string[]).includes(slug)) {
    return slug as StepSlug;
  }
  return "address";
}

const EMPTY_SUBSCRIBE = () => () => {};

function getOrCreateSubmissionId(): string {
  if (typeof window === "undefined") return "";
  const existing = readDraft();
  if (existing?.submissionId) return existing.submissionId;
  if (typeof crypto === "undefined" || !("randomUUID" in crypto)) return "";
  const fresh = crypto.randomUUID();
  writeDraft({ submissionId: fresh });
  return fresh;
}

function useSubmissionId(): string {
  return useSyncExternalStore(
    EMPTY_SUBSCRIBE,
    getOrCreateSubmissionId,
    () => "",
  );
}

function useCapturedAttribution(): AttributionFields {
  return useSyncExternalStore(EMPTY_SUBSCRIBE, captureAttribution, () => ({}));
}

export function SellerForm({
  initialHints,
  initialStep = "address",
  onStepChange,
}: SellerFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepFromUrl = stepBySlug(searchParams.get("step"));
  const currentStep: StepSlug = stepFromUrl ?? initialStep;

  const [formState, formAction] = useActionState<SubmitState, FormData>(
    submitSellerForm,
    INITIAL_SUBMIT_STATE,
  );

  const idempotencyKey = useIdempotencyKey();
  const submissionId = useSubmissionId();
  const attribution = useCapturedAttribution();

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const prevStepRef = useRef<StepSlug>(currentStep);
  const liveRegionId = useId();

  const liveMessage = useMemo(() => {
    if (formState.ok === false) {
      const count = Object.keys(formState.errors).length;
      return `We couldn't submit your form — please correct the ${count} field${
        count === 1 ? "" : "s"
      } marked below.`;
    }
    const idx = stepIndex(currentStep);
    return `Step ${idx + 1} of ${STEP_SLUGS.length}: ${STEP_LABELS[idx]}`;
  }, [currentStep, formState]);

  useEffect(() => {
    const next = currentStep;
    const prev = prevStepRef.current;
    if (prev !== next) {
      if (onStepChange) onStepChange(prev, next);
      headingRef.current?.focus();
      prevStepRef.current = next;
    }
  }, [currentStep, onStepChange]);

  const navigateToStep = useCallback(
    (next: StepSlug) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const onBack = useCallback(() => {
    const idx = stepIndex(currentStep);
    if (idx <= 0) return;
    navigateToStep(STEP_SLUGS[idx - 1]);
  }, [currentStep, navigateToStep]);

  const onNext = useCallback(() => {
    const idx = stepIndex(currentStep);
    if (idx >= STEP_SLUGS.length - 1) return;
    navigateToStep(STEP_SLUGS[idx + 1]);
  }, [currentStep, navigateToStep]);

  // S3 ships with placeholder steps. Advance is always permitted so QA can
  // walk the routing; S4–S7 will replace placeholders with validated inputs.
  const canAdvance = true;

  const currentErrors = formState.ok === false ? formState.errors : undefined;
  const hasErrors =
    formState.ok === false && Object.keys(formState.errors).length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-6 py-6" noValidate>
      <Progress
        current={stepIndex(currentStep) + 1}
        total={STEP_SLUGS.length}
        labels={STEP_LABELS}
      />

      <div
        id={liveRegionId}
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {liveMessage}
      </div>

      {hasErrors && (
        <div
          role="alert"
          className="rounded-md border border-error bg-error/5 px-4 py-3 text-[14px] leading-[20px] text-error"
        >
          We couldn&apos;t submit your form — please correct the fields marked
          below.
        </div>
      )}

      <StepDispatch
        step={currentStep}
        headingRef={headingRef}
        errors={currentErrors}
      />

      <HiddenField name="step" value={currentStep} />
      <HiddenField name="submissionId" value={submissionId} />
      <HiddenField name="idempotencyKey" value={idempotencyKey ?? ""} />
      <HiddenField name="attribution" value={JSON.stringify(attribution)} />
      {initialHints?.pillar && (
        <HiddenField name="pillarHint" value={initialHints.pillar} />
      )}
      {initialHints?.city && (
        <HiddenField name="cityHint" value={initialHints.city} />
      )}

      <StepNav
        onBack={onBack}
        onNext={onNext}
        canAdvance={canAdvance}
        step={stepIndex(currentStep) + 1}
        total={STEP_SLUGS.length}
      />
    </form>
  );
}

function StepDispatch({
  step,
  headingRef,
  errors,
}: {
  step: StepSlug;
  headingRef: React.Ref<HTMLHeadingElement>;
  errors?: Record<string, string[]>;
}) {
  switch (step) {
    case "address":
    case "property":
    case "condition":
    case "contact":
      return (
        <PlaceholderStep slug={step} headingRef={headingRef} errors={errors} />
      );
    default: {
      const _exhaustive: never = step;
      throw new Error(`Unhandled step: ${String(_exhaustive)}`);
    }
  }
}

function HiddenField({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} readOnly />;
}

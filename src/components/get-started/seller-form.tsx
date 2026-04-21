"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AzCitySlug } from "@/lib/routes";
import { submitSellerForm } from "@/app/get-started/actions";
import { captureAttribution } from "@/lib/seller-form/attribution";
import { readDraft, writeDraft } from "@/lib/seller-form/draft";
import { useIdempotencyKey } from "@/lib/seller-form/idempotency";
import { validateStep } from "@/lib/seller-form/schema";
import type {
  AddressFields,
  AttributionFields,
  PropertyFields,
  StepSlug,
  SubmitState,
} from "@/lib/seller-form/types";
import { STEP_SLUGS } from "@/lib/seller-form/types";
import { Progress } from "./progress";
import { StepNav } from "./step-nav";
import { AddressStep } from "./steps/address-step";
import { PlaceholderStep } from "./steps/placeholder-step";
import { PropertyStep } from "./steps/property-step";

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

type StepDataMap = {
  address: Partial<AddressFields>;
  property: Partial<PropertyFields>;
};

type DraftState = StepDataMap & {
  submissionId?: string;
};

const EMPTY_DRAFT: DraftState = { address: {}, property: {} };

function stepIndex(slug: StepSlug): number {
  return STEP_SLUGS.indexOf(slug);
}

function stepBySlug(slug: string | null | undefined): StepSlug {
  if (slug && (STEP_SLUGS as readonly string[]).includes(slug)) {
    return slug as StepSlug;
  }
  return "address";
}

function readInitialDraft(): DraftState {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  const persisted = readDraft();
  if (!persisted) return EMPTY_DRAFT;
  return {
    submissionId: persisted.submissionId,
    address: (persisted.address as Partial<AddressFields>) ?? {},
    property: (persisted.property as Partial<PropertyFields>) ?? {},
  };
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

  const [stepData, setStepData] = useState<StepDataMap>(
    () => readInitialDraft(),
  );
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<StepSlug, Record<string, string[]>>>
  >({});

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

  const makeStepUpdater = useCallback(
    <K extends keyof StepDataMap>(step: K) =>
      (partial: Partial<StepDataMap[K]>) => {
        setStepData((prev) => {
          const merged = {
            ...prev,
            [step]: { ...prev[step], ...partial },
          } as StepDataMap;
          writeDraft({
            [step]: merged[step],
          } as Partial<{
            address: AddressFields;
            property: PropertyFields;
          }>);
          return merged;
        });
        setClientErrors((prev) => {
          const current = prev[step as StepSlug] ?? {};
          const next = { ...current };
          let changed = false;
          for (const key of Object.keys(partial)) {
            if (next[key]) {
              delete next[key];
              changed = true;
            }
          }
          return changed ? { ...prev, [step as StepSlug]: next } : prev;
        });
      },
    [],
  );

  const updateAddress = useMemo(() => makeStepUpdater("address"), [makeStepUpdater]);
  const updateProperty = useMemo(() => makeStepUpdater("property"), [makeStepUpdater]);

  const onBack = useCallback(() => {
    const idx = stepIndex(currentStep);
    if (idx <= 0) return;
    navigateToStep(STEP_SLUGS[idx - 1]);
  }, [currentStep, navigateToStep]);

  const onNext = useCallback(() => {
    const idx = stepIndex(currentStep);
    if (idx >= STEP_SLUGS.length - 1) return;

    const stepKey =
      currentStep === "address" || currentStep === "property"
        ? currentStep
        : null;
    if (stepKey) {
      const result = validateStep(stepKey, stepData[stepKey]);
      if (!result.success) {
        setClientErrors((prev) => ({ ...prev, [stepKey]: result.errors }));
        const firstField = Object.keys(result.errors)[0];
        if (firstField) {
          const input = document.querySelector<HTMLInputElement>(
            `[name="${firstField}"]`,
          );
          input?.focus();
        }
        return;
      }
    }
    // Condition / contact steps remain placeholder-gated for now;
    // S6–S7 replace these with their own validation gates.

    navigateToStep(STEP_SLUGS[idx + 1]);
  }, [currentStep, stepData, navigateToStep]);

  const currentErrors = useMemo(() => {
    const server = formState.ok === false ? formState.errors : undefined;
    const client = clientErrors[currentStep];
    if (!server && !client) return undefined;
    return { ...(server ?? {}), ...(client ?? {}) };
  }, [formState, clientErrors, currentStep]);

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
          className="rounded-md border border-[var(--color-error)] bg-[color:color-mix(in_srgb,var(--color-error)_5%,transparent)] px-4 py-3 text-[14px] leading-[20px] text-[var(--color-error)]"
        >
          We couldn&apos;t submit your form — please correct the fields marked
          below.
        </div>
      )}

      <StepDispatch
        step={currentStep}
        headingRef={headingRef}
        data={stepData}
        errors={currentErrors}
        onAddressChange={updateAddress}
        onPropertyChange={updateProperty}
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
        canAdvance={true}
        step={stepIndex(currentStep) + 1}
        total={STEP_SLUGS.length}
      />
    </form>
  );
}

type StepDispatchProps = {
  step: StepSlug;
  headingRef: React.Ref<HTMLHeadingElement>;
  data: StepDataMap;
  errors?: Record<string, string[]>;
  onAddressChange: (partial: Partial<AddressFields>) => void;
  onPropertyChange: (partial: Partial<PropertyFields>) => void;
};

function StepDispatch({
  step,
  headingRef,
  data,
  errors,
  onAddressChange,
  onPropertyChange,
}: StepDispatchProps) {
  switch (step) {
    case "address":
      return (
        <AddressStep
          data={data.address}
          errors={errors}
          onChange={onAddressChange}
          headingRef={headingRef}
        />
      );
    case "property":
      return (
        <PropertyStep
          data={data.property}
          errors={errors}
          onChange={onPropertyChange}
          headingRef={headingRef}
        />
      );
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

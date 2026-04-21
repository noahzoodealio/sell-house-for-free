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
import {
  trackFormAbandoned,
  trackFormSubmitted,
  trackStepCompleted,
  trackStepEntered,
} from "@/lib/seller-form/analytics";
import { captureAttribution } from "@/lib/seller-form/attribution";
import { clearDraft, readDraft, writeDraft } from "@/lib/seller-form/draft";
import { useIdempotencyKey } from "@/lib/seller-form/idempotency";
import { validateStep } from "@/lib/seller-form/schema";
import type {
  AddressFields,
  AttributionFields,
  ConditionFields,
  ConsentFields,
  ContactFields,
  PropertyFields,
  StepSlug,
  SubmitState,
} from "@/lib/seller-form/types";
import { STEP_SLUGS } from "@/lib/seller-form/types";
import { Progress } from "./progress";
import { StepNav } from "./step-nav";
import { AddressStep } from "./steps/address-step";
import { ConditionStep } from "./steps/condition-step";
import { ContactStep } from "./steps/contact-step";
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
  condition: Partial<ConditionFields>;
  contact: Partial<ContactFields>;
};

type DraftState = StepDataMap & {
  consent: Partial<ConsentFields>;
  submissionId?: string;
};

const EMPTY_DRAFT: DraftState = {
  address: {},
  property: {},
  condition: {},
  contact: {},
  consent: {},
};

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
    condition: (persisted.condition as Partial<ConditionFields>) ?? {},
    // contact & consent are PII-stripped by draft.ts on write; always empty on read.
    contact: {},
    consent: {},
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

  const [stepData, setStepData] = useState<StepDataMap>(() => {
    const d = readInitialDraft();
    return {
      address: d.address,
      property: d.property,
      condition: d.condition,
      contact: d.contact,
    };
  });
  const [consent, setConsent] = useState<Partial<ConsentFields>>(() => {
    const d = readInitialDraft();
    return d.consent;
  });
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
    // Fire step_entered on first mount for the initial step.
    trackStepEntered(currentStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next = currentStep;
    const prev = prevStepRef.current;
    if (prev !== next) {
      trackStepCompleted(prev);
      trackStepEntered(next);
      if (onStepChange) onStepChange(prev, next);
      headingRef.current?.focus();
      prevStepRef.current = next;
    }
  }, [currentStep, onStepChange]);

  useEffect(() => {
    // Abandonment: fire once on pagehide / tab-hidden, via sendBeacon so it
    // survives navigation teardown (plain track() doesn't guarantee delivery
    // from these lifecycle events).
    let fired = false;
    const onTeardown = () => {
      if (fired) return;
      if (formState.ok && formState.submissionId) return; // submitted, not abandoned
      fired = true;
      const stepNow = prevStepRef.current;
      trackFormAbandoned(stepNow);
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        try {
          const payload = JSON.stringify({
            event: "seller_form_abandoned",
            step: stepNow,
          });
          navigator.sendBeacon(
            "/api/submit",
            new Blob([payload], { type: "application/json" }),
          );
        } catch {
          // best-effort.
        }
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onTeardown();
    };
    window.addEventListener("pagehide", onTeardown);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onTeardown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [formState]);

  useEffect(() => {
    if (formState.ok && formState.submissionId) {
      trackFormSubmitted(formState.submissionId);
      // The Server Action `redirect()` normally fires first; this is a
      // back-cache / blocked-navigation safety net.
      clearDraft();
    }
  }, [formState]);

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
            condition: ConditionFields;
            contact: ContactFields;
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
  const updateCondition = useMemo(() => makeStepUpdater("condition"), [makeStepUpdater]);
  const updateContact = useMemo(() => makeStepUpdater("contact"), [makeStepUpdater]);

  const updateConsent = useCallback((partial: Partial<ConsentFields>) => {
    setConsent((prev) => ({ ...prev, ...partial }));
    // Consent is deliberately NOT persisted to draft (PII-strip rule).
    setClientErrors((prev) => {
      const current = prev.contact ?? {};
      const next = { ...current };
      let changed = false;
      for (const key of Object.keys(partial)) {
        if (next[key]) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? { ...prev, contact: next } : prev;
    });
  }, []);

  const onBack = useCallback(() => {
    const idx = stepIndex(currentStep);
    if (idx <= 0) return;
    navigateToStep(STEP_SLUGS[idx - 1]);
  }, [currentStep, navigateToStep]);

  const onNext = useCallback(() => {
    const idx = stepIndex(currentStep);
    if (idx >= STEP_SLUGS.length - 1) return;

    const result = validateStep(currentStep, stepData[currentStep]);
    if (!result.success) {
      setClientErrors((prev) => ({ ...prev, [currentStep]: result.errors }));
      const firstField = Object.keys(result.errors)[0];
      if (firstField) {
        const input = document.querySelector<HTMLInputElement>(
          `[name="${firstField}"]`,
        );
        input?.focus();
      }
      return;
    }
    // On the contact step, we additionally require all three consents.
    if (currentStep === "contact") {
      const consentErrors: Record<string, string[]> = {};
      const keys: Array<keyof ConsentFields> = ["tcpa", "terms", "privacy"];
      for (const k of keys) {
        if (!consent[k]?.acceptedAt) {
          consentErrors[k] = ["You must check this box to continue"];
        }
      }
      if (Object.keys(consentErrors).length > 0) {
        setClientErrors((prev) => ({
          ...prev,
          contact: { ...(prev.contact ?? {}), ...consentErrors },
        }));
        return;
      }
    }

    navigateToStep(STEP_SLUGS[idx + 1]);
  }, [currentStep, stepData, consent, navigateToStep]);

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
        consent={consent}
        onAddressChange={updateAddress}
        onPropertyChange={updateProperty}
        onConditionChange={updateCondition}
        onContactChange={updateContact}
        onConsentChange={updateConsent}
      />

      <HiddenField name="step" value={currentStep} />
      <HiddenField name="submissionId" value={submissionId} />
      <HiddenField name="idempotencyKey" value={idempotencyKey ?? ""} />
      <HiddenField name="attribution" value={JSON.stringify(attribution)} />
      <HiddenField name="draftJson" value={JSON.stringify(stepData)} />
      <HiddenField name="consentJson" value={JSON.stringify(consent)} />
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
  consent: Partial<ConsentFields>;
  errors?: Record<string, string[]>;
  onAddressChange: (partial: Partial<AddressFields>) => void;
  onPropertyChange: (partial: Partial<PropertyFields>) => void;
  onConditionChange: (partial: Partial<ConditionFields>) => void;
  onContactChange: (partial: Partial<ContactFields>) => void;
  onConsentChange: (partial: Partial<ConsentFields>) => void;
};

function StepDispatch({
  step,
  headingRef,
  data,
  consent,
  errors,
  onAddressChange,
  onPropertyChange,
  onConditionChange,
  onContactChange,
  onConsentChange,
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
      return (
        <ConditionStep
          data={data.condition}
          errors={errors}
          onChange={onConditionChange}
          headingRef={headingRef}
        />
      );
    case "contact":
      return (
        <ContactStep
          data={data.contact}
          consent={consent}
          errors={errors}
          onChange={onContactChange}
          onConsentChange={onConsentChange}
          headingRef={headingRef}
        />
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

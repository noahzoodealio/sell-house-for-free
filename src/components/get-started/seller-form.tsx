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
import Link from "next/link";
import { useFormStatus } from "react-dom";
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
import { addressStepSchema, validateStep } from "@/lib/seller-form/schema";
import { useAddressEnrichment } from "@/lib/enrichment/use-address-enrichment";
import type {
  AddressFields,
  AttributionFields,
  ConditionFields,
  ConsentFields,
  ContactFields,
  CurrentListingStatus,
  HasAgent,
  PillarSlug,
  PropertyFields,
  StepSlug,
  SubmitState,
} from "@/lib/seller-form/types";
import { STEP_SLUGS } from "@/lib/seller-form/types";
import { DraftRecoveryBanner } from "./draft-recovery-banner";
import { AddressStep } from "./steps/address-step";
import { PropertyStep } from "./steps/property-step";
import { MlsStep } from "./steps/mls-step";
import { ConditionStep } from "./steps/condition-step";
import { ContactStep } from "./steps/contact-step";
import {
  ACTIVE_STATUS_RAW_KEYS,
  canonicalizeStatus,
} from "@/lib/enrichment/normalize";

export { PILLAR_SLUGS, STEP_SLUGS } from "@/lib/seller-form/types";
export type { PillarSlug, StepSlug } from "@/lib/seller-form/types";

export type SellerFormProps = {
  initialHints?: { pillar?: PillarSlug; city?: AzCitySlug };
  initialStep?: StepSlug;
  onStepChange?: (from: StepSlug, to: StepSlug) => void;
};

const STEP_LABEL_BY_SLUG: Record<StepSlug, string> = {
  address: "Address",
  property: "Property facts",
  mls: "MLS check",
  condition: "Condition & timeline",
  contact: "Contact & consent",
};

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

function stepBySlug(slug: string | null | undefined): StepSlug {
  if (slug && (STEP_SLUGS as readonly string[]).includes(slug)) {
    return slug as StepSlug;
  }
  return "address";
}

function readAddressFromUrl(): Partial<AddressFields> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);

  const structured: Partial<AddressFields> = {};
  const street1 = params.get("street1")?.trim();
  const street2 = params.get("street2")?.trim();
  const city = params.get("city")?.trim();
  const state = params.get("state")?.trim();
  const zip = params.get("zip")?.trim();
  if (street1) structured.street1 = street1;
  if (street2) structured.street2 = street2;
  if (city) structured.city = city;
  if (state === "AZ") structured.state = state;
  if (zip && /^\d{5}$/.test(zip)) structured.zip = zip;
  if (Object.keys(structured).length > 0) return structured;

  // Fallback: parse formatted-address from `?address=` (typed entries, no Places).
  const formatted = params.get("address")?.trim();
  if (!formatted) return {};
  const match = formatted.match(
    /^(.+?),\s*(.+?),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?(?:,\s*USA)?$/,
  );
  if (!match) return {};
  const [, s1, parsedCity, parsedState, parsedZip] = match;
  const out: Partial<AddressFields> = {
    street1: s1.trim(),
    city: parsedCity.trim(),
    zip: parsedZip,
  };
  if (parsedState === "AZ") out.state = parsedState;
  return out;
}

function readInitialDraft(): DraftState {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  const persisted = readDraft();
  const urlAddress = readAddressFromUrl();
  if (!persisted) {
    return { ...EMPTY_DRAFT, address: urlAddress };
  }
  return {
    submissionId: persisted.submissionId,
    address:
      Object.keys(urlAddress).length > 0
        ? urlAddress
        : (persisted.address as Partial<AddressFields>) ?? {},
    property: (persisted.property as Partial<PropertyFields>) ?? {},
    condition: (persisted.condition as Partial<ConditionFields>) ?? {},
    contact: {},
    consent: {},
  };
}

const EMPTY_SUBSCRIBE = () => () => {};
const EMPTY_ATTRIBUTION: AttributionFields = {};
const getEmptyAttribution = (): AttributionFields => EMPTY_ATTRIBUTION;

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
  return useSyncExternalStore(
    EMPTY_SUBSCRIBE,
    captureAttribution,
    getEmptyAttribution,
  );
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

  const [stepData, setStepData] = useState<StepDataMap>(() => ({
    address: {},
    property: {},
    condition: {},
    contact: {},
  }));
  const [consent, setConsent] = useState<Partial<ConsentFields>>({});
  const [showDraftBanner, setShowDraftBanner] = useState<boolean>(false);
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<StepSlug, Record<string, string[]>>>
  >({});
  const [listedReason, setListedReason] = useState<CurrentListingStatus | undefined>(
    undefined,
  );
  const [hasAgent, setHasAgent] = useState<HasAgent | undefined>(undefined);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const prevStepRef = useRef<StepSlug>(currentStep);
  const liveRegionId = useId();
  const [pendingAutoAdvance, setPendingAutoAdvance] = useState<boolean>(false);

  const completeAddress = useMemo(() => {
    const parsed = addressStepSchema.safeParse(stepData.address);
    return parsed.success ? parsed.data : null;
  }, [stepData.address]);

  const enrichment = useAddressEnrichment(completeAddress, submissionId);
  const enrichmentSlot =
    enrichment.status === "ok" ? enrichment.slot : undefined;
  const isMultiUnit = enrichmentSlot?.isMultiUnit === true;

  const hasActiveMlsMatch = useMemo(() => {
    if (!enrichmentSlot?.mlsRecordId) return false;
    const canonical = canonicalizeStatus(enrichmentSlot.rawListingStatus);
    return ACTIVE_STATUS_RAW_KEYS.has(canonical);
  }, [enrichmentSlot]);

  const visible = STEP_SLUGS;

  const visibleIdx = visible.indexOf(currentStep);

  const liveMessage = useMemo(() => {
    if (formState.ok === false) {
      const count = Object.keys(formState.errors).length;
      return `We couldn't submit your form — please correct the ${count} field${
        count === 1 ? "" : "s"
      } marked below.`;
    }
    const idx = Math.max(visibleIdx, 0);
    const label = STEP_LABEL_BY_SLUG[currentStep];
    return `Step ${idx + 1} of ${visible.length}: ${label}`;
  }, [currentStep, formState, visible.length, visibleIdx]);

  useEffect(() => {
    trackStepEntered(currentStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const d = readInitialDraft();
    const hadDraft =
      Object.keys(d.address).length > 0 ||
      Object.keys(d.property).length > 0 ||
      Object.keys(d.condition).length > 0;
    setStepData({
      address: d.address,
      property: d.property,
      condition: d.condition,
      contact: d.contact,
    });
    setConsent(d.consent);
    const urlAddress = readAddressFromUrl();
    const seededFromUrl = Object.keys(urlAddress).length > 0;
    setShowDraftBanner(hadDraft && !seededFromUrl);

    if (!seededFromUrl) return;

    writeDraft({ address: urlAddress } as { address: AddressFields });

    const params = new URLSearchParams(searchParams.toString());
    for (const k of ["address", "placeId", "street1", "street2", "city", "state", "zip"]) {
      params.delete(k);
    }

    const complete = validateStep("address", urlAddress).success;
    if (complete && currentStep === "address") {
      setPendingAutoAdvance(true);
    }

    const qs = params.toString();
    router.replace(
      `${window.location.pathname}${qs ? `?${qs}` : ""}`,
      { scroll: false },
    );
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
    let fired = false;
    const onTeardown = () => {
      if (fired) return;
      if (formState.ok && formState.submissionId) return;
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
      trackFormSubmitted(formState.submissionId, hasAgent);
      clearDraft();
    }
  }, [formState, hasAgent]);

  const navigateToStep = useCallback(
    (next: StepSlug) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    // Auto-advance for URL-seeded entries (landing-bar submit). Always jumps to
    // property — MLS check is deferred until after the seller eyeballs the
    // ATTOM-autofilled facts.
    if (!pendingAutoAdvance) return;
    const settled =
      enrichment.status !== "idle" && enrichment.status !== "loading";
    if (settled) {
      navigateToStep("property");
      setPendingAutoAdvance(false);
      return;
    }
    const timer = setTimeout(() => {
      navigateToStep("property");
      setPendingAutoAdvance(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [pendingAutoAdvance, enrichment.status, navigateToStep]);

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
    if (visibleIdx <= 0) return;
    navigateToStep(visible[visibleIdx - 1]);
  }, [navigateToStep, visible, visibleIdx]);

  const canAdvance = useMemo(() => {
    if (currentStep === "mls") {
      // Active MLS match requires a claim-intent pick; no-match requires the
      // seller to acknowledge they're clear to list. `listedReason` carries
      // both in-session — exploring / second-opinion / ready-to-switch for
      // active matches, or is left undefined with a separate "confirmed" flag.
      if (hasActiveMlsMatch) return listedReason !== undefined;
      return mlsAcknowledged;
    }
    return true;
  // mlsAcknowledged is declared below — safe because this memo re-runs on its change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, hasActiveMlsMatch, listedReason]);

  const [mlsAcknowledged, setMlsAcknowledged] = useState(false);

  useEffect(() => {
    // Reset the acknowledgement whenever the seller leaves the MLS step, so
    // re-entering always forces a fresh tap.
    if (currentStep !== "mls") setMlsAcknowledged(false);
  }, [currentStep]);

  const onNext = useCallback(() => {
    if (visibleIdx < 0 || visibleIdx >= visible.length - 1) return;

    if (currentStep !== "mls") {
      const result = validateStep(
        currentStep,
        stepData[currentStep as keyof StepDataMap],
      );
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
    }
    if (currentStep === "address" && isMultiUnit) {
      const street2 = stepData.address.street2?.trim() ?? "";
      if (street2.length === 0) {
        setClientErrors((prev) => ({
          ...prev,
          address: {
            ...(prev.address ?? {}),
            street2: [
              "Please enter your apt/unit number — this address is part of a multi-unit building.",
            ],
          },
        }));
        const input = document.querySelector<HTMLInputElement>(
          `[name="street2"]`,
        );
        input?.focus();
        return;
      }
    }
    if (currentStep === "mls" && !canAdvance) return;
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

    navigateToStep(visible[visibleIdx + 1]);
  }, [
    currentStep,
    stepData,
    consent,
    navigateToStep,
    isMultiUnit,
    visible,
    visibleIdx,
    canAdvance,
  ]);

  const currentErrors = useMemo(() => {
    const server = formState.ok === false ? formState.errors : undefined;
    const client = clientErrors[currentStep];
    if (!server && !client) return undefined;
    return { ...(server ?? {}), ...(client ?? {}) };
  }, [formState, clientErrors, currentStep]);

  const hasErrors =
    formState.ok === false && Object.keys(formState.errors).length > 0;

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setStepData({ address: {}, property: {}, condition: {}, contact: {} });
    setConsent({});
    setClientErrors({});
    setShowDraftBanner(false);
  }, []);

  const progressPct = Math.round(
    ((Math.max(visibleIdx, 0) + 1) / visible.length) * 100,
  );
  const isFinalStep = visibleIdx === visible.length - 1;

  return (
    <form action={formAction} className="sellfree-flow" noValidate>
      <div className="flow-head">
        <Link href="/" className="wordmark" aria-label="sellfree.ai — home">
          <span className="dot">sellfree</span>
          <span className="ai">.ai</span>
        </Link>
        <div className="flow-progress" aria-hidden="true">
          <div className="flow-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="flow-step-n">
          {Math.max(visibleIdx, 0) + 1} / {visible.length}
        </span>
        <Link href="/" className="flow-close" aria-label="Close and return home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
      </div>

      <div className="flow-body">
        <div
          id={liveRegionId}
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {liveMessage}
        </div>

        {showDraftBanner && (
          <DraftRecoveryBanner
            onDismiss={() => setShowDraftBanner(false)}
            onDiscard={handleDiscardDraft}
          />
        )}

        {hasErrors && (
          <div role="alert" className="error-banner">
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
          enrichmentStatus={enrichment.status}
          enrichmentSlot={enrichmentSlot}
          isMultiUnit={isMultiUnit}
          hasActiveMlsMatch={hasActiveMlsMatch}
          listedReason={listedReason}
          onListedReasonChange={setListedReason}
          hasAgent={hasAgent}
          onHasAgentChange={setHasAgent}
          mlsAcknowledged={mlsAcknowledged}
          onMlsAcknowledge={() => setMlsAcknowledged(true)}
        />

        <HiddenField name="step" value={currentStep} />
        <HiddenField name="submissionId" value={submissionId} />
        <HiddenField name="idempotencyKey" value={idempotencyKey ?? ""} />
        <HiddenField name="attribution" value={JSON.stringify(attribution)} />
        <HiddenField name="draftJson" value={JSON.stringify(stepData)} />
        <HiddenField name="consentJson" value={JSON.stringify(consent)} />
        {listedReason && (
          <HiddenField name="currentListingStatus" value={listedReason} />
        )}
        {hasAgent && <HiddenField name="hasAgent" value={hasAgent} />}
        {initialHints?.pillar && (
          <HiddenField name="pillarHint" value={initialHints.pillar} />
        )}
        {initialHints?.city && (
          <HiddenField name="cityHint" value={initialHints.city} />
        )}
      </div>

      <div className="flow-foot">
        <div className="flow-foot-inner">
          <button
            type="button"
            className={"flow-back" + (visibleIdx === 0 ? " hidden" : "")}
            onClick={onBack}
            disabled={visibleIdx === 0}
          >
            ← Back
          </button>
          {isFinalStep ? (
            <SubmitButton />
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNext}
              aria-disabled={currentStep === "mls" && !canAdvance}
              disabled={currentStep === "mls" && !canAdvance}
            >
              Continue
              <ArrowRightIcon />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? "Submitting…" : "Submit"}
      <ArrowRightIcon />
    </button>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
  enrichmentStatus: ReturnType<typeof useAddressEnrichment>["status"];
  enrichmentSlot: import("@/lib/seller-form/types").EnrichmentSlot | undefined;
  isMultiUnit: boolean;
  hasActiveMlsMatch: boolean;
  listedReason: CurrentListingStatus | undefined;
  onListedReasonChange: (reason: CurrentListingStatus) => void;
  hasAgent: HasAgent | undefined;
  onHasAgentChange: (value: HasAgent) => void;
  mlsAcknowledged: boolean;
  onMlsAcknowledge: () => void;
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
  enrichmentStatus,
  enrichmentSlot,
  isMultiUnit,
  hasActiveMlsMatch,
  listedReason,
  onListedReasonChange,
  hasAgent,
  onHasAgentChange,
  mlsAcknowledged,
  onMlsAcknowledge,
}: StepDispatchProps) {
  switch (step) {
    case "address":
      return (
        <AddressStep
          data={data.address}
          errors={errors}
          onChange={onAddressChange}
          headingRef={headingRef}
          enrichmentStatus={enrichmentStatus}
          isMultiUnit={isMultiUnit}
        />
      );
    case "property":
      return (
        <PropertyStep
          data={data.property}
          errors={errors}
          onChange={onPropertyChange}
          headingRef={headingRef}
          enrichmentSlot={enrichmentSlot}
          address={data.address}
        />
      );
    case "mls":
      return (
        <MlsStep
          headingRef={headingRef}
          enrichmentStatus={enrichmentStatus}
          enrichmentSlot={enrichmentSlot}
          hasActiveMlsMatch={hasActiveMlsMatch}
          address={data.address}
          listedReason={listedReason}
          onListedReasonChange={onListedReasonChange}
          hasAgent={hasAgent}
          onHasAgentChange={onHasAgentChange}
          acknowledged={mlsAcknowledged}
          onAcknowledge={onMlsAcknowledge}
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

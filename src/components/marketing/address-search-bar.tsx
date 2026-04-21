"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const SCRIPT_SRC = GOOGLE_API_KEY
  ? `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&v=weekly`
  : "";

export type AddressSearchBarProps = {
  /** Where to route on submit. Address + placeId are appended as query params. */
  destination?: string;
  buttonLabel?: string;
  placeholder?: string;
  /** Two-letter country code(s). Defaults to US. */
  country?: string | readonly string[];
  className?: string;
};

type MapsNamespace = {
  maps?: {
    places?: {
      Autocomplete?: new (
        el: HTMLInputElement,
        opts: Record<string, unknown>,
      ) => {
        addListener: (
          event: string,
          cb: () => void,
        ) => { remove?: () => void };
        getPlace: () => {
          formatted_address?: string;
          place_id?: string;
        } | null;
      };
    };
    event?: {
      removeListener: (l: { remove?: () => void }) => void;
    };
  };
};

function PinIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-5 text-ink-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 18s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z" />
      <circle cx="10" cy="8" r="2.25" />
    </svg>
  );
}

export function AddressSearchBar({
  destination = "/get-started",
  buttonLabel = "Get my cash offer",
  placeholder = "Enter your home address",
  country = "us",
  className,
}: AddressSearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [scriptReady, setScriptReady] = useState(
    typeof window !== "undefined" &&
      Boolean((window as unknown as { google?: MapsNamespace }).google?.maps),
  );
  const selectedRef = useRef<{ address: string; placeId?: string } | null>(
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (!scriptReady || !inputRef.current) return;
    const g = (window as unknown as { google?: MapsNamespace }).google;
    const Autocomplete = g?.maps?.places?.Autocomplete;
    if (!Autocomplete) return;

    const autocomplete = new Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: {
        country: Array.isArray(country) ? [...country] : country,
      },
      fields: ["formatted_address", "place_id", "address_components"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const formatted = place?.formatted_address ?? "";
      const placeId = place?.place_id;
      if (formatted && inputRef.current) {
        inputRef.current.value = formatted;
        selectedRef.current = { address: formatted, placeId };
      }
    });

    return () => {
      g?.maps?.event?.removeListener(listener);
    };
  }, [scriptReady, country]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const typed = inputRef.current?.value?.trim() ?? "";
      const selected = selectedRef.current;
      const address = selected?.address ?? typed;
      if (!address) {
        inputRef.current?.focus();
        return;
      }
      const params = new URLSearchParams({ address });
      if (selected?.placeId) params.set("placeId", selected.placeId);
      router.push(`${destination}?${params.toString()}`);
    },
    [router, destination],
  );

  return (
    <>
      {SCRIPT_SRC ? (
        <Script
          id="google-maps-places"
          src={SCRIPT_SRC}
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
          onLoad={() => setScriptReady(true)}
        />
      ) : null}
      <form
        onSubmit={handleSubmit}
        className={cn("w-full max-w-[560px]", className)}
        role="search"
        aria-label="Get a cash offer by entering your home address"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0 sm:rounded-[14px] sm:bg-surface sm:p-1.5 sm:shadow-[var(--shadow-card)] sm:border sm:border-border-soft">
          <div className="flex items-center gap-2 rounded-xl border border-border-soft bg-surface px-4 py-3 sm:flex-1 sm:border-0 sm:py-0 sm:px-3">
            <PinIcon />
            <input
              ref={inputRef}
              type="search"
              name="address"
              autoComplete="off"
              required
              placeholder={placeholder}
              aria-label="Home address"
              className="w-full bg-transparent text-[16px] text-ink-title placeholder:text-ink-muted focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className={cn(
              "inline-flex items-center justify-center rounded-xl font-semibold font-[var(--font-inter)]",
              "bg-brand text-brand-foreground transition-colors hover:bg-[#084fb8] active:bg-[#063f90]",
              "h-[52px] px-6 text-[16px] shadow-[var(--shadow-card)] sm:shadow-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            {buttonLabel}
          </button>
        </div>
        {!GOOGLE_API_KEY ? (
          <p className="mt-2 text-[12px] text-ink-muted">
            Address autocomplete is temporarily unavailable — you can still
            enter an address to continue.
          </p>
        ) : null}
      </form>
    </>
  );
}

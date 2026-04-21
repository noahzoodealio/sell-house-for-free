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
  destination?: string;
  buttonLabel?: string;
  placeholder?: string;
  /** Two-letter country code(s). Defaults to US. */
  country?: string | readonly string[];
  className?: string;
};

type AddressComponent = {
  short_name?: string;
  long_name?: string;
  types?: string[];
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
          address_components?: AddressComponent[];
        } | null;
      };
    };
    event?: {
      removeListener: (l: { remove?: () => void }) => void;
    };
  };
};

type ParsedAddress = {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
};

function parseComponents(
  components: AddressComponent[] | undefined,
): ParsedAddress {
  if (!components) return {};
  const get = (type: string, which: "short" | "long" = "long") =>
    components.find((c) => c.types?.includes(type))?.[
      which === "short" ? "short_name" : "long_name"
    ];

  const streetNumber = get("street_number");
  const route = get("route");
  const street1 = [streetNumber, route].filter(Boolean).join(" ") || undefined;
  const street2 = get("subpremise");
  const city =
    get("locality") ?? get("sublocality_level_1") ?? get("postal_town");
  const state = get("administrative_area_level_1", "short");
  const zip = get("postal_code");

  return { street1, street2, city, state, zip };
}

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
  const router = useRouter();
  const navigatedRef = useRef(false);

  const navigate = useCallback(
    (address: string, placeId?: string, parsed?: ParsedAddress) => {
      if (navigatedRef.current) return;
      const trimmed = address.trim();
      if (!trimmed) return;
      navigatedRef.current = true;
      const params = new URLSearchParams({ address: trimmed });
      if (placeId) params.set("placeId", placeId);
      if (parsed?.street1) params.set("street1", parsed.street1);
      if (parsed?.street2) params.set("street2", parsed.street2);
      if (parsed?.city) params.set("city", parsed.city);
      if (parsed?.state) params.set("state", parsed.state);
      if (parsed?.zip) params.set("zip", parsed.zip);
      router.push(`${destination}?${params.toString()}`);
    },
    [router, destination],
  );

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
      if (!formatted) return;
      if (inputRef.current) inputRef.current.value = formatted;
      navigate(formatted, placeId, parseComponents(place?.address_components));
    });

    return () => {
      g?.maps?.event?.removeListener(listener);
    };
  }, [scriptReady, country, navigate]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const typed = inputRef.current?.value?.trim() ?? "";
      if (!typed) {
        inputRef.current?.focus();
        return;
      }
      navigate(typed);
    },
    [navigate],
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
        className={cn("w-full max-w-[640px]", className)}
        role="search"
        aria-label="Get a cash offer by entering your home address"
      >
        <div
          className={cn(
            "group flex flex-col gap-2 sm:gap-0",
            "sm:flex-row sm:items-center",
            "sm:h-[64px] sm:rounded-full sm:bg-surface sm:pl-5 sm:pr-1.5",
            "sm:shadow-[var(--shadow-card)] sm:border sm:border-border-soft",
            "sm:focus-within:border-brand sm:focus-within:shadow-[0_0_0_4px_#0653ab1f,var(--shadow-card)]",
            "transition-[box-shadow,border-color] duration-150",
          )}
        >
          <label
            htmlFor="home-address"
            className="flex items-center gap-3 rounded-full border border-border-soft bg-surface px-5 h-[60px] sm:h-full sm:flex-1 sm:border-0 sm:bg-transparent sm:px-0 sm:rounded-none"
          >
            <PinIcon />
            <input
              id="home-address"
              ref={inputRef}
              type="search"
              name="address"
              autoComplete="off"
              required
              placeholder={placeholder}
              aria-label="Home address"
              className="w-full bg-transparent text-[17px] leading-none text-ink-title placeholder:text-ink-muted focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className={cn(
              "inline-flex items-center justify-center gap-2",
              "rounded-full font-semibold font-[var(--font-inter)]",
              "bg-brand text-brand-foreground transition-colors hover:bg-[#084fb8] active:bg-[#063f90]",
              "h-[56px] px-7 text-[16px]",
              "shadow-[var(--shadow-card)] sm:shadow-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            {buttonLabel}
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 10h12" />
              <path d="M11 5l5 5-5 5" />
            </svg>
          </button>
        </div>
        <p className="mt-3 text-[13px] text-ink-muted">
          Free, no-obligation. Takes under 2 minutes.
          {!GOOGLE_API_KEY ? (
            <>
              {" "}
              <span className="text-ink-title">
                Autocomplete is temporarily unavailable, type your address and
                continue.
              </span>
            </>
          ) : null}
        </p>
      </form>
    </>
  );
}

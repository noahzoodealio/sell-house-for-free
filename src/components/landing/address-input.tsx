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

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const SCRIPT_SRC = GOOGLE_API_KEY
  ? `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&v=weekly`
  : "";

type AddressComponent = {
  short_name?: string;
  long_name?: string;
  types?: string[];
};

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type AutocompleteServiceInstance = {
  getPlacePredictions: (
    req: {
      input: string;
      types?: string[];
      componentRestrictions?: { country?: string | string[] };
      sessionToken?: unknown;
    },
    cb: (preds: Prediction[] | null, status: string) => void,
  ) => void;
};

type AutocompleteServiceCtor = new () => AutocompleteServiceInstance;

type PlacesServiceInstance = {
  getDetails: (
    req: { placeId: string; fields: string[]; sessionToken?: unknown },
    cb: (
      place: {
        formatted_address?: string;
        place_id?: string;
        address_components?: AddressComponent[];
      } | null,
      status: string,
    ) => void,
  ) => void;
};

type PlacesServiceCtor = new (
  attrContainer: HTMLElement | null,
) => PlacesServiceInstance;

type MapsNamespace = {
  maps?: {
    places?: {
      AutocompleteService?: AutocompleteServiceCtor;
      PlacesService?: PlacesServiceCtor;
      AutocompleteSessionToken?: new () => unknown;
      PlacesServiceStatus?: { OK: string };
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

const SAMPLE_ADDRESSES: PickItem[] = [
  { main: "1429 Maple Grove Lane", secondary: "Austin, TX 78704" },
  { main: "1429 Maple Street", secondary: "Denver, CO 80205" },
  { main: "1429 Maple Ave", secondary: "Brooklyn, NY 11201" },
  { main: "1429 Maplewood Dr", secondary: "Nashville, TN 37215" },
];

type PickItem = {
  /** Google place_id when the suggestion came from the Places API. */
  placeId?: string;
  main: string;
  secondary: string;
};

export type LandingAddressInputProps = {
  destination?: string;
  buttonLabel?: string;
  placeholder?: string;
  /** Optional callback, fires when a suggestion is picked so the hero estimate can react. */
  onReveal?: (a: PickItem) => void;
  buttonClassName?: string;
};

function PinIcon() {
  return (
    <svg
      className="pin"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LandingAddressInput({
  destination = "/get-started",
  buttonLabel = "Get my estimate",
  placeholder = "Enter your property address",
  onReveal,
  buttonClassName,
}: LandingAddressInputProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const boxRef = useRef<HTMLFormElement | null>(null);
  const attrRef = useRef<HTMLDivElement | null>(null);
  const autoServiceRef = useRef<AutocompleteServiceInstance | null>(null);
  const placesServiceRef = useRef<PlacesServiceInstance | null>(null);
  const sessionTokenRef = useRef<unknown>(null);
  const navigatedRef = useRef(false);

  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [predictions, setPredictions] = useState<PickItem[]>([]);
  const [scriptReady, setScriptReady] = useState(
    typeof window !== "undefined" &&
      Boolean((window as unknown as { google?: MapsNamespace }).google?.maps),
  );

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

  // Initialise the headless Places services once the script is ready.
  useEffect(() => {
    if (!scriptReady) return;
    const g = (window as unknown as { google?: MapsNamespace }).google;
    const places = g?.maps?.places;
    if (!places?.AutocompleteService || !places?.PlacesService) return;
    autoServiceRef.current = new places.AutocompleteService();
    placesServiceRef.current = new places.PlacesService(attrRef.current);
    if (places.AutocompleteSessionToken) {
      sessionTokenRef.current = new places.AutocompleteSessionToken();
    }
  }, [scriptReady]);

  // Fetch predictions when the query changes.
  useEffect(() => {
    const input = q.trim();
    if (!autoServiceRef.current || input.length < 2) {
      setPredictions([]);
      return;
    }
    let cancelled = false;
    autoServiceRef.current.getPlacePredictions(
      {
        input,
        types: ["address"],
        componentRestrictions: { country: "us" },
        sessionToken: sessionTokenRef.current,
      },
      (preds, _status) => {
        if (cancelled) return;
        const mapped: PickItem[] = (preds ?? []).slice(0, 5).map((p) => ({
          placeId: p.place_id,
          main: p.structured_formatting?.main_text ?? p.description,
          secondary: p.structured_formatting?.secondary_text ?? "",
        }));
        setPredictions(mapped);
        setActive(0);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [q]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const placesActive =
    scriptReady && Boolean(SCRIPT_SRC) && autoServiceRef.current !== null;

  // When Places is wired, use its predictions. Otherwise fall back to the
  // curated sample list so the dropdown still has something to show.
  const suggestions: PickItem[] = placesActive
    ? predictions
    : q.length > 1
      ? SAMPLE_ADDRESSES.filter(
          (a) =>
            a.main.toLowerCase().includes(q.toLowerCase()) ||
            a.secondary.toLowerCase().includes(q.toLowerCase()),
        ).slice(0, 5)
      : SAMPLE_ADDRESSES.slice(0, 4);

  const pick = (item: PickItem) => {
    const full = `${item.main}${item.secondary ? ", " + item.secondary : ""}`;
    setQ(full);
    setFocused(false);
    setPredictions([]);
    if (onReveal) onReveal(item);

    if (item.placeId && placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        {
          placeId: item.placeId,
          fields: ["formatted_address", "place_id", "address_components"],
          sessionToken: sessionTokenRef.current,
        },
        (place, _status) => {
          const formatted = place?.formatted_address ?? full;
          navigate(
            formatted,
            place?.place_id ?? item.placeId,
            parseComponents(place?.address_components),
          );
        },
      );
      return;
    }

    navigate(full);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // If the dropdown has a highlighted match, prefer that.
    if (focused && suggestions[active]) {
      pick(suggestions[active]);
      return;
    }
    const typed = inputRef.current?.value?.trim() ?? "";
    if (!typed) {
      inputRef.current?.focus();
      return;
    }
    navigate(typed);
  };

  const showDropdown = focused && suggestions.length > 0;

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
      {/* Google PlacesService requires an attribution container element. */}
      <div ref={attrRef} aria-hidden="true" style={{ display: "none" }} />
      <form
        className="address-box"
        ref={boxRef}
        onSubmit={handleSubmit}
        role="search"
        aria-label="Get your estimate by entering your home address"
      >
        <PinIcon />
        <input
          ref={inputRef}
          type="search"
          name="address"
          autoComplete="off"
          required
          placeholder={placeholder}
          aria-label="Home address"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (!showDropdown) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, suggestions.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            }
            if (e.key === "Escape") {
              setFocused(false);
            }
          }}
        />
        <button type="submit" className={buttonClassName ?? "btn btn-lime"}>
          {buttonLabel}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 12h14m-6-6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {showDropdown ? (
          <div className="autocomplete" role="listbox">
            {suggestions.map((a, i) => (
              <button
                key={(a.placeId ?? "") + a.main + a.secondary}
                type="button"
                role="option"
                aria-selected={i === active}
                className={"autocomplete-item " + (i === active ? "active" : "")}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(a);
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ opacity: 0.5 }}
                  aria-hidden="true"
                >
                  <path
                    d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="12"
                    cy="9"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                <div>
                  <div style={{ fontWeight: 500 }}>{a.main}</div>
                  {a.secondary ? (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {a.secondary}
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </form>
    </>
  );
}

export type { PickItem as SampleAddress };

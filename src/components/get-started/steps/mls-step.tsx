"use client";

import type { Ref } from "react";
import type {
  AddressFields,
  CurrentListingStatus,
  EnrichmentSlot,
  HasAgent,
} from "@/lib/seller-form/types";
import type { EnrichmentHookStatus } from "@/lib/enrichment/use-address-enrichment";

type MlsStepProps = {
  headingRef: Ref<HTMLHeadingElement>;
  enrichmentStatus: EnrichmentHookStatus;
  enrichmentSlot: EnrichmentSlot | undefined;
  hasActiveMlsMatch: boolean;
  address: Partial<AddressFields>;
  listedReason: CurrentListingStatus | undefined;
  onListedReasonChange: (reason: CurrentListingStatus) => void;
  hasAgent: HasAgent | undefined;
  onHasAgentChange: (value: HasAgent) => void;
  acknowledged: boolean;
  onAcknowledge: () => void;
};

const CLAIM_CHIPS: ReadonlyArray<{ value: CurrentListingStatus; label: string }> = [
  { value: "second-opinion", label: "Yes — I want a second opinion" },
  { value: "ready-to-switch", label: "Yes — ready to switch to sellfree" },
  { value: "just-exploring", label: "Just exploring" },
];

const AGENT_CHIPS: ReadonlyArray<{ value: HasAgent; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not-sure", label: "Not sure" },
];

function formatDisplayAddress(address: Partial<AddressFields>): string {
  const parts: string[] = [];
  if (address.street1) parts.push(address.street1);
  if (address.street2) parts.push(address.street2);
  const cityStateZip = [address.city, address.state, address.zip]
    .filter(Boolean)
    .join(" ");
  if (cityStateZip) parts.push(cityStateZip);
  return parts.join(", ") || "Your property";
}

function formatListedDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatListPrice(price: number | undefined): string | undefined {
  if (!price) return undefined;
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2)}M`;
  if (price >= 1000) return `$${Math.round(price / 1000)}K`;
  return `$${price.toLocaleString()}`;
}

export function MlsStep({
  headingRef,
  enrichmentStatus,
  enrichmentSlot,
  hasActiveMlsMatch,
  address,
  listedReason,
  onListedReasonChange,
  hasAgent,
  onHasAgentChange,
  acknowledged,
  onAcknowledge,
}: MlsStepProps) {
  const displayAddr = formatDisplayAddress(address);
  const isChecking =
    enrichmentStatus === "loading" || enrichmentStatus === "idle";

  return (
    <div>
      <span className="eyebrow" style={{ marginBottom: 12 }}>
        Step 3 · MLS check
      </span>
      <h2 ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
        {isChecking
          ? "Checking the MLS…"
          : hasActiveMlsMatch
            ? "Found an active listing."
            : "No active listing found."}
      </h2>
      <p className="lede">
        {isChecking &&
          "Scanning MLS for this property. Takes a second."}
        {!isChecking &&
          hasActiveMlsMatch &&
          "Is this your listing? Confirm so we can pull in history and pick up where your last agent left off."}
        {!isChecking &&
          !hasActiveMlsMatch &&
          "Your home isn’t currently listed anywhere — you’re clear to list with sellfree.ai."}
      </p>

      {isChecking && (
        <div className="mls-checking">
          <div className="mls-blink" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="mls-sources">Querying MLS · ATTOM · public records</div>
        </div>
      )}

      {!isChecking && hasActiveMlsMatch && enrichmentSlot && (
        <>
          <MlsMatchCard slot={enrichmentSlot} displayAddr={displayAddr} />

          <div className="field">
            <label>Is this your home?</label>
            <div className="chip-group" role="radiogroup" aria-label="Claim this listing">
              {CLAIM_CHIPS.map((chip) => {
                const selected = listedReason === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={"chip" + (selected ? " selected" : "")}
                    onClick={() => onListedReasonChange(chip.value)}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {listedReason === "ready-to-switch" && (
            <div className="field">
              <label>Are you still working with an agent?</label>
              <div
                className="chip-group"
                role="radiogroup"
                aria-label="Agent involvement"
              >
                {AGENT_CHIPS.map((chip) => {
                  const selected = hasAgent === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={"chip" + (selected ? " selected" : "")}
                      onClick={() => onHasAgentChange(chip.value)}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!isChecking && !hasActiveMlsMatch && (
        <>
          <div className="ready-card">
            <div className="ready-check" aria-hidden="true">
              ✓
            </div>
            <div>
              <div className="title">Ready to list on the MLS</div>
              <div className="desc">No active listing history found.</div>
            </div>
          </div>
          <div className="field">
            <label>Confirm to continue</label>
            <div className="chip-group">
              <button
                type="button"
                className={"chip" + (acknowledged ? " selected" : "")}
                onClick={onAcknowledge}
              >
                Got it, let&apos;s continue
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MlsMatchCard({
  slot,
  displayAddr,
}: {
  slot: EnrichmentSlot;
  displayAddr: string;
}) {
  const hero = slot.photos?.[0]?.url;
  const listPrice = formatListPrice(slot.listPrice);
  const listedAt = formatListedDate(slot.listedAt);
  const dom = slot.daysOnMarket;
  const photosCount = slot.photosCount ?? slot.photos?.length;

  return (
    <div className="mls-card">
      <div
        className="mls-img"
        style={
          hero
            ? ({
                backgroundImage: `linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.45) 100%), url("${hero}")`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <span className="mls-status">
          Active{typeof dom === "number" ? ` · ${dom} days` : ""}
        </span>
        {typeof photosCount === "number" && (
          <span className="mls-img-meta">{photosCount} photos on file</span>
        )}
      </div>
      <div className="mls-body">
        <div className="mls-addr">{displayAddr}</div>
        <div className="mls-stats">
          {listedAt && <span>Listed {listedAt}</span>}
          {listedAt && listPrice && <span>·</span>}
          {listPrice && (
            <span>
              List price <strong style={{ color: "var(--ink)" }}>{listPrice}</strong>
            </span>
          )}
        </div>
        {slot.mlsRecordId && (
          <div className="mls-row">
            <span className="k">MLS #</span>
            <span className="v">{slot.mlsRecordId}</span>
          </div>
        )}
        {slot.listingStatusDisplay && (
          <div className="mls-row">
            <span className="k">Status</span>
            <span className="v" style={{ color: "var(--lime-deep)" }}>
              {slot.listingStatusDisplay}
            </span>
          </div>
        )}
        {typeof dom === "number" && (
          <div className="mls-row">
            <span className="k">Days on market</span>
            <span className="v">{dom}</span>
          </div>
        )}
      </div>
    </div>
  );
}

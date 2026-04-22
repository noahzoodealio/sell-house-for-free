"use client";

import { useMemo, useState, type Ref } from "react";
import type {
  AddressFields,
  CurrentListingStatus,
  EnrichmentSlot,
  HasAgent,
  PropertyFields,
} from "@/lib/seller-form/types";
import type { EnrichmentHookStatus } from "@/lib/enrichment/use-address-enrichment";

type MlsStepProps = {
  headingRef: Ref<HTMLHeadingElement>;
  enrichmentStatus: EnrichmentHookStatus;
  enrichmentSlot: EnrichmentSlot | undefined;
  address: Partial<AddressFields>;
  property: Partial<PropertyFields>;
  listedReason: CurrentListingStatus | undefined;
  onListedReasonChange: (reason: CurrentListingStatus) => void;
  hasAgent: HasAgent | undefined;
  onHasAgentChange: (value: HasAgent) => void;
};

// sellfree's Pro tier flat fee — see landing-page.tsx TIERS.pro.
const SELLFREE_PRO_FEE = 2999;
const TRADITIONAL_COMMISSION_PCT = 0.06;

const CLAIM_CHIPS: ReadonlyArray<{
  value: CurrentListingStatus;
  label: string;
}> = [
  { value: "second-opinion", label: "Yes, this is mine" },
  { value: "ready-to-switch", label: "Yes — switch me to sellfree" },
  { value: "just-exploring", label: "No, not my home" },
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

function formatShortDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLongDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortPrice(price: number | undefined): string | undefined {
  if (!price || !Number.isFinite(price)) return undefined;
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2)}M`;
  if (price >= 1000) return `$${Math.round(price / 1000)}K`;
  return `$${price.toLocaleString()}`;
}

function formatFullPrice(price: number | undefined): string | undefined {
  if (!price || !Number.isFinite(price)) return undefined;
  return `$${price.toLocaleString()}`;
}

function countPriceChanges(history: EnrichmentSlot["history"]): number {
  if (!history || history.length < 2) return 0;
  let changes = 0;
  for (let i = 1; i < history.length; i++) {
    const cur = history[i - 1].listPrice;
    const prev = history[i].listPrice;
    if (cur !== undefined && prev !== undefined && cur !== prev) changes++;
  }
  return changes;
}

type ActivityEntry = {
  event: string;
  detail?: React.ReactNode;
  date: string | undefined;
};

function buildActivity(history: EnrichmentSlot["history"]): ActivityEntry[] {
  if (!history || history.length === 0) return [];
  const out: ActivityEntry[] = [];
  for (let i = 0; i < history.length; i++) {
    const event = history[i];
    const older = history[i + 1];
    const date = formatShortDate(event.statusChangeDate);
    const price = event.listPrice;
    const prevPrice = older?.listPrice;

    const statusLower = event.status.toLowerCase();
    let title = event.status;
    let detail: React.ReactNode | undefined;

    if (
      prevPrice !== undefined &&
      price !== undefined &&
      prevPrice !== price &&
      (statusLower.includes("active") || statusLower.includes("price"))
    ) {
      title = price < prevPrice ? "Price reduced" : "Price increased";
      detail = (
        <>
          <span className="old">{formatShortPrice(prevPrice)}</span>
          <span className="arrow">→</span>
          <span className="new">{formatShortPrice(price)}</span>
        </>
      );
    } else if (statusLower.includes("active")) {
      title = older ? "Re-listed active" : "Listed active";
      if (price !== undefined) {
        detail = <>{formatShortPrice(price)} list price</>;
      }
    } else if (
      statusLower.includes("pending") ||
      statusLower.includes("under contract")
    ) {
      title = "Under contract";
    } else if (statusLower.includes("sold") || statusLower.includes("closed")) {
      title = "Sold";
      if (price !== undefined) {
        detail = <>{formatShortPrice(price)} sale price</>;
      }
    } else if (
      statusLower.includes("cancel") ||
      statusLower.includes("withdrawn") ||
      statusLower.includes("expired")
    ) {
      title = event.status;
    } else if (statusLower.includes("coming")) {
      title = "Coming soon";
    }

    out.push({ event: title, detail, date });
  }
  return out;
}

export function MlsStep({
  headingRef,
  enrichmentStatus,
  enrichmentSlot,
  address,
  property,
  listedReason,
  onListedReasonChange,
  hasAgent,
  onHasAgentChange,
}: MlsStepProps) {
  const displayAddr = formatDisplayAddress(address);
  const isChecking =
    enrichmentStatus === "loading" || enrichmentStatus === "idle";

  return (
    <div>
      <span className="eyebrow" style={{ marginBottom: 16, display: "block" }}>
        MLS check
      </span>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="flow-page-title"
        style={{ outline: "none" }}
      >
        {isChecking ? "Checking the MLS…" : "Found an active MLS listing."}
      </h2>
      <p className="flow-page-lede">
        {isChecking
          ? "Running your address against the MLS feed. One moment."
          : "Here’s what’s currently on the MLS — including price history and photos. Switch to sellfree to keep your commission."}
      </p>

      {isChecking && (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <div className="mls-blink" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="mls-sources">Querying MLS · RETS feed</div>
        </div>
      )}

      {!isChecking && enrichmentSlot && (
        <ActiveMatch
          slot={enrichmentSlot}
          displayAddr={displayAddr}
          property={property}
          listedReason={listedReason}
          onListedReasonChange={onListedReasonChange}
          hasAgent={hasAgent}
          onHasAgentChange={onHasAgentChange}
        />
      )}
    </div>
  );
}

type ActiveMatchProps = {
  slot: EnrichmentSlot;
  displayAddr: string;
  property: Partial<PropertyFields>;
  listedReason: CurrentListingStatus | undefined;
  onListedReasonChange: (reason: CurrentListingStatus) => void;
  hasAgent: HasAgent | undefined;
  onHasAgentChange: (value: HasAgent) => void;
};

function ActiveMatch({
  slot,
  displayAddr,
  property,
  listedReason,
  onListedReasonChange,
  hasAgent,
  onHasAgentChange,
}: ActiveMatchProps) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = slot.photos ?? [];
  const totalPhotos = slot.photosCount ?? photos.length;
  const currentPhoto = photos[photoIdx];

  const price = slot.listPrice;
  const prevPrice = slot.previousListPrice;
  const delta =
    price !== undefined && prevPrice !== undefined ? prevPrice - price : 0;
  const priceChanges = countPriceChanges(slot.history);
  const estCommission = price
    ? Math.round(price * TRADITIONAL_COMMISSION_PCT)
    : undefined;
  const savings =
    estCommission !== undefined
      ? Math.max(0, estCommission - SELLFREE_PRO_FEE)
      : undefined;

  const activity = useMemo(() => buildActivity(slot.history), [slot.history]);

  // Property meta — prefer seller-edited values, fall back to enrichment.
  const beds = property.bedrooms ?? slot.details?.bedrooms;
  const baths = property.bathrooms ?? slot.details?.bathrooms;
  const sqft = property.squareFootage ?? slot.details?.squareFootage;
  const lotSf = property.lotSize ?? slot.details?.lotSize;
  const lotLabel = (() => {
    if (!lotSf) return undefined;
    const acres = lotSf / 43560;
    if (acres >= 0.1) return `${acres.toFixed(2)} ac lot`;
    return `${lotSf.toLocaleString()} sqft lot`;
  })();

  // KPI strip — only Days on Market is in the MLS DTO. Conditionally render
  // extras as data becomes available, and adjust grid cols so one stat still
  // looks intentional.
  const kpis: Array<{ n: string; k: string }> = [];
  if (slot.daysOnMarket !== undefined) {
    kpis.push({ n: String(slot.daysOnMarket), k: "Days on market" });
  }
  if (priceChanges > 0) {
    kpis.push({ n: String(priceChanges), k: "Price changes" });
  }
  if (estCommission !== undefined) {
    kpis.push({
      n: formatShortPrice(estCommission) ?? "—",
      k: "Est. commission today",
    });
  }
  if (typeof totalPhotos === "number" && totalPhotos > 0) {
    kpis.push({ n: String(totalPhotos), k: "Photos on file" });
  }

  const hasPhotos = photos.length > 0;

  return (
    <div className="mls-listed-v2">
      {/* GALLERY */}
      <div className="mls-gallery">
        <div className="mls-gallery-hero">
          <span className="mls-status">● Active on MLS</span>
          {slot.mlsRecordId && (
            <span className="mls-gallery-id">MLS #{slot.mlsRecordId}</span>
          )}
          {hasPhotos && currentPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentPhoto.url} alt={currentPhoto.caption ?? ""} />
          )}
          {hasPhotos && (
            <>
              <button
                type="button"
                className="mls-gallery-nav prev"
                disabled={photoIdx === 0}
                aria-label="Previous photo"
                onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="mls-gallery-nav next"
                disabled={photoIdx >= photos.length - 1}
                aria-label="Next photo"
                onClick={() =>
                  setPhotoIdx((i) => Math.min(photos.length - 1, i + 1))
                }
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="mls-gallery-meta">
                <span>
                  Photo {photoIdx + 1} of {totalPhotos}
                </span>
                {currentPhoto?.caption && (
                  <>
                    <span>·</span>
                    <span>{currentPhoto.caption}</span>
                  </>
                )}
              </span>
            </>
          )}
        </div>
        {hasPhotos && (
          <Thumbnails
            photos={photos}
            total={totalPhotos}
            active={photoIdx}
            onSelect={setPhotoIdx}
          />
        )}
      </div>

      {/* HEAD */}
      <div className="mls-head-v2">
        <div>
          <div className="mls-addr-v2">{displayAddr}</div>
          <div className="mls-spec-v2">
            {beds && (
              <span>
                <strong>{beds}</strong> bd
              </span>
            )}
            {beds && baths && <span>·</span>}
            {baths && (
              <span>
                <strong>{baths}</strong> ba
              </span>
            )}
            {baths && sqft && <span>·</span>}
            {sqft && (
              <span>
                <strong>{sqft.toLocaleString()}</strong> sqft
              </span>
            )}
            {sqft && lotLabel && <span>·</span>}
            {lotLabel && <span>{lotLabel}</span>}
          </div>
        </div>
        <div className="mls-price-v2">
          {price !== undefined && (
            <div className="mls-price-main">{formatShortPrice(price)}</div>
          )}
          {prevPrice !== undefined && prevPrice !== price && (
            <div className="mls-price-sub">
              <span style={{ textDecoration: "line-through" }}>
                {formatShortPrice(prevPrice)}
              </span>
              {delta > 0 && (
                <span className="mls-price-change">
                  ↓ {formatShortPrice(delta)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI STRIP */}
      {kpis.length > 0 && (
        <div
          className="mls-kpi-strip"
          style={{ "--mls-kpi-cols": kpis.length } as React.CSSProperties}
        >
          {kpis.map((kpi) => (
            <div key={kpi.k} className="mls-kpi">
              <div className="n">{kpi.n}</div>
              <div className="k">{kpi.k}</div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILS — only rows where we actually have MLS data */}
      <div className="mls-details-v2">
        {slot.listedAt && (
          <div className="mls-detail-row">
            <span className="k">Listed</span>
            <span className="v">{formatLongDate(slot.listedAt)}</span>
          </div>
        )}
        {estCommission !== undefined && (
          <div className="mls-detail-row">
            <span className="k">Est. commission at 6%</span>
            <span className="v" style={{ color: "var(--coral)" }}>
              {formatFullPrice(estCommission)}
            </span>
          </div>
        )}
        {priceChanges > 0 && (
          <div className="mls-detail-row">
            <span className="k">Price changes</span>
            <span className="v" style={{ color: "var(--lime-deep)" }}>
              {priceChanges}
            </span>
          </div>
        )}
        {slot.listingStatusDisplay && (
          <div className="mls-detail-row">
            <span className="k">Status</span>
            <span className="v" style={{ color: "var(--lime-deep)" }}>
              {slot.listingStatusDisplay}
            </span>
          </div>
        )}
      </div>

      {/* ACTIVITY TIMELINE */}
      {activity.length > 0 && (
        <div className="mls-activity">
          <div className="mls-activity-head">Listing activity</div>
          {activity.map((item, i) => (
            <div key={i} className="mls-activity-row">
              <span className="dot" aria-hidden="true" />
              <div className="date">{item.date ?? "—"}</div>
              <div>
                <div className="event">{item.event}</div>
                {item.detail && <div className="detail">{item.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SWITCH CTA */}
      {estCommission !== undefined && (
        <div className="mls-switch-cta">
          <div className="mls-switch-left">
            <div className="eyebrow">If you switch</div>
            <div className="mls-switch-title">
              Keep 100% of the commission.
            </div>
            <div className="mls-switch-sub">
              List with sellfree Free for $0 and you keep the full{" "}
              {formatFullPrice(estCommission)} a 6% agent would take. Or go Pro
              for a flat $2,999 and still save {formatFullPrice(savings)} while
              we handle the whole listing. Switching takes ~48 hours.
            </div>
          </div>
          <div className="mls-switch-right">
            <div className="mls-switch-num">
              {formatFullPrice(estCommission)}
            </div>
            <div className="mls-switch-num-k">Free tier · 100% kept</div>
            {savings !== undefined && savings > 0 && (
              <div className="mls-switch-alt">
                or {formatFullPrice(savings)} with Pro ($2,999 flat)
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM / CLAIM */}
      <div className="field" style={{ marginTop: 28 }}>
        <label>Is this your listing?</label>
        <div
          className="chip-group"
          role="radiogroup"
          aria-label="Claim this listing"
        >
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
    </div>
  );
}

function Thumbnails({
  photos,
  total,
  active,
  onSelect,
}: {
  photos: NonNullable<EnrichmentSlot["photos"]>;
  total: number;
  active: number;
  onSelect: (idx: number) => void;
}) {
  const MAX_VISIBLE = 5;
  const visible = photos.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, total - MAX_VISIBLE);
  return (
    <div className="mls-gallery-thumbs">
      {visible.map((p, i) => (
        <button
          key={i}
          type="button"
          className={"mls-gallery-thumb" + (i === active ? " active" : "")}
          onClick={() => onSelect(i)}
          aria-label={`Show photo ${i + 1}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt={p.caption ?? ""} />
        </button>
      ))}
      {overflow > 0 && (
        <button
          type="button"
          className="mls-gallery-more"
          onClick={() =>
            onSelect(Math.min(photos.length - 1, MAX_VISIBLE))
          }
          aria-label={`Show remaining ${overflow} photos`}
        >
          +{overflow}
        </button>
      )}
    </div>
  );
}

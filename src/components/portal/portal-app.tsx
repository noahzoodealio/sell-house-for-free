"use client";

// Mirrors design_handoff_sellfree_landing/components/Portal.jsx 1:1.
// Backend wiring is deferred — data is seeded into localStorage and the
// AI chat uses a stubbed responder. Replace in follow-up stories.

import { useEffect, useState, useRef } from "react";
import {
  loadPortal,
  savePortal,
  seedPortal,
  type PortalData,
} from "./portal-data";
import { PhotosSection } from "./portal-photos";
import { ChatBootstrap } from "./chat/chat-bootstrap";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "offers", label: "Cash offers" },
  { id: "listing", label: "Listing" },
  { id: "photos", label: "Photos" },
  { id: "team", label: "Team" },
  { id: "ai", label: "AI assistant" },
  { id: "docs", label: "Documents" },
  { id: "guides", label: "Guides" },
  { id: "plan", label: "Plan" },
] as const;

type SectionId = (typeof NAV_ITEMS)[number]["id"];

function usePortalData(): [PortalData, React.Dispatch<React.SetStateAction<PortalData>>] {
  // Render with the deterministic seed on first paint so SSR and the
  // pre-hydration client match; swap in any persisted copy on mount.
  const [data, setData] = useState<PortalData>(() => seedPortal());

  useEffect(() => {
    const stored = loadPortal();
    if (stored) setData(stored);
  }, []);

  useEffect(() => {
    savePortal(data);
  }, [data]);

  // Merge live OffersV2 data in on mount. The portal-loading page stashes
  // the submission id to localStorage so /portal can re-hydrate without
  // carrying sid through every nav. If no sid or the payload hasn't been
  // fetched yet, we keep the seed offers so the tiles never go blank.
  useEffect(() => {
    const sid =
      typeof window !== "undefined"
        ? window.localStorage.getItem("sellfree:portalSid")
        : null;
    if (!sid) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/portal/offers?sid=${encodeURIComponent(sid)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const body = (await res.json()) as
          | { status: "ready"; offers: PortalData["offers"] }
          | { status: "empty" | "pending" }
          | { status: "error"; message: string };
        if (cancelled) return;
        if (body.status === "ready" && body.offers.length > 0) {
          setData((prev) => ({ ...prev, offers: body.offers }));
        }
      } catch {
        // Offer fetch is best-effort — seed offers remain on failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return [data, setData];
}

export function PortalApp({ initialSection = "overview" as SectionId }) {
  const [data] = usePortalData();
  const [active, setActive] = useState<SectionId>(initialSection);

  const go = (id: SectionId) => {
    setActive(id);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  return (
    <div className="sellfree-root">
      <div className="portal">
        <PortalTopBar data={data} />
        <div className="portal-frame">
          <aside className="portal-side">
            <div className="portal-side-label">Your home sale</div>
            <nav className="portal-nav">
              {NAV_ITEMS.map((n) => (
                <button
                  key={n.id}
                  className={
                    "portal-nav-item " + (active === n.id ? "active" : "")
                  }
                  onClick={() => go(n.id)}
                >
                  {n.label}
                  {n.id === "offers" && (
                    <span className="portal-nav-badge">3</span>
                  )}
                  {n.id === "docs" && (
                    <span className="portal-nav-badge portal-nav-badge-alert">
                      2
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="portal-side-footer">
              <div className="portal-side-plan">
                <div
                  className="eyebrow"
                  style={{ color: "var(--lime-deep)" }}
                >
                  Current plan
                </div>
                <div className="portal-side-plan-name">{data.plan.name}</div>
                <div className="portal-side-plan-price">
                  ${data.plan.price.toLocaleString()} flat
                </div>
                <button
                  className="portal-side-plan-cta"
                  onClick={() => go("plan")}
                >
                  Manage →
                </button>
              </div>
            </div>
          </aside>

          <main className="portal-main">
            {active === "overview" && <OverviewSection data={data} go={go} />}
            {active === "offers" && <OffersSection data={data} />}
            {active === "listing" && <ListingSection data={data} />}
            {active === "photos" && <PhotosSection data={data} />}
            {active === "team" && <TeamSection data={data} />}
            {active === "ai" && <AISection data={data} />}
            {active === "docs" && <DocsSection data={data} />}
            {active === "guides" && <GuidesSection data={data} />}
            {active === "plan" && <PlanSection data={data} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function PortalTopBar({ data }: { data: PortalData }) {
  return (
    <header className="portal-topbar">
      <a
        href="/"
        className="wordmark"
        style={{ textDecoration: "none", fontSize: 16 }}
      >
        <span className="dot">sellfree</span>
        <span className="ai">.ai</span>
      </a>
      <div className="portal-topbar-addr">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          style={{ opacity: 0.5 }}
        >
          <path
            d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>
          {data.property.addr}, {data.property.city}
        </span>
        <span className="portal-topbar-status">
          <span className="dot-blink" /> Listing ready
        </span>
      </div>
      <div className="portal-topbar-user">
        <button className="portal-topbar-icon" aria-label="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 16v-5a6 6 0 00-12 0v5l-2 3h16l-2-3zM10 20a2 2 0 004 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span className="portal-topbar-dot" />
        </button>
        <div
          className="portal-topbar-avatar"
          style={{ background: "oklch(0.72 0.18 35)" }}
        >
          {data.user.first[0]}
        </div>
        <div style={{ fontSize: 13, whiteSpace: "nowrap" }}>
          <div style={{ fontWeight: 600, lineHeight: 1.1 }}>
            {data.user.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Seller
          </div>
        </div>
      </div>
    </header>
  );
}

function OverviewSection({
  data,
  go,
}: {
  data: PortalData;
  go: (id: SectionId) => void;
}) {
  const p = data.property;
  const urgent = data.todos.filter((t) => t.urgent && !t.done);
  const progress = data.todos.filter((t) => t.done).length / data.todos.length;

  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Hello, {data.user.first}</div>
          <h1 className="portal-h1">Welcome to your portal.</h1>
          <p className="portal-lede">
            Everything about your sale lives here — offers, listing, docs, your
            team. Start with what needs your attention.
          </p>
        </div>
        <div className="portal-head-chip">
          <span className="dot-blink" />
          Day 1 · listing draft ready
        </div>
      </div>

      <div className="portal-prop-snap">
        <div className="portal-prop-img" />
        <div className="portal-prop-body">
          <div className="portal-prop-addr">
            {p.addr}
            <br />
            <span>{p.city}</span>
          </div>
          <div className="portal-prop-specs">
            <span>
              <strong>{p.beds}</strong> bd
            </span>
            <span>
              <strong>{p.baths}</strong> ba
            </span>
            <span>
              <strong>{p.sqft.toLocaleString()}</strong> sqft
            </span>
            <span>
              {p.lot} lot · built {p.year}
            </span>
          </div>
          <div className="portal-prop-stats">
            <div>
              <div className="k">Recommended list</div>
              <div className="v">${(p.listPrice / 1000).toFixed(0)}K</div>
            </div>
            <div>
              <div className="k">Est. value</div>
              <div className="v">${(p.estValue / 1000).toFixed(0)}K</div>
            </div>
            <div>
              <div className="k">Avg days on market</div>
              <div className="v">{p.avgDom}d</div>
            </div>
            <div>
              <div className="k">Your est. savings</div>
              <div className="v" style={{ color: "var(--lime-deep)" }}>
                ${Math.round(p.estValue * 0.06 - 2999).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="portal-two-col">
        <div className="portal-card portal-todo-card">
          <div className="portal-card-head">
            <div>
              <div className="eyebrow">To-do · {urgent.length} urgent</div>
              <h3>What needs you.</h3>
            </div>
            <div className="portal-todo-progress">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="var(--line)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="var(--lime-deep)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${progress * 125.6} 125.6`}
                  transform="rotate(-90 24 24)"
                  strokeLinecap="round"
                />
              </svg>
              <span>{Math.round(progress * 100)}%</span>
            </div>
          </div>
          <div className="portal-todo-list">
            {data.todos.map((t) => (
              <div
                key={t.id}
                className={
                  "portal-todo " +
                  (t.done ? "done " : "") +
                  (t.urgent && !t.done ? "urgent" : "")
                }
              >
                <div className="portal-todo-check">
                  {t.done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12l5 5L20 7"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </div>
                <div className="portal-todo-body">
                  <div className="portal-todo-title">
                    {t.title}
                    {t.urgent && !t.done && (
                      <span className="urgent-tag">Urgent</span>
                    )}
                  </div>
                  <div className="portal-todo-detail">{t.detail}</div>
                </div>
                {!t.done && <button className="portal-todo-cta">→</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="portal-card portal-next-card">
          <div className="eyebrow" style={{ color: "var(--lime)" }}>
            What&apos;s next
          </div>
          <h3 style={{ color: "var(--bone)" }}>
            Your listing goes live in <em style={{ fontStyle: "italic" }}>~48 hours.</em>
          </h3>
          <div className="portal-next-timeline">
            <div className="pnt-row active">
              <span className="pnt-dot" />
              <div>
                <div className="pnt-t">Now</div>
                <div className="pnt-l">Approve photos + sign listing agreement</div>
              </div>
            </div>
            <div className="pnt-row">
              <span className="pnt-dot" />
              <div>
                <div className="pnt-t">Apr 24</div>
                <div className="pnt-l">Listing goes live on MLS + 100 portals</div>
              </div>
            </div>
            <div className="pnt-row">
              <span className="pnt-dot" />
              <div>
                <div className="pnt-t">Apr 25–28</div>
                <div className="pnt-l">Showings + offer window opens</div>
              </div>
            </div>
            <div className="pnt-row">
              <span className="pnt-dot" />
              <div>
                <div className="pnt-t">~May 14</div>
                <div className="pnt-l">Under contract (median projection)</div>
              </div>
            </div>
            <div className="pnt-row">
              <span className="pnt-dot" />
              <div>
                <div className="pnt-t">~Jun 12</div>
                <div className="pnt-l">Closing + funds disbursed</div>
              </div>
            </div>
          </div>
          <button className="btn btn-lime btn-lg" onClick={() => go("offers")}>
            Review your 3 cash offers →
          </button>
        </div>
      </div>

      <div className="portal-quick-links">
        <button className="portal-quick" onClick={() => go("offers")}>
          <div className="pq-k">Cash offers</div>
          <div className="pq-v">3 ready</div>
          <div className="pq-sub">
            High: ${(data.offers[0].high / 1000).toFixed(0)}K
          </div>
        </button>
        <button className="portal-quick" onClick={() => go("listing")}>
          <div className="pq-k">Listing status</div>
          <div className="pq-v">Draft</div>
          <div className="pq-sub">Goes live in ~48h</div>
        </button>
        <button className="portal-quick" onClick={() => go("team")}>
          <div className="pq-k">Your team</div>
          <div className="pq-v">2 people</div>
          <div className="pq-sub">Response &lt; 4 hrs</div>
        </button>
        <button className="portal-quick" onClick={() => go("ai")}>
          <div className="pq-k">AI assistant</div>
          <div className="pq-v">24/7</div>
          <div className="pq-sub">Ask anything</div>
        </button>
      </div>
    </div>
  );
}

function OffersSection({ data }: { data: PortalData }) {
  const p = data.property;
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Cash offers · 3 options</div>
          <h1 className="portal-h1">Your cash offers.</h1>
          <p className="portal-lede">
            Pre-qualified cash buyers, negotiated through sellfree&apos;s partner
            network. Estimates update in real-time based on your property.
          </p>
        </div>
      </div>

      <div className="offer-prop-strip">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="offer-prop-addr">{p.addr}</div>
          <div className="offer-prop-specs">
            <span>{p.city}</span>
            <span>◷ Built {p.year}</span>
            <span>▢ {p.beds} bed</span>
            <span>○ {p.baths} bath</span>
            <span>◇ {p.sqft.toLocaleString()} sqft</span>
          </div>
        </div>
        <div className="offer-prop-est">
          <div className="eyebrow">MLS sale estimate</div>
          <div>${(p.listPrice / 1000).toFixed(0)}K</div>
        </div>
      </div>

      <div className="offers-grid">
        {data.offers.map((o, i) => (
          <OfferCard key={o.id} offer={o} index={i} />
        ))}
      </div>

      <div className="offer-disclaimer">
        *These numbers are estimates of your home&apos;s full market offer. Your
        final number will be returned once full evaluation is complete. No
        obligation to accept.
      </div>

      <div className="offer-help">
        <div className="offer-help-person">
          <div
            className="offer-help-avatar"
            style={{ background: "oklch(0.82 0.08 80)" }}
          >
            JF
          </div>
          <div>
            <div className="eyebrow">Need help understanding your offer?</div>
            <div
              style={{
                fontFamily: "var(--sf-font-display)",
                fontSize: 22,
                marginTop: 2,
              }}
            >
              Jake Fritz · Cash offer specialist
            </div>
            <div
              style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}
            >
              Licensed TX · 12 yrs experience · 4.98 ★ from 340 sellers
            </div>
          </div>
        </div>
        <div className="offer-help-ctas">
          <button className="btn btn-primary">☎ Schedule a call</button>
          <button className="btn btn-ghost">◌ Send a text</button>
        </div>
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  index,
}: {
  offer: PortalData["offers"][number];
  index: number;
}) {
  const tones = {
    lime: { bg: "var(--lime)", fg: "var(--ink)", accent: "var(--lime-deep)" },
    dark: { bg: "var(--ink)", fg: "var(--bone)", accent: "var(--lime)" },
    bone: { bg: "var(--bone-2)", fg: "var(--ink)", accent: "var(--ink-3)" },
  } as const;
  const t = tones[offer.tone];
  const detailsShared = offer.displayState === "DETAILS_SHARED";
  const sharedAmount = offer.sharedAmount ?? null;

  return (
    <div
      className={
        "offer-card offer-" +
        offer.tone +
        (offer.popular ? " popular" : "")
      }
    >
      {offer.popular && (
        <div className="offer-popular-ribbon">Most popular offer</div>
      )}
      <div
        className="offer-card-hero"
        style={{ background: t.bg, color: t.fg }}
      >
        <div className="offer-hero-head">
          <div>
            <div
              style={{
                fontFamily: "var(--sf-font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.6,
              }}
            >
              Offer 0{index + 1}
            </div>
            <div className="offer-hero-name">{offer.name}</div>
            <div className="offer-hero-label">{offer.label}</div>
          </div>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            style={{ opacity: 0.25 }}
          >
            <path
              d="M3 9l9-6 9 6v12H3V9z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="offer-hero-range">
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--sf-font-mono)",
              letterSpacing: "0.08em",
              opacity: 0.7,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {detailsShared ? "Offer ready" : "Estimated offer range"}
          </div>
          {detailsShared && sharedAmount != null ? (
            <div className="offer-range-nums">
              <span>${(sharedAmount / 1000).toFixed(0)}K</span>
            </div>
          ) : (
            <div className="offer-range-nums">
              <span>${(offer.low / 1000).toFixed(0)}K</span>
              <span className="offer-range-dash">—</span>
              <span>${(offer.high / 1000).toFixed(0)}K</span>
            </div>
          )}
        </div>
      </div>

      <div className="offer-card-body">
        <div className="offer-body-row">
          <span className="k">Backed by</span>
          <span className="v">{offer.lender}</span>
        </div>
        <div className="offer-body-row">
          <span className="k">Close timeline</span>
          <span className="v">{offer.closes}</span>
        </div>
        <ul className="offer-terms">
          {offer.terms.map((term, i) => (
            <li key={i}>
              <span className="offer-term-check">✓</span>
              {term}
            </li>
          ))}
        </ul>
        <button className="btn btn-primary offer-cta">
          {detailsShared ? "Review your offer" : "Request offer details"}
        </button>
        <button className="offer-feedback-link">
          Send feedback on this offer
        </button>
        <div
          style={{
            marginTop: 12,
            fontSize: 10,
            fontFamily: "var(--sf-font-mono)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          Powered by Zoodealio
        </div>
      </div>
    </div>
  );
}

function ListingSection({ data }: { data: PortalData }) {
  const l = data.listing;
  const p = data.property;
  const gradients = [
    "linear-gradient(135deg, oklch(0.72 0.09 35), oklch(0.5 0.06 255))",
    "linear-gradient(180deg, oklch(0.85 0.05 90), oklch(0.65 0.05 90))",
    "linear-gradient(45deg, oklch(0.82 0.08 125), oklch(0.55 0.06 160))",
    "linear-gradient(135deg, oklch(0.35 0.04 255), oklch(0.2 0.015 255))",
  ];
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Your listing · {l.status}</div>
          <h1 className="portal-h1">Listing &amp; performance.</h1>
          <p className="portal-lede">
            Your live listing, traffic, and where your property appears. Goes
            live once you approve photos + sign.
          </p>
        </div>
      </div>

      <div className="listing-hero">
        <div className="listing-hero-photos">
          {gradients.map((g, i) => (
            <div key={i} className="listing-photo" style={{ background: g }}>
              {i === 3 && (
                <div className="listing-photo-more">+{l.photos - 3}</div>
              )}
            </div>
          ))}
        </div>
        <div className="listing-hero-body">
          <div className="listing-hero-badge">
            <span className="dot-blink" />
            Draft — awaiting approval
          </div>
          <div className="listing-hero-price">
            ${(p.listPrice / 1000).toFixed(0)}K
          </div>
          <div className="listing-hero-addr">
            {p.addr}, {p.city}
          </div>
          <div className="listing-hero-specs">
            {p.beds} bd · {p.baths} ba · {p.sqft.toLocaleString()} sqft
          </div>
          <div className="listing-hero-ctas">
            <button className="btn btn-primary">Preview full listing →</button>
            <button className="btn btn-ghost">Edit copy</button>
          </div>
        </div>
      </div>

      <div className="listing-portals">
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Where your listing will appear · 100 portals
        </div>
        <div className="listing-portal-grid">
          {[
            { name: "MLS Austin (ACTRIS)", status: "queued", url: l.mlsId },
            { name: "Zillow", status: "queued", url: l.zillow },
            { name: "Realtor.com", status: "queued", url: "—" },
            { name: "Redfin", status: "queued", url: "—" },
            { name: "Trulia", status: "queued", url: "—" },
            { name: "Homes.com", status: "queued", url: "—" },
          ].map((row, i) => (
            <div key={i} className="listing-portal-row">
              <div className="lpr-name">{row.name}</div>
              <div className="lpr-status">queued</div>
              <a className="lpr-link" href="#">
                Open ↗
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-head">
          <div>
            <div className="eyebrow">Listing performance</div>
            <h3>Traffic &amp; engagement.</h3>
          </div>
          <span className="pill pill-dark">Updates every 15 min</span>
        </div>
        <div className="listing-stats-grid">
          <div className="listing-stat">
            <div className="k">Listing views</div>
            <div className="v">{l.views}</div>
            <div className="s">— goes live {p.pricedAt}</div>
          </div>
          <div className="listing-stat">
            <div className="k">Saves</div>
            <div className="v">{l.saves}</div>
            <div className="s">—</div>
          </div>
          <div className="listing-stat">
            <div className="k">Buyer leads</div>
            <div className="v">{l.leads}</div>
            <div className="s">—</div>
          </div>
          <div className="listing-stat">
            <div className="k">Showings booked</div>
            <div className="v">{l.showings}</div>
            <div className="s">—</div>
          </div>
          <div className="listing-stat">
            <div className="k">Offers received</div>
            <div className="v">{l.offers}</div>
            <div className="s">—</div>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-head">
          <div>
            <div className="eyebrow">Pricing rationale · AI + human-reviewed</div>
            <h3>Why we recommend ${(p.listPrice / 1000).toFixed(0)}K.</h3>
          </div>
          <span className="pill pill-lime">
            {data.pricingRationale.confidence}% confidence
          </span>
        </div>
        <p style={{ color: "var(--ink-3)", fontSize: 14, lineHeight: 1.55 }}>
          {data.pricingRationale.logic}
        </p>
        <div className="comps-table">
          <div className="comps-head">
            <span>Comp</span>
            <span>$/sqft</span>
            <span>Sold price</span>
            <span>Days on market</span>
            <span>Sold</span>
          </div>
          {data.pricingRationale.comps.map((c, i) => (
            <div key={i} className="comps-row">
              <span>{c.addr}</span>
              <span>${c.ppsqft}</span>
              <span>${(c.price / 1000).toFixed(0)}K</span>
              <span>{c.days}d</span>
              <span>{c.sold}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamSection({ data }: { data: PortalData }) {
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Your team · licensed + on-call</div>
          <h1 className="portal-h1">Your sellfree team.</h1>
          <p className="portal-lede">
            Two humans dedicated to your sale — plus an AI assistant that never
            sleeps. Response time under 4 hours, always.
          </p>
        </div>
      </div>

      <div className="team-grid">
        <TeamCard
          person={data.team.tc}
          tone="lime"
          stats={[
            { k: "Deals closed", v: "247" },
            { k: "Avg response", v: "< 4h" },
            { k: "Rating", v: "4.99 ★" },
          ]}
        />
        <TeamCard
          person={data.team.agent}
          tone="dark"
          stats={[
            { k: "License", v: data.team.agent.license },
            { k: "Deals closed", v: "183" },
            { k: "Rating", v: data.team.agent.rating + " ★" },
          ]}
        />
      </div>

      <div className="portal-card">
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          How to reach them
        </div>
        <div className="team-contact-grid">
          <div className="team-contact">
            <div className="tc-k">In-app chat</div>
            <div className="tc-v">Available 24/7</div>
          </div>
          <div className="team-contact">
            <div className="tc-k">Email</div>
            <div className="tc-v">{data.team.tc.email}</div>
          </div>
          <div className="team-contact">
            <div className="tc-k">Phone</div>
            <div className="tc-v">{data.team.tc.phone}</div>
          </div>
          <div className="team-contact">
            <div className="tc-k">Video call</div>
            <div className="tc-v">By appointment</div>
          </div>
        </div>
      </div>
    </div>
  );
}

type TeamPerson = {
  name: string;
  role: string;
  seed: number;
};

function TeamCard({
  person,
  tone,
  stats,
}: {
  person: TeamPerson;
  tone: "lime" | "dark";
  stats: Array<{ k: string; v: string }>;
}) {
  const colors = [
    "oklch(0.82 0.08 80)",
    "oklch(0.72 0.12 25)",
    "oklch(0.65 0.1 155)",
    "oklch(0.55 0.08 260)",
    "oklch(0.78 0.1 50)",
  ];
  const isDark = tone === "dark";
  return (
    <div className={"team-card " + (isDark ? "dark" : "lime")}>
      <div className="team-card-head">
        <div
          className="team-avatar-lg"
          style={{ background: colors[person.seed % colors.length] }}
        >
          {person.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <div
            className="eyebrow"
            style={{ color: isDark ? "var(--lime)" : "var(--lime-deep)" }}
          >
            {person.role}
          </div>
          <div className="team-name">{person.name}</div>
        </div>
      </div>
      <div className="team-stats">
        {stats.map((s, i) => (
          <div key={i} className="team-stat">
            <div className="k">{s.k}</div>
            <div className="v">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="team-actions">
        <button className="btn btn-primary">☎ Call</button>
        <button className="btn btn-ghost">◌ Message</button>
      </div>
    </div>
  );
}

function AISection({ data: _data }: { data: PortalData }) {
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">AI assistant · 24/7</div>
          <h1 className="portal-h1">Ask anything about your sale.</h1>
          <p className="portal-lede">
            Friend-style advice on pricing, offers, contract terms, and
            comps — answers in seconds, grounded in your property.
          </p>
        </div>
      </div>

      <ChatBootstrap />
    </div>
  );
}

function DocsSection({ data }: { data: PortalData }) {
  const statuses: Record<
    string,
    { label: string; color: string }
  > = {
    "awaiting-signature": {
      label: "Awaiting signature",
      color: "var(--coral)",
    },
    draft: { label: "Draft", color: "var(--muted)" },
    received: { label: "Received", color: "var(--lime-deep)" },
    "in-progress": { label: "In progress", color: "var(--ink-3)" },
  };
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Documents · {data.docs.length} files</div>
          <h1 className="portal-h1">Your documents.</h1>
          <p className="portal-lede">
            Every contract, disclosure, and form for your sale — signable
            in-app, stored forever, downloadable any time.
          </p>
        </div>
      </div>

      <div className="docs-list">
        {data.docs.map((d, i) => {
          const s = statuses[d.status];
          return (
            <div key={i} className="doc-row">
              <div className="doc-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="doc-body">
                <div className="doc-name">{d.name}</div>
                <div className="doc-meta">
                  {d.type} · dated {d.dated}
                </div>
              </div>
              <div className="doc-status" style={{ color: s.color }}>
                ● {s.label}
              </div>
              <button className="doc-action">
                {d.status === "awaiting-signature" ? "Sign →" : "Open ↗"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GuidesSection({ data }: { data: PortalData }) {
  const bgs = [
    "linear-gradient(135deg, oklch(0.82 0.1 125), oklch(0.65 0.08 160))",
    "linear-gradient(45deg, oklch(0.72 0.09 35), oklch(0.55 0.08 25))",
    "linear-gradient(180deg, oklch(0.3 0.02 255), oklch(0.18 0.015 255))",
    "linear-gradient(135deg, oklch(0.85 0.04 90), oklch(0.7 0.06 80))",
  ];
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Guides · curated for your sale</div>
          <h1 className="portal-h1">Prep your home, smart.</h1>
          <p className="portal-lede">
            Hand-picked guides based on where you are in the selling process.
            Short reads, real results.
          </p>
        </div>
      </div>
      <div className="guides-grid">
        {data.guides.map((g, i) => (
          <div key={i} className="guide-card">
            <div
              className="guide-card-img"
              style={{ background: bgs[i % bgs.length] }}
            >
              <span className="guide-card-heat">▲ {g.heat}% helpful</span>
            </div>
            <div className="guide-card-body">
              <div className="eyebrow">
                {g.tag} · {g.read} read
              </div>
              <div className="guide-card-title">{g.title}</div>
              <button className="guide-card-link">Read guide →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanSection({ data }: { data: PortalData }) {
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Your plan</div>
          <h1 className="portal-h1">{data.plan.name}</h1>
          <p className="portal-lede">
            One flat fee. Everything an agent does, done for you. Cancel anytime
            before your listing goes live.
          </p>
        </div>
      </div>
      <div className="plan-card">
        <div className="plan-card-head">
          <div>
            <div className="eyebrow" style={{ color: "var(--lime)" }}>
              Current plan
            </div>
            <div className="plan-card-name">{data.plan.name}</div>
          </div>
          <div className="plan-card-price">
            <div className="ppn">${data.plan.price.toLocaleString()}</div>
            <div className="ppk">Flat · charged at close</div>
          </div>
        </div>
        <ul className="plan-features">
          {data.plan.features.map((f, i) => (
            <li key={i}>
              <span className="plan-check">✓</span>
              {f}
            </li>
          ))}
        </ul>
        <div className="plan-vs">
          <div>
            Estimated commission avoided:{" "}
            <strong style={{ color: "var(--lime-deep)" }}>
              ${Math.round(data.property.listPrice * 0.06).toLocaleString()}
            </strong>
          </div>
          <div>
            Your flat fee:{" "}
            <strong>${data.plan.price.toLocaleString()}</strong>
          </div>
          <div className="plan-vs-save">
            Net savings:{" "}
            <strong>
              ${Math.round(
                data.property.listPrice * 0.06 - data.plan.price,
              ).toLocaleString()}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading / onboarding animation — navigates to /portal on finish.
const LOADING_STEPS = [
  { t: 0, label: "Pulling county records", source: "Travis County Records Dept." },
  { t: 900, label: "Fetching tax + assessed value", source: "Texas Comptroller API" },
  { t: 1700, label: "Querying MLS for comps", source: "Austin Board of Realtors · RETS feed" },
  { t: 2600, label: "Running AI pricing model", source: "sellfree price engine v4.2" },
  { t: 3600, label: "Generating 3 cash offer scenarios", source: "Knock · Flyhomes · Opendoor" },
  { t: 4700, label: "Assembling your transaction team", source: "sellfree internal routing" },
  { t: 5500, label: "Drafting your listing", source: "sellfree listing engine" },
  { t: 6500, label: "Preparing your dashboard", source: "finalize" },
];

type FinalizeState =
  | { phase: "pending" }
  | { phase: "ready"; referralCode: string }
  | { phase: "failed"; reason: string };

const POLL_INTERVAL_MS = 1200;
// Must exceed the server-side Offervana wall-clock budget: 2 attempts @ 25s
// + 1s backoff + jitter + a few seconds for supabase writes ≈ 55s. 75s
// gives the client a clean grace margin before declaring timeout.
const POLL_MAX_DURATION_MS = 75_000;
const ANIMATION_MIN_MS = 7200;

export function PortalLoading() {
  const [tick, setTick] = useState(0);
  const [progress, setProgress] = useState(0);
  const [finalize, setFinalize] = useState<FinalizeState>({ phase: "pending" });
  const startRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("sid");
    const ref = params.get("ref");

    // Idempotent replay: server already has the referralCode, no polling needed.
    if (ref && ref !== "unassigned" && ref !== "pending") {
      setFinalize({ phase: "ready", referralCode: ref });
      return;
    }

    // No sid means the user landed here directly (e.g. dev, or post-signup) —
    // behave like the old animation-only flow.
    if (!sid) {
      setFinalize({ phase: "ready", referralCode: "unassigned" });
      return;
    }

    const pollStart = Date.now();
    let cancelled = false;
    let timer = 0;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/portal/submission-status?sid=${encodeURIComponent(sid)}`,
          { cache: "no-store" },
        );
        const body = (await res.json()) as
          | { status: "ready"; referralCode: string }
          | { status: "failed"; reason: string }
          | { status: "pending" }
          | { status: "error"; message: string };
        if (cancelled) return;
        if (body.status === "ready") {
          setFinalize({ phase: "ready", referralCode: body.referralCode });
          return;
        }
        if (body.status === "failed") {
          setFinalize({ phase: "failed", reason: body.reason });
          return;
        }
        if (Date.now() - pollStart > POLL_MAX_DURATION_MS) {
          setFinalize({ phase: "failed", reason: "timeout" });
          return;
        }
      } catch {
        // Transient fetch error — keep polling until budget is exhausted.
        if (Date.now() - pollStart > POLL_MAX_DURATION_MS) {
          setFinalize({ phase: "failed", reason: "network" });
          return;
        }
      }
      timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const finalizeRef = useRef<FinalizeState>(finalize);
  finalizeRef.current = finalize;

  useEffect(() => {
    startRef.current = Date.now();
    let raf = 0;
    const loop = () => {
      const elapsed = Date.now() - startRef.current;
      setTick(elapsed);
      // Animation reaches 90% at ANIMATION_MIN_MS; the last 10% waits for
      // the server-side finalize so the progress bar never "lies" by
      // finishing before the work does.
      const phase = finalizeRef.current.phase;
      const animPct = Math.min(elapsed / ANIMATION_MIN_MS, 1) * 0.9;
      const readyBoost = phase === "ready" ? 0.1 : 0;
      setProgress(Math.min(animPct + readyBoost, 1));

      const animationDone = elapsed >= ANIMATION_MIN_MS;
      const shouldFinish = !doneRef.current && animationDone && phase !== "pending";

      if (shouldFinish) {
        doneRef.current = true;
        savePortal(seedPortal());
        // Persist the sid so /portal can fetch OffersV2 on load without
        // threading it through the URL. Polling only writes on success.
        try {
          const params = new URLSearchParams(window.location.search);
          const sid = params.get("sid");
          if (sid) window.localStorage.setItem("sellfree:portalSid", sid);
        } catch {}
        setTimeout(() => {
          window.location.href = "/portal";
        }, 400);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const currentStep = LOADING_STEPS.findIndex((_, i) => {
    const next = LOADING_STEPS[i + 1];
    return !next || tick < next.t;
  });

  let first = "there";
  let seedAddr = "your property";
  if (typeof window !== "undefined") {
    try {
      const flow = JSON.parse(localStorage.getItem("sellfree:flow") || "{}");
      first = (flow.name || "there").split(" ")[0];
      seedAddr = flow.seedAddress?.addr || "your property";
    } catch {}
  }

  return (
    <div className="sellfree-root">
      <div className="portal-loading">
        <div className="portal-loading-stars">
          {Array.from({ length: 48 }).map((_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 37.1) % 100}%`,
                top: `${(i * 53.7) % 100}%`,
                animationDelay: `${(i * 0.07) % 2}s`,
                opacity: 0.3 + ((i * 7) % 10) / 20,
              }}
            />
          ))}
        </div>

        <div className="portal-loading-inner">
          <div className="wordmark" style={{ fontSize: 20, marginBottom: 48 }}>
            <span className="dot" style={{ color: "var(--bone)" }}>
              sellfree
            </span>
            <span className="ai" style={{ color: "var(--lime)" }}>
              .ai
            </span>
          </div>

          <div
            className="eyebrow"
            style={{
              color: "var(--lime)",
              marginBottom: 14,
              letterSpacing: "0.12em",
            }}
          >
            Setting up your portal
          </div>
          <h1 className="portal-loading-title">
            Building your sale,
            <br />
            <span style={{ fontStyle: "italic", color: "var(--lime)" }}>
              {first}.
            </span>
          </h1>
          <p className="portal-loading-sub">
            We&apos;re pulling records, running comps, assembling offers, and
            drafting your listing for{" "}
            <strong style={{ color: "var(--bone)" }}>{seedAddr}</strong>. This
            takes about 60 seconds.
          </p>

          <div className="portal-loading-card">
            <div className="pl-steps">
              {LOADING_STEPS.map((s, i) => {
                const state =
                  i < currentStep
                    ? "done"
                    : i === currentStep
                    ? "active"
                    : "pending";
                return (
                  <div key={i} className={"pl-step pl-" + state}>
                    <div className="pl-step-indicator">
                      {state === "done" && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 12l5 5L20 7"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      {state === "active" && <span className="pl-spinner" />}
                      {state === "pending" && <span className="pl-dot" />}
                    </div>
                    <div className="pl-step-body">
                      <div className="pl-step-label">{s.label}</div>
                      <div className="pl-step-source">{s.source}</div>
                    </div>
                    {state === "done" && (
                      <div className="pl-step-time">✓</div>
                    )}
                    {state === "active" && (
                      <div className="pl-step-time pl-pulse">●●●</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pl-progress-wrap">
              <div className="pl-progress-bar">
                <div
                  className="pl-progress-fill"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="pl-progress-meta">
                <span>{Math.round(progress * 100)}% complete</span>
                <span>
                  Est. {Math.max(0, Math.round((ANIMATION_MIN_MS - tick) / 1000))}s
                  remaining
                </span>
              </div>
            </div>
          </div>

          <div className="pl-fact">
            <div className="pl-fact-n">
              {Math.round(progress * 847).toLocaleString()}
            </div>
            <div className="pl-fact-k">data points analyzed</div>
            <span className="pl-fact-sep" />
            <div className="pl-fact-n">{Math.round(progress * 42)}</div>
            <div className="pl-fact-k">comps reviewed</div>
            <span className="pl-fact-sep" />
            <div className="pl-fact-n">{Math.round(progress * 3)}</div>
            <div className="pl-fact-k">cash offers generated</div>
          </div>
        </div>
      </div>
    </div>
  );
}

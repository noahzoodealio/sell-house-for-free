"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { LandingAddressInput, type SampleAddress } from "./address-input";

/* ========================== shared hooks ========================== */

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(".sellfree-root .reveal").forEach((el) => {
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
}

function useCounter(target: number, duration = 1600, trigger = true) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, trigger]);
  return v;
}

/* ============================ NAV ============================ */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={"nav " + (scrolled ? "scrolled" : "")}>
      <div className="nav-inner">
        <a href="#" className="wordmark" style={{ textDecoration: "none" }}>
          <span className="dot">sellfree</span>
          <span className="ai">.ai</span>
        </a>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#savings">Savings</a>
          <a href="#features">Features</a>
          <a href="#cash-offer">Cash offer</a>
          <a href="#stories">Stories</a>
        </div>
        <div className="nav-cta">
          <a href="/get-started" style={{ textDecoration: "none", opacity: 0.8 }}>
            Log in
          </a>
          <a href="/get-started" className="btn btn-primary">
            Start free
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ============================ HERO ============================ */

function EstimateCard(_props: { revealed: SampleAddress | null }) {
  const value = 742000;
  const animated = useCounter(value, 1400, true);
  const savings = useCounter(
    Math.max(0, Math.round(value * 0.055 - 499)),
    1400,
    true,
  );
  const triggered = true;

  const bars = [35, 55, 42, 68, 82, 76, 95, 88, 72, 90, 78, 84];
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="estimate-card estimate-main">
      <div className="ec-head">
        <span className="pill pill-dark">
          <span className="dot-blink" />
          LIVE MARKET DATA
        </span>
        <span className="ec-label">{today}</span>
      </div>
      <div className="ec-label" style={{ marginTop: 8 }}>
        Estimated home value
      </div>
      <div className="ec-value">${animated.toLocaleString()}</div>
      <div className="ec-meta">
        <span style={{ color: "var(--lime)" }}>▲ 4.2% YoY</span>
        <span>· Confidence 94%</span>
      </div>
      <div className="ec-bars">
        {bars.map((h, i) => (
          <div
            key={i}
            className={"ec-bar " + (i >= 8 ? "hl" : "")}
            style={{
              height: triggered ? `${h}%` : "8px",
              transitionDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontFamily: "var(--sf-font-mono)",
          fontSize: 10,
          color: "var(--muted-dark)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        12-month neighborhood trend
      </div>
      <div className="ec-stat-row">
        <div>
          <div className="k">With sellfree</div>
          <div className="v" style={{ color: "var(--lime)" }}>
            ${savings.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="k">With 6% agent</div>
          <div className="v" style={{ textDecoration: "line-through", opacity: 0.5 }}>
            $0
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const [revealed, setRevealed] = useState<SampleAddress | null>(null);

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="reveal in">
            <div className="pill" style={{ marginBottom: 24 }}>
              <span className="dot-blink" />
              Freemium · No listing fees · Live in 24 hrs
            </div>
            <h1 className="display">
              Sell your home.
              <br />
              <span className="alt">For free.</span>
            </h1>
            <p className="hero-sub">
              AI-powered home selling with on-demand licensed agent support —
              pay <strong>$0 commission</strong>, keep the 6%. Listings,
              marketing, offers, docs, and closing — all in one platform.
            </p>
            <LandingAddressInput onReveal={setRevealed} />
            <div className="trust-row">
              <div className="avatars">
                <div style={{ background: "oklch(0.72 0.18 35)" }} />
                <div style={{ background: "oklch(0.88 0.2 125)" }} />
                <div style={{ background: "oklch(0.45 0.1 255)" }} />
                <div style={{ background: "oklch(0.3 0.02 255)" }} />
              </div>
              <span>
                <strong style={{ color: "var(--ink)" }}>12,847 sellers</strong>{" "}
                saved an avg of $41,290 this year
              </span>
            </div>
          </div>
          <div className="estimate-stack reveal in">
            <div className="estimate-floating estimate-f1">
              <div
                style={{
                  fontFamily: "var(--sf-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                You keep
              </div>
              <div
                style={{
                  fontFamily: "var(--sf-font-display)",
                  fontSize: 28,
                  lineHeight: 1,
                }}
              >
                $40,921
              </div>
            </div>
            <EstimateCard revealed={revealed} />
            <div className="estimate-floating estimate-f2">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background:
                      "repeating-linear-gradient(135deg, oklch(0.88 0.05 90) 0 4px, oklch(0.82 0.05 90) 4px 8px)",
                  }}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    Offer received · 2m ago
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    $735K · All cash · 14-day close
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ MARQUEE / PRESS ============================ */

function Marquee() {
  const items = [
    "Sell for free",
    "Keep the 6%",
    "18-day average close",
    "Licensed in 50 states",
    "MLS + 100 portals",
    "Cash offers in 24 hrs",
    "AI pricing engine",
    "On-demand agent support",
  ];
  const loop = [...items, ...items, ...items];
  return (
    <div
      style={{
        background: "var(--lime)",
        color: "var(--ink)",
        padding: "14px 0",
        overflow: "hidden",
        borderTop: "1px solid var(--lime-deep)",
        borderBottom: "1px solid var(--lime-deep)",
      }}
    >
      <div className="marquee">
        <div className="marquee-track">
          {loop.map((t, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 48,
                fontFamily: "var(--sf-font-mono)",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {t} <span style={{ opacity: 0.4 }}>/</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PressBar() {
  return (
    <section className="press">
      <div className="container">
        <div className="press-row">
          <span className="press-label">As featured in</span>
          <div className="press-logos">
            <span>Forbes</span>
            <span className="s">CBS NEWS</span>
            <span className="s">FAST COMPANY</span>
            <span>The Atlantic</span>
            <span className="m">TechCrunch</span>
            <span className="s">WSJ</span>
          </div>
          <span
            className="press-label"
            style={{ fontFamily: "var(--sf-font-mono)", color: "var(--ink)" }}
          >
            TRUSTPILOT · 4.9 ★
          </span>
        </div>
      </div>
    </section>
  );
}

/* ============================ KPI STRIP ============================ */

function KpiStrip() {
  const v1 = useCounter(487, 1800, true);
  const v2 = useCounter(41290, 1800, true);
  const v3 = useCounter(18, 1800, true);
  const v4 = useCounter(93, 1800, true);

  return (
    <section className="kpi-strip">
      <div className="container">
        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi-num">${v2.toLocaleString()}</div>
            <div className="kpi-label">Avg. saved per seller</div>
          </div>
          <div className="kpi">
            <div className="kpi-num">
              {v3}
              <span className="unit"> days</span>
            </div>
            <div className="kpi-label">Median time to offer</div>
          </div>
          <div className="kpi">
            <div className="kpi-num">
              {v4}
              <span className="unit">%</span>
            </div>
            <div className="kpi-label">Sellers get an offer</div>
          </div>
          <div className="kpi">
            <div className="kpi-num">${v1}M+</div>
            <div className="kpi-label">In commissions saved</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ CALCULATOR ============================ */

const TIERS = {
  starter: {
    label: "Free",
    price: 0,
    fee: 0,
    includes: "Self-service listing on all major platforms",
  },
  essentials: {
    label: "Essentials",
    price: 799,
    fee: 799,
    includes: "On-call licensed agent + pro photos + boosts",
  },
  pro: {
    label: "Pro",
    price: 2999,
    fee: 2999,
    includes: "Full-service agent, end-to-end handled",
    badge: "Most popular",
  },
} as const;

type TierKey = keyof typeof TIERS;

function Calculator() {
  const [tier, setTier] = useState<TierKey>("essentials");
  const [value, setValue] = useState(750000);
  const switchRef = useRef<HTMLDivElement | null>(null);
  const [pill, setPill] = useState({ left: 4, width: 0 });

  const min = 150000;
  const max = 3000000;
  const percent = ((value - min) / (max - min)) * 100;

  const agentCost = Math.round(value * 0.06);
  const ourCost = TIERS[tier].fee;
  const savings = Math.max(0, agentCost - ourCost);
  const youKeep = value - ourCost;
  const animSavings = useCounter(savings, 900, true);

  useEffect(() => {
    if (!switchRef.current) return;
    const btn = switchRef.current.querySelector(
      `[data-tier="${tier}"]`,
    ) as HTMLButtonElement | null;
    if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [tier]);

  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const keepPct = (youKeep / value) * 100;

  return (
    <section className="calc" id="savings">
      <div className="container">
        <div className="calc-grid">
          <div className="reveal">
            <div className="eyebrow">Savings calculator</div>
            <h2 className="display">
              See how much you could{" "}
              <em style={{ fontStyle: "italic", color: "var(--lime)" }}>
                keep
              </em>
              .
            </h2>
            <p
              style={{
                color: "var(--muted-dark)",
                fontSize: 17,
                lineHeight: 1.55,
                marginBottom: 32,
                maxWidth: 440,
              }}
            >
              Traditional agents charge 6% — split between buyer and seller
              side. Pick a plan, slide your home value, watch the math.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/get-started" className="btn btn-lime btn-lg">
                Start selling free
                <ArrowRight />
              </a>
              <a href="#features" className="btn btn-dark-ghost btn-lg">
                Compare all plans
              </a>
            </div>

            <div style={{ marginTop: 48, display: "flex", gap: 32, flexWrap: "wrap" }}>
              <Stat label="Avg. transaction" value="18 days" />
              <Stat label="Offer rate" value="93%" />
              <Stat label="Over ask" value="+$8.2K" tone="lime" />
            </div>
          </div>

          <div className="calc-panel reveal">
            <div className="tier-switch" ref={switchRef}>
              <div
                className="slider-pill"
                style={{ left: pill.left, width: pill.width }}
              />
              {(Object.keys(TIERS) as TierKey[]).map((k) => (
                <button
                  key={k}
                  data-tier={k}
                  className={tier === k ? "active" : ""}
                  onClick={() => setTier(k)}
                  type="button"
                >
                  {TIERS[k].label}
                  {TIERS[k].price > 0 ? ` · $${TIERS[k].price}` : ""}
                </button>
              ))}
            </div>

            <div className="savings-display">
              <div className="savings-label">Your estimated savings</div>
              <div className="savings-value">{fmt(animSavings)}</div>
              <div
                style={{
                  fontFamily: "var(--sf-font-mono)",
                  fontSize: 12,
                  color: "var(--muted-dark)",
                  marginTop: 8,
                }}
              >
                vs. a traditional 6% agent commission
              </div>
            </div>

            <div className="home-value-group">
              <div className="home-value-row">
                <span className="label">Your home value</span>
                <span className="val">{fmt(value)}</span>
              </div>
              <div className="range-wrap">
                <div className="range-track" />
                <div className="range-fill" style={{ width: `${percent}%` }} />
                <input
                  type="range"
                  className="range-input"
                  min={min}
                  max={max}
                  step={5000}
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value, 10))}
                  aria-label="Home value"
                />
              </div>
              <div className="range-ticks">
                <span>$150K</span>
                <span>$1M</span>
                <span>$2M</span>
                <span>$3M+</span>
              </div>
            </div>

            <div className="compare-row">
              <div className="compare-cell strike">
                <div className="k">Agent commission (6%)</div>
                <div className="v">{fmt(agentCost)}</div>
              </div>
              <div className="compare-cell hl">
                <div className="k">sellfree.ai {TIERS[tier].label}</div>
                <div className="v">{ourCost === 0 ? "$0" : fmt(ourCost)}</div>
              </div>
            </div>

            <div className="keep-viz">
              <div
                style={{
                  fontFamily: "var(--sf-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted-dark)",
                }}
              >
                Proceeds from sale
              </div>
              <div className="keep-bar">
                <div className="you" style={{ width: `${keepPct}%` }}>
                  You keep {fmt(youKeep)}
                </div>
                <div className="them" style={{ width: `${100 - keepPct}%` }}>
                  {ourCost > 0 ? `Flat ${fmt(ourCost)}` : "$0"}
                </div>
              </div>
              <div className="keep-legend">
                <span>{Math.round(keepPct * 100) / 100}% of sale</span>
                <span>vs 94% with agent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "lime";
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--sf-font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--muted-dark)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--sf-font-display)",
          fontSize: 32,
          marginTop: 6,
          color: tone === "lime" ? "var(--lime)" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================ HOW IT WORKS ============================ */

type IconKey = "scan" | "broadcast" | "inbox" | "lock";

const ICONS: Record<IconKey, ReactNode> = {
  scan: (
    <path
      d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  ),
  broadcast: (
    <>
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 8a5.66 5.66 0 000 8M16 8a5.66 5.66 0 010 8M5 5a9.9 9.9 0 000 14M19 5a9.9 9.9 0 010 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  inbox: (
    <>
      <path
        d="M3 13h4l2 3h6l2-3h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5 5h14l2 8v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5l2-8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  ),
  lock: (
    <>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 11V7a4 4 0 118 0v4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </>
  ),
};

function HowItWorks() {
  const steps: {
    title: string;
    desc: string;
    time: string;
    icon: IconKey;
  }[] = [
    {
      title: "List in 20 min",
      desc: "Answer a few questions. Our AI drafts your listing, handles photos, and pulls comps from MLS.",
      time: "Day 0",
      icon: "scan",
    },
    {
      title: "Go live everywhere",
      desc: "Syndication to Zillow, Redfin, Realtor.com, Trulia, and 97 more — plus an MLS-grade listing.",
      time: "Day 1",
      icon: "broadcast",
    },
    {
      title: "Manage offers",
      desc: "Inbox triages buyers, surfaces high-intent leads, auto-replies to duds, schedules tours.",
      time: "Day 3–14",
      icon: "inbox",
    },
    {
      title: "Close, keep the cash",
      desc: "Docs, disclosures, e-sign, escrow, wire instructions — every step handled by the platform.",
      time: "Day 18",
      icon: "lock",
    },
  ];

  return (
    <section className="how" id="how-it-works">
      <div className="container">
        <div className="how-head reveal">
          <div>
            <div className="eyebrow">How it works</div>
            <h2 className="display">
              From &ldquo;let&rsquo;s sell&rdquo; to &ldquo;sold&rdquo; — in under
              three weeks.
            </h2>
          </div>
          <p>
            Every step is automated by AI, backstopped by a licensed agent when
            you want one. You decide how hands-on we get.
          </p>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="step reveal"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="step-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  {ICONS[s.icon]}
                </svg>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <div className="step-time">{s.time}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ FEATURE GRID ============================ */

function FeatureGrid() {
  const [barTick, setBarTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setBarTick((t) => t + 1), 1800);
    return () => clearInterval(i);
  }, []);
  const activeIdx = barTick % 12;

  return (
    <section className="features" id="features">
      <div className="container">
        <div className="features-head reveal">
          <div className="eyebrow">What you get</div>
          <h2 className="display">
            A full listing stack — without the listing agent.
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 16 }}>
            Every tool a 6% agent would use, running for you in the background.
          </p>
        </div>

        <div className="features-grid">
          <div className="feat big reveal">
            <div>
              <div className="pill" style={{ marginBottom: 16 }}>
                AI · Live
              </div>
              <h3>Pricing engine, trained on 41M comps.</h3>
              <p>
                Set a listing price backed by recent-sale data, neighborhood
                velocity, and your home&rsquo;s features. Updates daily as the
                market moves.
              </p>
            </div>
            <div className="viz">
              <div className="chart-bars">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={i === activeIdx ? "active" : ""}
                    style={{ height: `${30 + ((i * 37) % 70)}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="feat med dark reveal">
            <div>
              <div className="pill pill-lime" style={{ marginBottom: 16 }}>
                100+ sites
              </div>
              <h3>MLS + every major portal.</h3>
              <p>
                Zillow, Redfin, Realtor.com, Trulia, Homes.com, and 97 more —
                one click, full syndication.
              </p>
            </div>
            <div
              className="viz"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "flex-end",
              }}
            >
              {["MLS", "Zillow", "Redfin", "Realtor", "Trulia", "Homes", "+97"].map(
                (t, i) => (
                  <span
                    key={t}
                    className="pill"
                    style={{
                      background: i === 0 ? "var(--lime)" : "var(--ink-3)",
                      color: i === 0 ? "var(--ink)" : "var(--bone)",
                      fontSize: 11,
                    }}
                  >
                    {t}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="feat sm reveal">
            <div>
              <h3 style={{ fontSize: 22 }}>E-sign &amp; docs</h3>
              <p>
                Every disclosure, contract, and addendum — pre-filled and
                tracked.
              </p>
            </div>
            <div
              className="viz"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                justifyContent: "flex-end",
              }}
            >
              {["Listing agreement", "Seller disclosure", "Purchase contract"].map(
                (t) => (
                  <div
                    key={t}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "var(--bone-2)",
                      borderRadius: 10,
                      fontSize: 12,
                      fontFamily: "var(--sf-font-mono)",
                    }}
                  >
                    <span>{t}</span>
                    <span style={{ color: "var(--lime-deep)" }}>✓ signed</span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="feat sm lime reveal">
            <div>
              <h3 style={{ fontSize: 22 }}>On-call agents</h3>
              <p>Licensed, local, 7 days a week — from $0/call on paid plans.</p>
            </div>
            <div
              className="viz"
              style={{ display: "flex", alignItems: "flex-end", gap: 8 }}
            >
              <div style={{ display: "flex" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "oklch(0.5 0.08 255)",
                    border: "2px solid var(--lime)",
                  }}
                />
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "oklch(0.72 0.18 35)",
                    border: "2px solid var(--lime)",
                    marginLeft: -10,
                  }}
                />
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "oklch(0.3 0.02 255)",
                    border: "2px solid var(--lime)",
                    marginLeft: -10,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--sf-font-mono)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                247 online
              </span>
            </div>
          </div>

          <div className="feat half reveal">
            <div>
              <div className="pill" style={{ marginBottom: 16 }}>
                Inbox AI
              </div>
              <h3>Offer triage that never sleeps.</h3>
              <p>
                Every message from buyers, agents, title, lender — scored,
                summarized, flagged for action. Reply in one tap.
              </p>
            </div>
            <div
              className="viz"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  background: "var(--bone-2)",
                  padding: "10px 14px",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--lime-deep)",
                  }}
                />
                <span style={{ fontSize: 13, flex: 1 }}>
                  <strong>Offer · $782K</strong> · all cash · 10-day close
                </span>
                <span
                  style={{
                    fontFamily: "var(--sf-font-mono)",
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  2m
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  background: "var(--bone-2)",
                  padding: "10px 14px",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "oklch(0.72 0.18 35)",
                  }}
                />
                <span style={{ fontSize: 13, flex: 1 }}>
                  <strong>Tour request</strong> · Sat 2pm
                </span>
                <span
                  style={{
                    fontFamily: "var(--sf-font-mono)",
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  14m
                </span>
              </div>
            </div>
          </div>

          <div className="feat half reveal">
            <div>
              <div className="pill" style={{ marginBottom: 16 }}>
                Showing stats
              </div>
              <h3>Watch demand build in real time.</h3>
              <p>
                Saves, tours, open-house traffic, and offer activity — charted
                so you can reprice with confidence.
              </p>
            </div>
            <div className="viz">
              <svg
                className="chart-svg"
                viewBox="0 0 400 140"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="sf-g1" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="oklch(0.88 0.2 125)"
                      stopOpacity="0.3"
                    />
                    <stop
                      offset="100%"
                      stopColor="oklch(0.88 0.2 125)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M0 110 L40 95 L80 100 L120 80 L160 70 L200 55 L240 60 L280 40 L320 30 L360 20 L400 15 L400 140 L0 140 Z"
                  fill="url(#sf-g1)"
                />
                <path
                  d="M0 110 L40 95 L80 100 L120 80 L160 70 L200 55 L240 60 L280 40 L320 30 L360 20 L400 15"
                  fill="none"
                  stroke="var(--lime-deep)"
                  strokeWidth="2"
                />
                {[0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400].map(
                  (x, i) => {
                    const ys = [110, 95, 100, 80, 70, 55, 60, 40, 30, 20, 15];
                    return (
                      <circle
                        key={x}
                        cx={x}
                        cy={ys[i]}
                        r="3"
                        fill="var(--lime-deep)"
                      />
                    );
                  },
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ CASH OFFER ============================ */

function CashOffer() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setPhase((p) => (p + 1) % 4), 2200);
    return () => clearInterval(i);
  }, []);

  const steps = [
    {
      n: "01",
      title: "Share your address",
      desc: "60 seconds. No inspection. No staging.",
      time: "Today",
    },
    {
      n: "02",
      title: "Get a cash offer",
      desc: "Real, vetted-buyer offer within 24 hours.",
      time: "Day 1",
    },
    {
      n: "03",
      title: "Pick your close date",
      desc: "Anywhere from 7 to 90 days out. You choose.",
      time: "Day 2",
    },
    {
      n: "04",
      title: "Cash in your account",
      desc: "Wire transfer. No commissions. No repairs.",
      time: "Day 7+",
    },
  ];

  return (
    <section className="cash" id="cash-offer">
      <div className="container">
        <div className="cash-grid">
          <div className="reveal">
            <div className="eyebrow" style={{ color: "var(--lime)" }}>
              Cash offer · Optional
            </div>
            <h2 className="display">
              Don&rsquo;t want to list? Take a <em>cash offer</em> in 24 hours.
            </h2>
            <p className="cash-sub">
              Skip the listing entirely. Our network of institutional and
              investor buyers will make a real cash offer on your home — no
              repairs, no showings, no commission.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 32,
              }}
            >
              <a href="/get-started" className="btn btn-lime btn-lg">
                Request a cash offer
              </a>
              <a href="#compare" className="btn btn-dark-ghost btn-lg">
                How it compares
              </a>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
                maxWidth: 460,
              }}
            >
              <div
                style={{
                  paddingLeft: 16,
                  borderLeft: "1px solid var(--line-dark)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--sf-font-display)",
                    fontSize: 32,
                    color: "var(--lime)",
                  }}
                >
                  24 hrs
                </div>
                <div
                  style={{
                    fontFamily: "var(--sf-font-mono)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--muted-dark)",
                    marginTop: 4,
                  }}
                >
                  To first offer
                </div>
              </div>
              <div
                style={{
                  paddingLeft: 16,
                  borderLeft: "1px solid var(--line-dark)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--sf-font-display)",
                    fontSize: 32,
                    color: "var(--lime)",
                  }}
                >
                  0%
                </div>
                <div
                  style={{
                    fontFamily: "var(--sf-font-mono)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--muted-dark)",
                    marginTop: 4,
                  }}
                >
                  Commission on cash sale
                </div>
              </div>
            </div>
          </div>

          <div className="cash-panel reveal">
            <div className="cash-badge">Live buyer network · 284 active</div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--sf-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted-dark)",
                  }}
                >
                  Cash offer timeline
                </div>
                <div
                  style={{
                    fontFamily: "var(--sf-font-display)",
                    fontSize: 28,
                    marginTop: 4,
                  }}
                >
                  From address to wire: 7 days
                </div>
              </div>
            </div>
            <div className="cash-timeline">
              {steps.map((s, i) => (
                <div
                  key={s.n}
                  className="cash-step"
                  style={{
                    opacity: phase >= i ? 1 : 0.4,
                    transition: "opacity 0.5s",
                  }}
                >
                  <div
                    className="cash-step-num"
                    style={{
                      color: phase === i ? "var(--lime)" : "var(--muted-dark)",
                    }}
                  >
                    {s.n}
                  </div>
                  <div className="cash-step-content" style={{ flex: 1 }}>
                    <h4>{s.title}</h4>
                    <p>{s.desc}</p>
                  </div>
                  <div className="cash-step-time">{s.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ COMPARE TABLE ============================ */

type Cell = string | boolean;

function CompareTable() {
  const rows: {
    name: string;
    sub?: string;
    us: Cell;
    agent: Cell;
    fsbo: Cell;
  }[] = [
    {
      name: "Listing commission",
      sub: "On a $750K home",
      us: "$0–$2,999 flat",
      agent: "$45,000",
      fsbo: "$0",
    },
    { name: "MLS + Zillow + 100 sites", us: true, agent: true, fsbo: false },
    { name: "Professional photos", us: true, agent: true, fsbo: false },
    {
      name: "Pricing + comps analysis",
      us: "AI + agent review",
      agent: "Agent only",
      fsbo: "DIY",
    },
    { name: "Licensed agent support", us: "On-demand", agent: true, fsbo: false },
    { name: "Offer & contract handling", us: true, agent: true, fsbo: "DIY" },
    { name: "Closing coordinator", us: true, agent: true, fsbo: false },
    { name: "Cash-offer option", us: true, agent: false, fsbo: false },
    { name: "Avg. time to sale", us: "18 days", agent: "32 days", fsbo: "47 days" },
  ];

  const CellRender = ({ v, us }: { v: Cell; us?: boolean }) => {
    if (v === true) return <span className="check">✓</span>;
    if (v === false) return <span className="x">—</span>;
    return <span className={"cell " + (us ? "us" : "")}>{v}</span>;
  };

  return (
    <section className="compare" id="compare">
      <div className="container">
        <div className="compare-head reveal">
          <div className="eyebrow">Side-by-side</div>
          <h2 className="display">Everything a 6% agent does. None of the 6%.</h2>
        </div>
        <div className="compare-table reveal">
          <div className="compare-table-head">
            <div>Feature</div>
            <div className="compare-col-us">sellfree.ai</div>
            <div>Traditional agent</div>
            <div>FSBO (alone)</div>
          </div>
          {rows.map((r) => (
            <div key={r.name} className="compare-row-data">
              <div className="feat-name">
                {r.name}
                {r.sub ? <span className="sub">{r.sub}</span> : null}
              </div>
              <div>
                <CellRender v={r.us} us />
              </div>
              <div>
                <CellRender v={r.agent} />
              </div>
              <div>
                <CellRender v={r.fsbo} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ TESTIMONIALS ============================ */

const TESTIMONIALS = [
  {
    name: "Jess & Terry",
    loc: "Boulder, CO",
    saved: "$65K",
    quote:
      "\"We saved sixty-five grand and never felt like we were on our own. When we needed a human, they were right there.\"",
    headline: "Jess & Terry saved",
    amount: "$65,000",
    sub: "The platform paid for itself in the first 48 hours.",
  },
  {
    name: "Bradd",
    loc: "Yorba Linda, CA",
    saved: "$130K",
    quote:
      "\"Listed the home, hosted four open houses, opened escrow in under a week. Sale closed $135K over asking.\"",
    headline: "Bradd sold",
    amount: "$135K over ask",
    sub: "Four open houses. Escrow in seven days. No agent.",
  },
  {
    name: "Lorraine",
    loc: "Denver, CO",
    saved: "$14K",
    quote:
      "\"I was skeptical. The AI walked me through disclosures better than my last agent ever did.\"",
    headline: "Lorraine closed in",
    amount: "11 days",
    sub: "From listing to contract — faster than a traditional agent.",
  },
  {
    name: "Mike & Dana",
    loc: "Austin, TX",
    saved: "$42K",
    quote:
      "\"Cash offer option was the closer for us. Got three offers within 24 hours, picked the best one.\"",
    headline: "Mike & Dana took",
    amount: "$42K in savings",
    sub: "Three cash offers in 24 hours. Picked the best, closed in 12 days.",
  },
];

function Testimonials() {
  const [active, setActive] = useState(0);
  const t = TESTIMONIALS[active];

  return (
    <section className="testi" id="stories">
      <div className="container">
        <div className="testi-head reveal">
          <div className="eyebrow" style={{ color: "var(--lime)" }}>
            Seller stories
          </div>
          <h2 className="display">
            Homeowners are saving an average of{" "}
            <span className="amt">$41,290.</span>
          </h2>
          <p
            style={{
              color: "var(--muted-dark)",
              fontSize: 16,
              maxWidth: 620,
              margin: "0 auto",
            }}
          >
            Across every price point, every market, every closing timeline.
          </p>
        </div>

        <div className="testi-grid reveal">
          <div className="testi-list">
            {TESTIMONIALS.map((x, i) => (
              <button
                key={x.name}
                type="button"
                className={"testi-item " + (active === i ? "active" : "")}
                onClick={() => setActive(i)}
              >
                <div className="testi-item-head">
                  <div className="testi-person">
                    <div
                      className="testi-avatar"
                      style={{
                        background: `repeating-linear-gradient(${i * 47}deg, oklch(0.4 0.04 ${i * 60}) 0 6px, oklch(0.3 0.02 255) 6px 12px)`,
                      }}
                    />
                    <div>
                      <div className="name">{x.name}</div>
                      <div className="loc">{x.loc}</div>
                    </div>
                  </div>
                  <span className="testi-saved">Saved {x.saved}</span>
                </div>
                <div className="testi-quote">{x.quote}</div>
              </button>
            ))}
          </div>

          <div className="testi-feature">
            <div className="testi-feature-img img-ph">
              <span className="img-ph-tag">portrait · seller at home</span>
              <div
                style={{
                  fontFamily: "var(--sf-font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                }}
              >
                {t.name.toLowerCase()}_kitchen_morning.jpg
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 280 }}>
                <h3>
                  {t.headline} <em>{t.amount}</em>
                </h3>
                <p>{t.sub}</p>
              </div>
              <a href="/get-started" className="btn btn-lime">
                Read full story
                <ArrowRight />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ FAQ ============================ */

const FAQS = [
  {
    q: "Is it really free to list?",
    a: "Yes — our Starter plan is $0 to list your home on the MLS and 100+ portals, with our AI pricing and marketing tools. You'll only pay standard closing costs (title, escrow, transfer taxes) at the end, like with any sale. Upgrade to Essentials or Pro if you want hands-on agent support.",
  },
  {
    q: "How do you make money if it's free?",
    a: "We partner with vetted title, escrow, and mortgage providers who pay us a referral when our sellers opt in — at no markup. We also earn on our Essentials and Pro plans, where sellers pay a flat fee for extra support. You never pay a percentage commission.",
  },
  {
    q: "What does a 'licensed agent' actually do here?",
    a: "On Essentials ($799) and Pro ($2,999) plans, a licensed agent in your state is assigned to your listing. They review your pricing, negotiate offers on your behalf if you want, attend closing, and answer questions on demand — by phone, chat, or video.",
  },
  {
    q: "How is the cash offer different from Opendoor or Offerpad?",
    a: "We don't buy your home — we route your info to a vetted network of investor and institutional buyers who bid competitively. That means you'll see multiple cash offers, not just one. You keep full control over who to pick, or whether to take any of them.",
  },
  {
    q: "Can I actually save $40K+?",
    a: "On a $750K home, a traditional 6% commission is $45,000. Our Pro plan is a $2,999 flat fee — that's $42,001 in savings. Savings scale with home price. Use the calculator above with your own home value.",
  },
  {
    q: "What if I get stuck or things go sideways?",
    a: "Every paid plan includes a licensed agent and a closing coordinator. If you're on the free plan and need help, you can upgrade mid-listing or book a one-off consult at $99.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="faq-inner">
          <div className="reveal">
            <div className="eyebrow">FAQ</div>
            <h2 className="display">The honest answers.</h2>
            <p style={{ color: "var(--ink-3)", fontSize: 15, maxWidth: 300 }}>
              Can&rsquo;t find what you&rsquo;re looking for?{" "}
              <a
                href="/get-started"
                style={{ color: "var(--ink)", textDecoration: "underline" }}
              >
                Talk to a licensed agent
              </a>
              .
            </p>
          </div>
          <div className="faq-list reveal">
            {FAQS.map((f, i) => (
              <div
                key={f.q}
                className={"faq-item " + (open === i ? "open" : "")}
              >
                <button
                  type="button"
                  className="faq-q"
                  onClick={() => setOpen(open === i ? -1 : i)}
                  aria-expanded={open === i}
                >
                  <span>{f.q}</span>
                  <span className="plus">+</span>
                </button>
                <div className="faq-a">
                  <div className="faq-a-inner">{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ FINAL CTA ============================ */

function FinalCTA() {
  return (
    <section className="final">
      <div className="final-hero-word">sellfree</div>
      <div className="container">
        <div className="final-inner reveal">
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Ready when you are
          </div>
          <h2 className="display">
            Keep the <em>commission.</em>
          </h2>
          <p className="final-sub">
            30-second signup. Free to list. Save the average seller $41,290.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <LandingAddressInput
              buttonLabel="Start free"
              buttonClassName="btn btn-primary"
            />
          </div>
          <div
            style={{
              marginTop: 24,
              fontFamily: "var(--sf-font-mono)",
              fontSize: 12,
              color: "var(--ink)",
              opacity: 0.6,
            }}
          >
            No card required · Cancel anytime · Licensed in all 50 states
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ FOOTER ============================ */

function Footer() {
  return (
    <footer className="sf-footer">
      <div className="footer-huge">sellfree</div>
      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="wordmark">
              <span className="dot">sellfree</span>
              <span className="ai">.ai</span>
            </span>
            <p>
              Sell your home on your terms — for a flat fee, not a 6%
              commission. Licensed in all 50 states.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#savings">Pricing plans</a></li>
              <li><a href="#cash-offer">Cash offer</a></li>
              <li><a href="#savings">Savings calculator</a></li>
              <li><a href="/get-started">Start your listing</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Learn</h4>
            <ul>
              <li><a href="#faq">Seller FAQ</a></li>
              <li><a href="#compare">Agent vs. sellfree</a></li>
              <li><a href="#savings">True cost analysis</a></li>
              <li><a href="#features">Platform features</a></li>
              <li><a href="#stories">Seller stories</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="/get-started">Get started</a></li>
              <li><a href="#stories">Stories</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li>
                <a href="mailto:hi@sellfree.ai" style={{ color: "var(--lime)" }}>
                  hi@sellfree.ai
                </a>
              </li>
              <li style={{ color: "var(--muted-dark)", fontSize: 13 }}>
                sellfree.ai, Inc.
              </li>
              <li style={{ color: "var(--muted-dark)", fontSize: 13 }}>
                1890 Market Street
              </li>
              <li style={{ color: "var(--muted-dark)", fontSize: 13 }}>
                San Francisco, CA 94102
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} sellfree.ai, Inc. — Licensed broker in
            50 states.
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="/get-started" style={{ color: "inherit", textDecoration: "none" }}>
              Start free
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================ FLOATING CTA ============================ */

function FloatCTA() {
  return (
    <button
      type="button"
      className="float-cta"
      onClick={() =>
        document
          .getElementById("savings")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    >
      <span className="dot-blink" />
      Calculate your savings
    </button>
  );
}

function ArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
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

/* ============================ ROOT ============================ */

export function LandingPage() {
  useReveal();
  return (
    <div className="sellfree-root">
      <Nav />
      <Hero />
      <Marquee />
      <PressBar />
      <KpiStrip />
      <Calculator />
      <HowItWorks />
      <FeatureGrid />
      <CashOffer />
      <CompareTable />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
      <FloatCTA />
    </div>
  );
}

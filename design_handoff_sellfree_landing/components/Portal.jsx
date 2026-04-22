const { useState: useStateP, useEffect: useEffectP, useRef: useRefP } = React;

// ============ SHARED PORTAL DATA (localStorage-backed) ============
const PORTAL_KEY = "sellfree:portal";
function loadPortal() {
  try { return JSON.parse(localStorage.getItem(PORTAL_KEY) || "null"); } catch { return null; }
}
function savePortal(d) {
  try { localStorage.setItem(PORTAL_KEY, JSON.stringify(d)); } catch {}
}

function seedPortal() {
  const flow = (() => { try { return JSON.parse(localStorage.getItem("sellfree:flow") || "{}"); } catch { return {}; } })();
  const seed = flow.seedAddress || { addr: "1429 Maple Grove Lane", city: "Austin, TX 78704" };
  const data = flow.data || { beds: 3, baths: 2, sqft: 1840, year: 1998, lot: "0.21 ac", type: "Single Family", est: 742000, tax: "$6,840/yr" };
  const first = (flow.name || "Alex").split(" ")[0];
  return {
    user: { name: flow.name || "Alex Rivera", first, email: flow.email || "alex@email.com", avatarSeed: 2 },
    property: {
      addr: seed.addr,
      city: seed.city,
      beds: data.beds, baths: data.baths, sqft: data.sqft, year: data.year, lot: data.lot,
      estValue: data.est,
      listPrice: Math.round(data.est * 1.01 / 1000) * 1000,
      avgDom: 22,
      daysOnMarket: 0,
      pricedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    },
    plan: { name: "Full-Service Lite", price: 2999, features: ["MLS + 100 portals", "Pro photos + 3D tour", "Offer negotiation", "Closing coordination"] },
    team: {
      tc: { name: "Jordan Nakamura", role: "Transaction coordinator", seed: 1, phone: "(512) 555-0188", email: "jordan@sellfree.ai", responseTime: "< 4 hrs" },
      agent: { name: "Priya Shah", role: "On-demand licensed agent", seed: 4, license: "TX #683442", rating: 4.97 },
    },
    offers: [
      { id: "cash-plus", name: "Cash+", label: "Sell at peak price", low: 725000, high: 758000, popular: true, lender: "Knock · backed by sellfree", closes: "As fast as 14 days", terms: ["No showings required", "Keep up to 98% of market", "3.5% service fee"], tone: "lime" },
      { id: "snml", name: "SNML", label: "Sell now, move later", low: 688000, high: 720000, popular: false, lender: "Flyhomes partners", closes: "14-day close · 90-day leaseback", terms: ["Lease back from buyer", "90 days to move", "2% leaseback rent"], tone: "dark" },
      { id: "cash", name: "Cash", label: "Certain cash in hand", low: 650000, high: 685000, popular: false, lender: "Opendoor · Offerpad", closes: "As fast as 7 days", terms: ["No repairs needed", "Waived contingencies", "7% service fee"], tone: "bone" },
    ],
    listing: {
      url: "sellfree.ai/listing/1429-maple-grove",
      zillow: "zillow.com/homedetails/1429-maple-grove",
      mlsId: "AUS-2481993",
      status: "Draft — awaiting your approval",
      views: 0, saves: 0, leads: 0, showings: 0, offers: 0,
      photos: 12, photosReady: false,
    },
    todos: [
      { id: "approve-photos", title: "Approve listing photos", detail: "Your photographer delivered 24 shots. Review + approve to go live.", urgent: true, done: false },
      { id: "sign-agreement", title: "Sign listing agreement", detail: "Standard sellfree disclosure + exclusive listing terms.", urgent: true, done: false },
      { id: "confirm-price", title: "Confirm list price", detail: "We're recommending $749,000 based on 6 comps. You can adjust.", urgent: false, done: true },
      { id: "schedule-walkthrough", title: "Schedule optional walkthrough", detail: "30-min video call with your TC to review prep.", urgent: false, done: false },
    ],
    docs: [
      { name: "Exclusive listing agreement", type: "PDF", status: "awaiting-signature", dated: "Apr 21" },
      { name: "Property disclosure (Form T-47)", type: "PDF", status: "draft", dated: "Apr 20" },
      { name: "HOA bylaws + financials", type: "PDF · 3 files", status: "received", dated: "Apr 19" },
      { name: "Title report (preliminary)", type: "PDF", status: "in-progress", dated: "Apr 22" },
    ],
    guides: [
      { title: "Staging on a weekend budget", read: "8 min", tag: "Prep", heat: 95 },
      { title: "What to fix before photos", read: "5 min", tag: "Prep", heat: 88 },
      { title: "How to read your offer sheet", read: "6 min", tag: "Offers", heat: 76 },
      { title: "Closing costs — what to expect", read: "7 min", tag: "Closing", heat: 72 },
    ],
    ai: {
      recentQuestions: [
        "What's a fair counter to a 93% list-price offer?",
        "Do I need to disclose the 2022 foundation repair?",
        "When should I drop my list price?",
      ],
    },
    pricingRationale: {
      comps: [
        { addr: "1412 Maple Grove", ppsqft: 407, sold: "Mar 28", price: 745000, days: 17 },
        { addr: "1520 Barton Springs", ppsqft: 412, sold: "Apr 3", price: 762000, days: 24 },
        { addr: "1405 Linden Ln", ppsqft: 398, sold: "Feb 14", price: 735000, days: 31 },
        { addr: "1610 Maple Grove", ppsqft: 421, sold: "Apr 11", price: 775000, days: 12 },
      ],
      logic: "6 comps within 0.4mi, 90-day window. Median $/sqft: $409. Your home at $406/sqft = $749K — priced to sell in under 20 days.",
      confidence: 94,
    },
  };
}

function usePortalData() {
  const [data, setData] = useStateP(() => loadPortal() || seedPortal());
  useEffectP(() => { savePortal(data); }, [data]);
  return [data, setData];
}

// ============ LOADING PAGE ============
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

function PortalLoading() {
  const [tick, setTick] = useStateP(0);
  const [progress, setProgress] = useStateP(0);
  const startRef = useRefP(Date.now());

  useEffectP(() => {
    let raf;
    const total = 7200;
    const loop = () => {
      const elapsed = Date.now() - startRef.current;
      setTick(elapsed);
      setProgress(Math.min(elapsed / total, 1));
      if (elapsed < total) raf = requestAnimationFrame(loop);
      else {
        // seed portal data, then navigate
        savePortal(seedPortal());
        setTimeout(() => { window.location.hash = "#/portal"; }, 400);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const currentStep = LOADING_STEPS.findIndex((s, i) => {
    const next = LOADING_STEPS[i + 1];
    return !next || tick < next.t;
  });

  const flow = (() => { try { return JSON.parse(localStorage.getItem("sellfree:flow") || "{}"); } catch { return {}; } })();
  const first = (flow.name || "there").split(" ")[0];
  const seed = flow.seedAddress || { addr: "your property", city: "" };

  return (
    <div className="portal-loading">
      <div className="portal-loading-stars">
        {Array.from({ length: 48 }).map((_, i) => (
          <span key={i} style={{
            left: `${(i * 37.1) % 100}%`,
            top: `${(i * 53.7) % 100}%`,
            animationDelay: `${(i * 0.07) % 2}s`,
            opacity: 0.3 + ((i * 7) % 10) / 20,
          }}/>
        ))}
      </div>

      <div className="portal-loading-inner">
        <div className="wordmark" style={{fontSize: 20, marginBottom: 48}}>
          <span className="dot" style={{color: "var(--bone)"}}>sellfree</span><span className="ai" style={{color: "var(--lime)"}}>.ai</span>
        </div>

        <div className="eyebrow" style={{color: "var(--lime)", marginBottom: 14, letterSpacing: "0.12em"}}>Setting up your portal</div>
        <h1 className="portal-loading-title">
          Building your sale,<br/>
          <span style={{fontStyle: "italic", color: "var(--lime)"}}>{first}.</span>
        </h1>
        <p className="portal-loading-sub">
          We're pulling records, running comps, assembling offers, and drafting your listing for <strong style={{color: "var(--bone)"}}>{seed.addr}</strong>. This takes about 60 seconds.
        </p>

        <div className="portal-loading-card">
          <div className="pl-steps">
            {LOADING_STEPS.map((s, i) => {
              const state = i < currentStep ? "done" : i === currentStep ? "active" : "pending";
              return (
                <div key={i} className={"pl-step pl-" + state}>
                  <div className="pl-step-indicator">
                    {state === "done" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    {state === "active" && <span className="pl-spinner"/>}
                    {state === "pending" && <span className="pl-dot"/>}
                  </div>
                  <div className="pl-step-body">
                    <div className="pl-step-label">{s.label}</div>
                    <div className="pl-step-source">{s.source}</div>
                  </div>
                  {state === "done" && <div className="pl-step-time">✓</div>}
                  {state === "active" && <div className="pl-step-time pl-pulse">●●●</div>}
                </div>
              );
            })}
          </div>

          <div className="pl-progress-wrap">
            <div className="pl-progress-bar"><div className="pl-progress-fill" style={{width: `${progress * 100}%`}}/></div>
            <div className="pl-progress-meta">
              <span>{Math.round(progress * 100)}% complete</span>
              <span>Est. {Math.max(0, Math.round((7200 - tick) / 1000))}s remaining</span>
            </div>
          </div>
        </div>

        <div className="pl-fact">
          <div className="pl-fact-n">{Math.round(progress * 847).toLocaleString()}</div>
          <div className="pl-fact-k">data points analyzed</div>
          <span className="pl-fact-sep"/>
          <div className="pl-fact-n">{Math.round(progress * 42)}</div>
          <div className="pl-fact-k">comps reviewed</div>
          <span className="pl-fact-sep"/>
          <div className="pl-fact-n">{Math.round(progress * 3)}</div>
          <div className="pl-fact-k">cash offers generated</div>
        </div>
      </div>
    </div>
  );
}

// ============ PORTAL SHELL ============
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
];

function Portal() {
  const [data] = usePortalData();
  const [active, setActive] = useStateP("overview");

  useEffectP(() => {
    const on = () => {
      const h = (window.location.hash || "").split("/");
      const last = h[h.length - 1];
      if (NAV_ITEMS.some(n => n.id === last)) setActive(last);
    };
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (id) => {
    setActive(id);
    window.location.hash = `#/portal/${id}`;
    window.scrollTo({top: 0, behavior: "instant"});
  };

  return (
    <div className="portal">
      <PortalTopBar data={data}/>
      <div className="portal-frame">
        <aside className="portal-side">
          <div className="portal-side-label">Your home sale</div>
          <nav className="portal-nav">
            {NAV_ITEMS.map(n => (
              <button key={n.id} className={"portal-nav-item " + (active === n.id ? "active" : "")} onClick={() => go(n.id)}>
                {n.label}
                {n.id === "offers" && <span className="portal-nav-badge">3</span>}
                {n.id === "docs" && <span className="portal-nav-badge portal-nav-badge-alert">2</span>}
              </button>
            ))}
          </nav>
          <div className="portal-side-footer">
            <div className="portal-side-plan">
              <div className="eyebrow" style={{color: "var(--lime-deep)"}}>Current plan</div>
              <div className="portal-side-plan-name">{data.plan.name}</div>
              <div className="portal-side-plan-price">${data.plan.price.toLocaleString()} flat</div>
              <button className="portal-side-plan-cta" onClick={() => go("plan")}>Manage →</button>
            </div>
          </div>
        </aside>

        <main className="portal-main">
          {active === "overview" && <OverviewSection data={data} go={go}/>}
          {active === "offers" && <OffersSection data={data}/>}
          {active === "listing" && <ListingSection data={data}/>}
          {active === "photos" && <PhotosSection data={data}/>}
          {active === "team" && <TeamSection data={data}/>}
          {active === "ai" && <AISection data={data}/>}
          {active === "docs" && <DocsSection data={data}/>}
          {active === "guides" && <GuidesSection data={data}/>}
          {active === "plan" && <PlanSection data={data}/>}
        </main>
      </div>
    </div>
  );
}

// ============ TOP BAR ============
function PortalTopBar({ data }) {
  return (
    <header className="portal-topbar">
      <a href="#/" className="wordmark" style={{textDecoration: "none", fontSize: 16}}>
        <span className="dot">sellfree</span><span className="ai">.ai</span>
      </a>
      <div className="portal-topbar-addr">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{opacity: 0.5}}>
          <path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span>{data.property.addr}, {data.property.city}</span>
        <span className="portal-topbar-status"><span className="dot-blink"/> Listing ready</span>
      </div>
      <div className="portal-topbar-user">
        <button className="portal-topbar-icon" aria-label="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 16v-5a6 6 0 00-12 0v5l-2 3h16l-2-3zM10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <span className="portal-topbar-dot"/>
        </button>
        <div className="portal-topbar-avatar" style={{background: "oklch(0.72 0.18 35)"}}>{data.user.first[0]}</div>
        <div style={{fontSize: 13, whiteSpace: "nowrap"}}>
          <div style={{fontWeight: 600, lineHeight: 1.1}}>{data.user.name}</div>
          <div style={{fontSize: 11, color: "var(--muted)", marginTop: 2}}>Seller</div>
        </div>
      </div>
    </header>
  );
}

// ============ OVERVIEW ============
function OverviewSection({ data, go }) {
  const p = data.property;
  const urgent = data.todos.filter(t => t.urgent && !t.done);
  const progress = data.todos.filter(t => t.done).length / data.todos.length;

  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Hello, {data.user.first}</div>
          <h1 className="portal-h1">Welcome to your portal.</h1>
          <p className="portal-lede">Everything about your sale lives here — offers, listing, docs, your team. Start with what needs your attention.</p>
        </div>
        <div className="portal-head-chip">
          <span className="dot-blink"/>
          Day 1 · listing draft ready
        </div>
      </div>

      {/* Property snapshot */}
      <div className="portal-prop-snap">
        <div className="portal-prop-img"/>
        <div className="portal-prop-body">
          <div className="portal-prop-addr">{p.addr}<br/><span>{p.city}</span></div>
          <div className="portal-prop-specs">
            <span><strong>{p.beds}</strong> bd</span>
            <span><strong>{p.baths}</strong> ba</span>
            <span><strong>{p.sqft.toLocaleString()}</strong> sqft</span>
            <span>{p.lot} lot · built {p.year}</span>
          </div>
          <div className="portal-prop-stats">
            <div><div className="k">Recommended list</div><div className="v">${(p.listPrice/1000).toFixed(0)}K</div></div>
            <div><div className="k">Est. value</div><div className="v">${(p.estValue/1000).toFixed(0)}K</div></div>
            <div><div className="k">Avg days on market</div><div className="v">{p.avgDom}d</div></div>
            <div><div className="k">Your est. savings</div><div className="v" style={{color: "var(--lime-deep)"}}>${Math.round(p.estValue * 0.06 - 2999).toLocaleString()}</div></div>
          </div>
        </div>
      </div>

      {/* To-Do + What's next */}
      <div className="portal-two-col">
        <div className="portal-card portal-todo-card">
          <div className="portal-card-head">
            <div>
              <div className="eyebrow">To-do · {urgent.length} urgent</div>
              <h3>What needs you.</h3>
            </div>
            <div className="portal-todo-progress">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" stroke="var(--line)" strokeWidth="3" fill="none"/>
                <circle cx="24" cy="24" r="20" stroke="var(--lime-deep)" strokeWidth="3" fill="none" strokeDasharray={`${progress * 125.6} 125.6`} transform="rotate(-90 24 24)" strokeLinecap="round"/>
              </svg>
              <span>{Math.round(progress * 100)}%</span>
            </div>
          </div>
          <div className="portal-todo-list">
            {data.todos.map(t => (
              <div key={t.id} className={"portal-todo " + (t.done ? "done" : "") + (t.urgent && !t.done ? " urgent" : "")}>
                <div className="portal-todo-check">
                  {t.done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg> : null}
                </div>
                <div className="portal-todo-body">
                  <div className="portal-todo-title">{t.title}{t.urgent && !t.done && <span className="urgent-tag">Urgent</span>}</div>
                  <div className="portal-todo-detail">{t.detail}</div>
                </div>
                {!t.done && <button className="portal-todo-cta">→</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="portal-card portal-next-card">
          <div className="eyebrow" style={{color: "var(--lime)"}}>What's next</div>
          <h3 style={{color: "var(--bone)"}}>Your listing goes live in <em style={{fontStyle: "italic"}}>~48 hours.</em></h3>
          <div className="portal-next-timeline">
            <div className="pnt-row active">
              <span className="pnt-dot"/>
              <div><div className="pnt-t">Now</div><div className="pnt-l">Approve photos + sign listing agreement</div></div>
            </div>
            <div className="pnt-row">
              <span className="pnt-dot"/>
              <div><div className="pnt-t">Apr 24</div><div className="pnt-l">Listing goes live on MLS + 100 portals</div></div>
            </div>
            <div className="pnt-row">
              <span className="pnt-dot"/>
              <div><div className="pnt-t">Apr 25–28</div><div className="pnt-l">Showings + offer window opens</div></div>
            </div>
            <div className="pnt-row">
              <span className="pnt-dot"/>
              <div><div className="pnt-t">~May 14</div><div className="pnt-l">Under contract (median projection)</div></div>
            </div>
            <div className="pnt-row">
              <span className="pnt-dot"/>
              <div><div className="pnt-t">~Jun 12</div><div className="pnt-l">Closing + funds disbursed</div></div>
            </div>
          </div>
          <button className="btn btn-lime btn-lg" onClick={() => go("offers")}>Review your 3 cash offers →</button>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="portal-quick-links">
        <button className="portal-quick" onClick={() => go("offers")}>
          <div className="pq-k">Cash offers</div>
          <div className="pq-v">3 ready</div>
          <div className="pq-sub">High: ${(data.offers[0].high/1000).toFixed(0)}K</div>
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

// ============ CASH OFFERS ============
function OffersSection({ data }) {
  const p = data.property;
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Cash offers · 3 options</div>
          <h1 className="portal-h1">Your cash offers.</h1>
          <p className="portal-lede">Pre-qualified cash buyers, negotiated through sellfree's partner network. Estimates update in real-time based on your property.</p>
        </div>
      </div>

      {/* Property strip */}
      <div className="offer-prop-strip">
        <div style={{minWidth: 0, flex: 1}}>
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
          <div>${(p.listPrice/1000).toFixed(0)}K</div>
        </div>
      </div>

      <div className="offers-grid">
        {data.offers.map((o, i) => (
          <OfferCard key={o.id} offer={o} index={i}/>
        ))}
      </div>

      <div className="offer-disclaimer">
        *These numbers are estimates of your home's full market offer. Your final number will be returned once full evaluation is complete. No obligation to accept.
      </div>

      <div className="offer-help">
        <div className="offer-help-person">
          <div className="offer-help-avatar" style={{background: "oklch(0.82 0.08 80)"}}>JF</div>
          <div>
            <div className="eyebrow">Need help understanding your offer?</div>
            <div style={{fontFamily: "var(--font-display)", fontSize: 22, marginTop: 2}}>Jake Fritz · Cash offer specialist</div>
            <div style={{fontSize: 12, color: "var(--muted)", marginTop: 2}}>Licensed TX · 12 yrs experience · 4.98 ★ from 340 sellers</div>
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

function OfferCard({ offer, index }) {
  const tones = {
    lime: { bg: "var(--lime)", fg: "var(--ink)", accent: "var(--lime-deep)" },
    dark: { bg: "var(--ink)", fg: "var(--bone)", accent: "var(--lime)" },
    bone: { bg: "var(--bone-2)", fg: "var(--ink)", accent: "var(--ink-3)" },
  };
  const t = tones[offer.tone];

  return (
    <div className={"offer-card offer-" + offer.tone + (offer.popular ? " popular" : "")}>
      {offer.popular && <div className="offer-popular-ribbon">Most popular offer</div>}
      <div className="offer-card-hero" style={{background: t.bg, color: t.fg}}>
        <div className="offer-hero-head">
          <div>
            <div style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6}}>Offer 0{index + 1}</div>
            <div className="offer-hero-name">{offer.name}</div>
            <div className="offer-hero-label">{offer.label}</div>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{opacity: 0.25}}>
            <path d="M3 9l9-6 9 6v12H3V9z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
        <div className="offer-hero-range">
          <div style={{fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", opacity: 0.7, textTransform: "uppercase", marginBottom: 4}}>Estimated offer range</div>
          <div className="offer-range-nums">
            <span>${(offer.low/1000).toFixed(0)}K</span>
            <span className="offer-range-dash">—</span>
            <span>${(offer.high/1000).toFixed(0)}K</span>
          </div>
        </div>
      </div>

      <div className="offer-card-body">
        <div className="offer-body-row"><span className="k">Backed by</span><span className="v">{offer.lender}</span></div>
        <div className="offer-body-row"><span className="k">Close timeline</span><span className="v">{offer.closes}</span></div>
        <ul className="offer-terms">
          {offer.terms.map((term, i) => (
            <li key={i}><span className="offer-term-check">✓</span>{term}</li>
          ))}
        </ul>
        <button className="btn btn-primary offer-cta">Request offer details</button>
        <button className="offer-feedback-link">Send feedback on this offer</button>
      </div>
    </div>
  );
}

// ============ LISTING ============
function ListingSection({ data }) {
  const l = data.listing;
  const p = data.property;
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Your listing · {l.status}</div>
          <h1 className="portal-h1">Listing & performance.</h1>
          <p className="portal-lede">Your live listing, traffic, and where your property appears. Goes live once you approve photos + sign.</p>
        </div>
      </div>

      <div className="listing-hero">
        <div className="listing-hero-photos">
          {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="listing-photo" style={{background: ["linear-gradient(135deg, oklch(0.72 0.09 35), oklch(0.5 0.06 255))", "linear-gradient(180deg, oklch(0.85 0.05 90), oklch(0.65 0.05 90))", "linear-gradient(45deg, oklch(0.82 0.08 125), oklch(0.55 0.06 160))", "linear-gradient(135deg, oklch(0.35 0.04 255), oklch(0.2 0.015 255))"][i]}}>
              {i === 3 && <div className="listing-photo-more">+{l.photos - 3}</div>}
            </div>
          ))}
        </div>
        <div className="listing-hero-body">
          <div className="listing-hero-badge"><span className="dot-blink"/>Draft — awaiting approval</div>
          <div className="listing-hero-price">${(p.listPrice/1000).toFixed(0)}K</div>
          <div className="listing-hero-addr">{p.addr}, {p.city}</div>
          <div className="listing-hero-specs">{p.beds} bd · {p.baths} ba · {p.sqft.toLocaleString()} sqft</div>
          <div className="listing-hero-ctas">
            <button className="btn btn-primary">Preview full listing →</button>
            <button className="btn btn-ghost">Edit copy</button>
          </div>
        </div>
      </div>

      {/* Portals */}
      <div className="listing-portals">
        <div className="eyebrow" style={{marginBottom: 14}}>Where your listing will appear · 100 portals</div>
        <div className="listing-portal-grid">
          {[
            { name: "MLS Austin (ACTRIS)", status: "queued", url: l.mlsId },
            { name: "Zillow", status: "queued", url: l.zillow },
            { name: "Realtor.com", status: "queued", url: "—" },
            { name: "Redfin", status: "queued", url: "—" },
            { name: "Trulia", status: "queued", url: "—" },
            { name: "Homes.com", status: "queued", url: "—" },
          ].map((p, i) => (
            <div key={i} className="listing-portal-row">
              <div className="lpr-name">{p.name}</div>
              <div className="lpr-status">queued</div>
              <a className="lpr-link" href="#">Open ↗</a>
            </div>
          ))}
        </div>
      </div>

      {/* Traffic */}
      <div className="portal-card">
        <div className="portal-card-head">
          <div>
            <div className="eyebrow">Listing performance</div>
            <h3>Traffic & engagement.</h3>
          </div>
          <span className="pill pill-dark">Updates every 15 min</span>
        </div>
        <div className="listing-stats-grid">
          <div className="listing-stat"><div className="k">Listing views</div><div className="v">{l.views}</div><div className="s">— goes live {p.pricedAt}</div></div>
          <div className="listing-stat"><div className="k">Saves</div><div className="v">{l.saves}</div><div className="s">—</div></div>
          <div className="listing-stat"><div className="k">Buyer leads</div><div className="v">{l.leads}</div><div className="s">—</div></div>
          <div className="listing-stat"><div className="k">Showings booked</div><div className="v">{l.showings}</div><div className="s">—</div></div>
          <div className="listing-stat"><div className="k">Offers received</div><div className="v">{l.offers}</div><div className="s">—</div></div>
        </div>
      </div>

      {/* Pricing rationale */}
      <div className="portal-card">
        <div className="portal-card-head">
          <div>
            <div className="eyebrow">Pricing rationale · AI + human-reviewed</div>
            <h3>Why we recommend ${(p.listPrice/1000).toFixed(0)}K.</h3>
          </div>
          <span className="pill pill-lime">{data.pricingRationale.confidence}% confidence</span>
        </div>
        <p style={{color: "var(--ink-3)", fontSize: 14, lineHeight: 1.55}}>{data.pricingRationale.logic}</p>
        <div className="comps-table">
          <div className="comps-head"><span>Comp</span><span>$/sqft</span><span>Sold price</span><span>Days on market</span><span>Sold</span></div>
          {data.pricingRationale.comps.map((c, i) => (
            <div key={i} className="comps-row">
              <span>{c.addr}</span>
              <span>${c.ppsqft}</span>
              <span>${(c.price/1000).toFixed(0)}K</span>
              <span>{c.days}d</span>
              <span>{c.sold}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ TEAM ============
function TeamSection({ data }) {
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Your team · licensed + on-call</div>
          <h1 className="portal-h1">Your sellfree team.</h1>
          <p className="portal-lede">Two humans dedicated to your sale — plus an AI assistant that never sleeps. Response time under 4 hours, always.</p>
        </div>
      </div>

      <div className="team-grid">
        <TeamCard person={data.team.tc} tone="lime" stats={[{k: "Deals closed", v: "247"}, {k: "Avg response", v: "< 4h"}, {k: "Rating", v: "4.99 ★"}]}/>
        <TeamCard person={data.team.agent} tone="dark" stats={[{k: "License", v: data.team.agent.license}, {k: "Deals closed", v: "183"}, {k: "Rating", v: data.team.agent.rating + " ★"}]}/>
      </div>

      <div className="portal-card">
        <div className="eyebrow" style={{marginBottom: 10}}>How to reach them</div>
        <div className="team-contact-grid">
          <div className="team-contact"><div className="tc-k">In-app chat</div><div className="tc-v">Available 24/7</div></div>
          <div className="team-contact"><div className="tc-k">Email</div><div className="tc-v">{data.team.tc.email}</div></div>
          <div className="team-contact"><div className="tc-k">Phone</div><div className="tc-v">{data.team.tc.phone}</div></div>
          <div className="team-contact"><div className="tc-k">Video call</div><div className="tc-v">By appointment</div></div>
        </div>
      </div>
    </div>
  );
}

function TeamCard({ person, tone, stats }) {
  const colors = ["oklch(0.82 0.08 80)", "oklch(0.72 0.12 25)", "oklch(0.65 0.1 155)", "oklch(0.55 0.08 260)", "oklch(0.78 0.1 50)"];
  const isDark = tone === "dark";
  return (
    <div className={"team-card " + (isDark ? "dark" : "lime")}>
      <div className="team-card-head">
        <div className="team-avatar-lg" style={{background: colors[person.seed % colors.length]}}>
          {person.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div>
          <div className="eyebrow" style={{color: isDark ? "var(--lime)" : "var(--lime-deep)"}}>{person.role}</div>
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

// ============ AI ============
function AISection({ data }) {
  const [q, setQ] = useStateP("");
  const [msgs, setMsgs] = useStateP([
    { role: "ai", text: `Hi ${data.user.first} — I'm your sellfree AI. I know your property, comps, offers, and every document. Ask me anything.` },
  ]);
  const [busy, setBusy] = useStateP(false);

  const ask = async (text) => {
    if (!text.trim() || busy) return;
    setMsgs(m => [...m, { role: "user", text }]);
    setQ("");
    setBusy(true);
    try {
      const ans = await window.claude.complete({
        messages: [
          { role: "user", content: `You are an expert home-selling AI assistant for a seller at ${data.property.addr}. Property: ${data.property.beds}bd/${data.property.baths}ba, ${data.property.sqft}sqft, list price $${data.property.listPrice.toLocaleString()}. Question: ${text}\n\nGive a concise, helpful 2-3 sentence answer.` },
        ],
      });
      setMsgs(m => [...m, { role: "ai", text: ans }]);
    } catch (e) {
      setMsgs(m => [...m, { role: "ai", text: "Sorry, I couldn't reach the model right now. Try again in a moment." }]);
    }
    setBusy(false);
  };

  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">AI assistant · 24/7</div>
          <h1 className="portal-h1">Ask anything about your sale.</h1>
          <p className="portal-lede">Trained on your property, your offers, market comps, and Texas disclosure law. Answers in seconds — not 4 hours.</p>
        </div>
      </div>

      <div className="ai-chat">
        <div className="ai-messages">
          {msgs.map((m, i) => (
            <div key={i} className={"ai-msg " + m.role}>
              <div className="ai-msg-avatar">{m.role === "ai" ? "AI" : data.user.first[0]}</div>
              <div className="ai-msg-body">{m.text}</div>
            </div>
          ))}
          {busy && <div className="ai-msg ai"><div className="ai-msg-avatar">AI</div><div className="ai-msg-body"><span className="ai-typing"><span/><span/><span/></span></div></div>}
        </div>
        <div className="ai-input-wrap">
          <input className="ai-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about pricing, offers, disclosures..." onKeyDown={e => { if (e.key === "Enter") ask(q); }}/>
          <button className="btn btn-primary" onClick={() => ask(q)} disabled={busy || !q.trim()}>Ask →</button>
        </div>
      </div>

      <div className="portal-card">
        <div className="eyebrow" style={{marginBottom: 14}}>Suggested questions</div>
        <div className="ai-suggestions">
          {data.ai.recentQuestions.map((q, i) => (
            <button key={i} className="ai-suggestion" onClick={() => ask(q)}>{q} →</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ DOCS ============
function DocsSection({ data }) {
  const statuses = {
    "awaiting-signature": { label: "Awaiting signature", color: "var(--coral)" },
    "draft": { label: "Draft", color: "var(--muted)" },
    "received": { label: "Received", color: "var(--lime-deep)" },
    "in-progress": { label: "In progress", color: "var(--ink-3)" },
  };
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Documents · {data.docs.length} files</div>
          <h1 className="portal-h1">Your documents.</h1>
          <p className="portal-lede">Every contract, disclosure, and form for your sale — signable in-app, stored forever, downloadable any time.</p>
        </div>
      </div>

      <div className="docs-list">
        {data.docs.map((d, i) => {
          const s = statuses[d.status];
          return (
            <div key={i} className="doc-row">
              <div className="doc-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="doc-body">
                <div className="doc-name">{d.name}</div>
                <div className="doc-meta">{d.type} · dated {d.dated}</div>
              </div>
              <div className="doc-status" style={{color: s.color}}>● {s.label}</div>
              <button className="doc-action">{d.status === "awaiting-signature" ? "Sign →" : "Open ↗"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ GUIDES ============
function GuidesSection({ data }) {
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Guides · curated for your sale</div>
          <h1 className="portal-h1">Prep your home, smart.</h1>
          <p className="portal-lede">Hand-picked guides based on where you are in the selling process. Short reads, real results.</p>
        </div>
      </div>
      <div className="guides-grid">
        {data.guides.map((g, i) => (
          <div key={i} className="guide-card">
            <div className="guide-card-img" style={{background: ["linear-gradient(135deg, oklch(0.82 0.1 125), oklch(0.65 0.08 160))", "linear-gradient(45deg, oklch(0.72 0.09 35), oklch(0.55 0.08 25))", "linear-gradient(180deg, oklch(0.3 0.02 255), oklch(0.18 0.015 255))", "linear-gradient(135deg, oklch(0.85 0.04 90), oklch(0.7 0.06 80))"][i]}}>
              <span className="guide-card-heat">▲ {g.heat}% helpful</span>
            </div>
            <div className="guide-card-body">
              <div className="eyebrow">{g.tag} · {g.read} read</div>
              <div className="guide-card-title">{g.title}</div>
              <button className="guide-card-link">Read guide →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ PLAN ============
function PlanSection({ data }) {
  return (
    <div className="portal-section">
      <div className="portal-section-head">
        <div>
          <div className="eyebrow">Your plan</div>
          <h1 className="portal-h1">{data.plan.name}</h1>
          <p className="portal-lede">One flat fee. Everything an agent does, done for you. Cancel anytime before your listing goes live.</p>
        </div>
      </div>
      <div className="plan-card">
        <div className="plan-card-head">
          <div>
            <div className="eyebrow" style={{color: "var(--lime)"}}>Current plan</div>
            <div className="plan-card-name">{data.plan.name}</div>
          </div>
          <div className="plan-card-price">
            <div className="ppn">${data.plan.price.toLocaleString()}</div>
            <div className="ppk">Flat · charged at close</div>
          </div>
        </div>
        <ul className="plan-features">
          {data.plan.features.map((f, i) => (
            <li key={i}><span className="plan-check">✓</span>{f}</li>
          ))}
        </ul>
        <div className="plan-vs">
          <div>Estimated commission avoided: <strong style={{color: "var(--lime-deep)"}}>${Math.round(data.property.listPrice * 0.06).toLocaleString()}</strong></div>
          <div>Your flat fee: <strong>${data.plan.price.toLocaleString()}</strong></div>
          <div className="plan-vs-save">Net savings: <strong>${Math.round(data.property.listPrice * 0.06 - data.plan.price).toLocaleString()}</strong></div>
        </div>
      </div>
    </div>
  );
}

// ============ ROUTER ============
function PortalRouter() {
  const hash = window.location.hash || "";
  if (hash.startsWith("#/portal/loading")) return <PortalLoading/>;
  if (hash.startsWith("#/portal")) return <Portal/>;
  return null;
}

function isPortalRoute() {
  return (window.location.hash || "").startsWith("#/portal");
}

window.PortalRouter = PortalRouter;
window.isPortalRoute = isPortalRoute;

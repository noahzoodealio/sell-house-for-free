const { useState: useStateF, useEffect: useEffectF, useRef: useRefF } = React;

const MOCK_PROPERTY_DATA = {
  default: {
    beds: 3, baths: 2, sqft: 1840, year: 1998, lot: "0.21 ac",
    type: "Single Family", parking: "2-car garage", stories: 2,
    est: 742000, tax: "$6,840/yr",
  }
};

const MOCK_MLS_LISTED = {
  status: "active",
  agent: "Michelle Duarte",
  brokerage: "Century 21 Highland",
  mlsId: "ACT-2481993",
  listPrice: 749000,
  originalPrice: 775000,
  priceChanges: 1,
  dom: 18,
  listed: "Apr 4, 2026",
  photos: 24,
  views: 1847,
  saves: 62,
  showings: 9,
  commission: "6%",
  openHouse: "Sat, May 3 · 1–3pm",
  history: [
    { date: "Apr 22", event: "Price reduced", detail: "$775K → $749K" },
    { date: "Apr 15", event: "Open house held", detail: "23 attendees" },
    { date: "Apr 4", event: "Listed active", detail: "$775K list price" },
  ],
};

// ---- Storage
const STORAGE_KEY = "sellfree:flow";
function loadFlow() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveFlow(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ---- Route hook
function useHashRoute() {
  const [hash, setHash] = useStateF(window.location.hash || "#/");
  useEffectF(() => {
    const on = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

function nav(to) { window.location.hash = to; window.scrollTo({top: 0, behavior: "instant"}); }

// ---- Full-page flow shell
function FlowPage({ step, total = 5, title, onNext, onBack, canNext, ctaLabel, children, footerNote }) {
  return (
    <div className="flow-page">
      <header className="flow-page-nav">
        <a href="#/" className="wordmark" style={{textDecoration: "none"}}>
          <span className="dot">sellfree</span><span className="ai">.ai</span>
        </a>
        <div style={{display: "flex", alignItems: "center", gap: 16, flex: 1, maxWidth: 420, margin: "0 32px"}}>
          <span className="flow-step-n">Step {step} of {total}</span>
          <div className="flow-progress" style={{flex: 1}}>
            <div className="flow-progress-fill" style={{width: `${(step / total) * 100}%`}}/>
          </div>
        </div>
        <a href="#/" style={{fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.04em", color: "var(--muted)", textDecoration: "none"}}>Save & exit ×</a>
      </header>

      <main className="flow-page-body">
        <div className="flow-page-content">
          <div className="eyebrow" style={{marginBottom: 16}}>Step {step} · {title.eyebrow}</div>
          <h1 className="flow-page-title">{title.h}</h1>
          <p className="flow-page-lede">{title.p}</p>
          {children}
        </div>
      </main>

      <footer className="flow-page-foot">
        <div className="flow-page-foot-inner">
          <button className="flow-back" onClick={onBack} style={{visibility: step === 1 ? "hidden" : "visible"}}>← Back</button>
          {footerNote && <span style={{fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em"}}>{footerNote}</span>}
          <button className="btn btn-primary btn-lg" disabled={!canNext} onClick={onNext} style={{opacity: canNext ? 1 : 0.35, pointerEvents: canNext ? "auto" : "none"}}>
            {ctaLabel || "Continue"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

// ---- STEP 1 — Address confirm + unit
function Step1() {
  const [flow, setFlow] = useStateF(loadFlow());
  useEffectF(() => { saveFlow(flow); }, [flow]);
  const hasUnit = flow.hasUnit;
  const unit = flow.unit || "";
  const unitType = flow.unitType || "Unit";
  const seed = flow.seedAddress || { addr: "1429 Maple Grove Lane", city: "Austin, TX 78704" };

  const canNext = hasUnit === "no" || (hasUnit === "yes" && unit.trim().length > 0);

  return (
    <FlowPage
      step={1}
      title={{
        eyebrow: "Address",
        h: "Confirm your address.",
        p: "We matched your entry to a property. Is there a unit, suite, or apartment number we should add?"
      }}
      onBack={() => nav("#/")}
      onNext={() => nav("#/submit/property")}
      canNext={canNext}
    >
      <div className="field">
        <label>Property address</label>
        <input value={`${seed.addr}, ${seed.city}`} readOnly style={{background: "var(--bone-2)"}}/>
      </div>

      <div className="field" style={{marginTop: 8}}>
        <label>Is there a unit, suite, or apt number?</label>
        <div className="chip-group">
          <button className={"chip " + (hasUnit === "no" ? "selected" : "")} onClick={() => setFlow(f => ({...f, hasUnit: "no"}))}>No, single dwelling</button>
          <button className={"chip " + (hasUnit === "yes" ? "selected" : "")} onClick={() => setFlow(f => ({...f, hasUnit: "yes"}))}>Yes, there is</button>
        </div>
      </div>

      {hasUnit === "yes" && (
        <div className="field-row" style={{marginTop: 12}}>
          <div className="field">
            <label>Type</label>
            <select value={unitType} onChange={e => setFlow(f => ({...f, unitType: e.target.value}))}>
              <option>Unit</option><option>Apt</option><option>Suite</option><option>#</option><option>Lot</option><option>Floor</option>
            </select>
          </div>
          <div className="field">
            <label>Number</label>
            <input value={unit} onChange={e => setFlow(f => ({...f, unit: e.target.value}))} placeholder="e.g. 4B" autoFocus/>
          </div>
        </div>
      )}
    </FlowPage>
  );
}

// ---- STEP 2 — Property data
function Step2() {
  const [flow, setFlow] = useStateF(loadFlow());
  const data = flow.data || MOCK_PROPERTY_DATA.default;
  useEffectF(() => { saveFlow({...flow, data}); }, [data]);
  const set = (k, v) => setFlow(f => ({...f, data: {...(f.data || MOCK_PROPERTY_DATA.default), [k]: v}}));
  const seed = flow.seedAddress || { addr: "1429 Maple Grove Lane", city: "Austin, TX 78704" };
  const displayAddr = `${seed.addr}${flow.hasUnit === "yes" && flow.unit ? `, ${flow.unitType || "Unit"} ${flow.unit}` : ""}, ${seed.city}`;
  const canNext = data.beds > 0 && data.sqft > 0;

  return (
    <FlowPage
      step={2}
      title={{
        eyebrow: "Property details",
        h: "Verify the details.",
        p: "We pulled these from public records and tax data. Edit anything that's off — we'll use it to set a pricing range."
      }}
      onBack={() => nav("#/submit/address")}
      onNext={() => nav("#/submit/mls")}
      canNext={canNext}
    >
      <div className="autofill-card">
        <div className="autofill-head">
          <div>
            <div style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--lime)", marginBottom: 4}}>Autofilled · Source: county records + tax data</div>
            <div className="addr">{displayAddr}</div>
          </div>
          <span className="pill pill-lime" style={{flexShrink: 0}}>Est ${(data.est/1000).toFixed(0)}K</span>
        </div>
        <div className="autofill-data">
          <div className="stat"><div className="k">Built</div><div className="v">{data.year}</div></div>
          <div className="stat"><div className="k">Stories</div><div className="v">{data.stories}</div></div>
          <div className="stat"><div className="k">Lot</div><div className="v">{data.lot}</div></div>
          <div className="stat"><div className="k">Tax</div><div className="v" style={{fontSize: 15}}>{data.tax}</div></div>
        </div>
      </div>

      <div className="field-row-3">
        <div className="field">
          <label>Property type</label>
          <select value={data.type} onChange={e => set("type", e.target.value)}>
            <option>Single Family</option><option>Condo</option><option>Townhome</option><option>Multi-family</option><option>Manufactured</option>
          </select>
        </div>
        <div className="field"><label>Beds</label><input type="number" value={data.beds} onChange={e => set("beds", parseInt(e.target.value || 0))}/></div>
        <div className="field"><label>Baths</label><input type="number" step="0.5" value={data.baths} onChange={e => set("baths", parseFloat(e.target.value || 0))}/></div>
      </div>

      <div className="field-row">
        <div className="field"><label>Square feet</label><input type="number" value={data.sqft} onChange={e => set("sqft", parseInt(e.target.value || 0))}/></div>
        <div className="field"><label>Year built</label><input type="number" value={data.year} onChange={e => set("year", parseInt(e.target.value || 0))}/></div>
      </div>

      <div className="field-help">Don't worry about perfect numbers — you can refine these later.</div>
    </FlowPage>
  );
}

// ---- STEP 3 — MLS
function Step3() {
  const [flow, setFlow] = useStateF(loadFlow());
  const seed = flow.seedAddress || { addr: "1429 Maple Grove Lane", city: "Austin, TX 78704" };
  const displayAddr = `${seed.addr}${flow.hasUnit === "yes" && flow.unit ? `, ${flow.unitType || "Unit"} ${flow.unit}` : ""}, ${seed.city}`;
  const [checking, setChecking] = useStateF(true);
  const [result, setResult] = useStateF(null);
  const mlsConfirmed = flow.mlsConfirmed;
  const data = flow.data || MOCK_PROPERTY_DATA.default;

  useEffectF(() => {
    setChecking(true);
    setResult(null);
    const t = setTimeout(() => {
      setChecking(false);
      setResult(MOCK_MLS_LISTED);
    }, 1600);
    return () => clearTimeout(t);
  }, []);

  const canNext = !checking && !!mlsConfirmed;
  const savingsIfSwitch = result ? Math.round(result.listPrice * 0.06 - 2999) : 0;

  return (
    <FlowPage
      step={3}
      title={{
        eyebrow: "MLS check",
        h: checking ? "Checking the MLS…" : (result ? "Found an active MLS listing." : "No active MLS listing."),
        p: checking
          ? "Running your address against the MLS feed. One moment."
          : result
            ? "We found your property on the MLS. Confirm it's yours to pull in photos and history — or switch to sellfree and keep the commission."
            : "Your home isn't currently listed on the MLS. You're clear to list with sellfree.ai."
      }}
      onBack={() => nav("#/submit/property")}
      onNext={() => nav("#/submit/details")}
      canNext={canNext}
    >
      {checking && (
        <div style={{padding: "48px 0", textAlign: "center"}}>
          <div style={{display: "inline-flex", gap: 6}}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: "50%",
                background: "var(--lime-deep)",
                animation: "blink 1.2s ease infinite",
                animationDelay: `${i * 0.15}s`,
              }}/>
            ))}
          </div>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", color: "var(--muted)", marginTop: 20, textTransform: "uppercase"}}>
            Querying MLS · RETS feed
          </div>
        </div>
      )}

      {!checking && result && <MLSListedCard listing={result} displayAddr={displayAddr} data={data} savingsIfSwitch={savingsIfSwitch} mlsConfirmed={mlsConfirmed} setFlow={setFlow}/>}

      {!checking && !result && (
        <>
          <div style={{border: "1px solid var(--line)", background: "var(--bone-2)", borderRadius: 16, padding: 20, marginBottom: 20, display: "flex", gap: 14, alignItems: "center"}}>
            <div style={{width: 40, height: 40, borderRadius: "50%", background: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", flexShrink: 0, fontWeight: 700, fontSize: 16}}>✓</div>
            <div>
              <div style={{fontWeight: 600}}>Ready to list on the MLS</div>
              <div style={{fontSize: 13, color: "var(--muted)", marginTop: 2}}>No listing history found in the last 90 days.</div>
            </div>
          </div>
          <div className="field">
            <label>Confirm to continue</label>
            <div className="chip-group">
              <button className={"chip " + (mlsConfirmed === "confirmed" ? "selected" : "")} onClick={() => setFlow(f => { const n = {...f, mlsConfirmed: "confirmed"}; saveFlow(n); return n; })}>Got it, let's continue</button>
              <button className={"chip " + (mlsConfirmed === "was-listed" ? "selected" : "")} onClick={() => setFlow(f => { const n = {...f, mlsConfirmed: "was-listed"}; saveFlow(n); return n; })}>Actually, I am listed elsewhere</button>
            </div>
          </div>
        </>
      )}
    </FlowPage>
  );
}

// Rich listed card
function MLSListedCard({ listing, displayAddr, data, savingsIfSwitch, mlsConfirmed, setFlow }) {
  const [activePhoto, setActivePhoto] = useStateF(0);
  const photoPatterns = [
    "linear-gradient(135deg, oklch(0.72 0.09 35) 0%, oklch(0.5 0.06 255) 100%)",
    "linear-gradient(180deg, oklch(0.85 0.05 90) 0%, oklch(0.65 0.05 90) 100%)",
    "linear-gradient(45deg, oklch(0.82 0.08 125) 0%, oklch(0.55 0.06 160) 100%)",
    "linear-gradient(135deg, oklch(0.35 0.04 255) 0%, oklch(0.2 0.015 255) 100%)",
    "linear-gradient(180deg, oklch(0.78 0.07 55) 0%, oklch(0.55 0.09 35) 100%)",
  ];
  const photoLabels = ["Exterior front", "Living room", "Kitchen", "Primary suite", "Backyard"];
  const set = (v) => setFlow(f => { const n = {...f, mlsConfirmed: v}; saveFlow(n); return n; });

  return (
    <div className="mls-listed-v2">
      {/* Photo gallery */}
      <div className="mls-gallery">
        <div className="mls-gallery-hero" style={{background: photoPatterns[activePhoto]}}>
          <span className="mls-status">● Active on MLS</span>
          <div className="mls-gallery-meta">
            <span>Photo {activePhoto + 1} of {listing.photos}</span>
            <span>·</span>
            <span>{photoLabels[activePhoto]}</span>
          </div>
          <span className="mls-gallery-id">MLS #{listing.mlsId}</span>
        </div>
        <div className="mls-gallery-thumbs">
          {photoPatterns.map((p, i) => (
            <button key={i} className={"mls-gallery-thumb " + (i === activePhoto ? "active" : "")} style={{background: p}} onClick={() => setActivePhoto(i)} aria-label={`Photo ${i+1}`}/>
          ))}
          <div className="mls-gallery-more">+{listing.photos - 5}</div>
        </div>
      </div>

      {/* Headline row */}
      <div className="mls-head-v2">
        <div>
          <div className="mls-addr-v2">{displayAddr}</div>
          <div className="mls-spec-v2">
            <span><strong>{data.beds}</strong> bd</span>
            <span>·</span>
            <span><strong>{data.baths}</strong> ba</span>
            <span>·</span>
            <span><strong>{data.sqft.toLocaleString()}</strong> sqft</span>
            <span>·</span>
            <span>{data.lot} lot</span>
          </div>
        </div>
        <div className="mls-price-v2">
          <div className="mls-price-main">${(listing.listPrice / 1000).toFixed(0)}K</div>
          <div className="mls-price-sub">
            <span style={{textDecoration: "line-through"}}>${(listing.originalPrice / 1000).toFixed(0)}K</span>
            <span className="mls-price-change">↓ ${((listing.originalPrice - listing.listPrice) / 1000).toFixed(0)}K</span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mls-kpi-strip">
        <div className="mls-kpi"><div className="n">{listing.dom}</div><div className="k">Days on market</div></div>
        <div className="mls-kpi"><div className="n">{listing.views.toLocaleString()}</div><div className="k">Views</div></div>
        <div className="mls-kpi"><div className="n">{listing.saves}</div><div className="k">Saves</div></div>
        <div className="mls-kpi"><div className="n">{listing.showings}</div><div className="k">Showings</div></div>
      </div>

      {/* Listing details */}
      <div className="mls-details-v2">
        <div className="mls-detail-row"><span className="k">Listing agent</span><span className="v">{listing.agent}</span></div>
        <div className="mls-detail-row"><span className="k">Brokerage</span><span className="v">{listing.brokerage}</span></div>
        <div className="mls-detail-row"><span className="k">Commission on contract</span><span className="v" style={{color: "var(--coral)"}}>{listing.commission} · ${(listing.listPrice * 0.06).toLocaleString()}</span></div>
        <div className="mls-detail-row"><span className="k">Listed</span><span className="v">{listing.listed}</span></div>
        <div className="mls-detail-row"><span className="k">Open house</span><span className="v">{listing.openHouse}</span></div>
        <div className="mls-detail-row"><span className="k">Price changes</span><span className="v">{listing.priceChanges}</span></div>
      </div>

      {/* Activity timeline */}
      <div className="mls-activity">
        <div className="mls-activity-head">Listing activity</div>
        {listing.history.map((h, i) => (
          <div key={i} className="mls-activity-row">
            <span className="dot"/>
            <div className="date">{h.date}</div>
            <div>
              <div className="event">{h.event}</div>
              <div className="detail">{h.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Switch-to-sellfree hook */}
      <div className="mls-switch-cta">
        <div className="mls-switch-left">
          <div className="eyebrow" style={{color: "var(--lime)", marginBottom: 8}}>If you switch</div>
          <div className="mls-switch-title">Keep ${savingsIfSwitch.toLocaleString()} of the commission.</div>
          <div className="mls-switch-sub">We'll cancel your existing listing agreement, re-list on the MLS under sellfree, and import your {listing.photos} photos + history. Takes ~48 hours.</div>
        </div>
        <div className="mls-switch-right">
          <div className="mls-switch-num">${savingsIfSwitch.toLocaleString()}</div>
          <div className="mls-switch-num-k">vs ${(listing.listPrice * 0.06).toLocaleString()} commission today</div>
        </div>
      </div>

      {/* Confirm */}
      <div className="field" style={{marginTop: 28}}>
        <label>Is this your listing?</label>
        <div className="chip-group">
          <button className={"chip " + (mlsConfirmed === "yes" ? "selected" : "")} onClick={() => set("yes")}>Yes, this is mine</button>
          <button className={"chip " + (mlsConfirmed === "switching" ? "selected" : "")} onClick={() => set("switching")}>Yes — switch me to sellfree</button>
          <button className={"chip " + (mlsConfirmed === "no" ? "selected" : "")} onClick={() => set("no")}>No, not my home</button>
        </div>
      </div>
    </div>
  );
}

// ---- STEP 4 — Details
function Step4() {
  const [flow, setFlow] = useStateF(loadFlow());
  useEffectF(() => { saveFlow(flow); }, [flow]);
  const { condition, timeline, reason } = flow;
  const conditions = ["Turnkey", "Good", "Needs minor work", "Fixer-upper"];
  const timelines = ["ASAP", "1–3 months", "3–6 months", "Just exploring"];
  const reasons = ["Upsizing", "Downsizing", "Relocating", "Investment", "Life change", "Other"];
  const canNext = !!condition && !!timeline;

  return (
    <FlowPage
      step={4}
      title={{
        eyebrow: "A few more details",
        h: "Tell us about the home and timing.",
        p: "Two quick questions so we can recommend the right plan and pricing strategy for your market."
      }}
      onBack={() => nav("#/submit/mls")}
      onNext={() => nav("#/submit/contact")}
      canNext={canNext}
    >
      <div className="field">
        <label>Overall condition</label>
        <div className="chip-group">
          {conditions.map(c => (
            <button key={c} className={"chip " + (condition === c ? "selected" : "")} onClick={() => setFlow(f => ({...f, condition: c}))}>{c}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>When do you want to sell?</label>
        <div className="chip-group">
          {timelines.map(t => (
            <button key={t} className={"chip " + (timeline === t ? "selected" : "")} onClick={() => setFlow(f => ({...f, timeline: t}))}>{t}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Reason for selling (optional)</label>
        <div className="chip-group">
          {reasons.map(r => (
            <button key={r} className={"chip " + (reason === r ? "selected" : "")} onClick={() => setFlow(f => ({...f, reason: r}))}>{r}</button>
          ))}
        </div>
      </div>
    </FlowPage>
  );
}

// ---- STEP 5 — Contact
function Step5() {
  const [flow, setFlow] = useStateF(loadFlow());
  useEffectF(() => { saveFlow(flow); }, [flow]);
  const name = flow.name || "";
  const email = flow.email || "";
  const phone = flow.phone || "";
  const estimate = (flow.data || MOCK_PROPERTY_DATA.default).est;
  const canNext = name.length > 1 && email.includes("@") && phone.replace(/\D/g, "").length >= 10;

  return (
    <FlowPage
      step={5}
      title={{
        eyebrow: "Your info",
        h: "Where should we send your report?",
        p: "We'll email your full property report, estimated savings breakdown, and recommended plan — no spam, no call center."
      }}
      onBack={() => nav("#/submit/details")}
      onNext={() => nav("#/portal/loading")}
      canNext={canNext}
      ctaLabel="Submit"
    >
      <div className="field">
        <label>Full name</label>
        <input value={name} onChange={e => setFlow(f => ({...f, name: e.target.value}))} placeholder="First and last"/>
      </div>
      <div className="field-row">
        <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setFlow(f => ({...f, email: e.target.value}))} placeholder="you@email.com"/></div>
        <div className="field"><label>Phone</label><input type="tel" value={phone} onChange={e => setFlow(f => ({...f, phone: e.target.value}))} placeholder="(555) 123-4567"/></div>
      </div>

      <div style={{marginTop: 24, padding: 20, background: "var(--ink)", color: "var(--bone)", borderRadius: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16}}>
        <div>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-dark)"}}>Your savings report will include</div>
          <div style={{fontSize: 14, marginTop: 6}}>Est. home value · Projected savings · Recommended plan · Sample listing preview</div>
        </div>
        <div style={{textAlign: "right", flexShrink: 0}}>
          <div style={{fontFamily: "var(--font-display)", fontSize: 32, color: "var(--lime)"}}>${Math.round(estimate * 0.06 - 2999).toLocaleString()}</div>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-dark)"}}>Est savings</div>
        </div>
      </div>
      <div className="field-help" style={{marginTop: 16}}>By continuing you agree to our Terms and Privacy Policy. We never share your data.</div>
    </FlowPage>
  );
}

// ---- STEP 6 — Done
function StepDone() {
  const flow = loadFlow();
  const name = (flow.name || "there").split(" ")[0];
  const seed = flow.seedAddress || { addr: "1429 Maple Grove Lane", city: "Austin, TX 78704" };
  const displayAddr = `${seed.addr}, ${seed.city}`;
  const estimate = (flow.data || MOCK_PROPERTY_DATA.default).est;

  return (
    <div className="flow-page flow-page-done">
      <header className="flow-page-nav">
        <a href="#/" className="wordmark" style={{textDecoration: "none"}}>
          <span className="dot">sellfree</span><span className="ai">.ai</span>
        </a>
        <span style={{fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)"}}>Submission complete</span>
      </header>
      <main className="flow-page-body">
        <div className="flow-page-content" style={{textAlign: "center"}}>
          <div className="flow-success-check" style={{margin: "0 auto 32px"}}>✓</div>
          <div className="eyebrow" style={{marginBottom: 12}}>Submitted</div>
          <h1 className="flow-page-title">Report on the way, {name}.</h1>
          <p className="flow-page-lede" style={{maxWidth: 520, margin: "0 auto 32px"}}>
            Your property report for <strong style={{color: "var(--ink)"}}>{displayAddr}</strong> is generating now. We'll email it in under 60 seconds — along with next-step instructions for your plan.
          </p>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, maxWidth: 560, margin: "0 auto 32px"}}>
            <div style={{padding: 20, background: "var(--bone-2)", borderRadius: 16}}>
              <div style={{fontFamily: "var(--font-display)", fontSize: 34, lineHeight: 1}}>${(estimate/1000).toFixed(0)}K</div>
              <div style={{fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginTop: 6}}>Est. value</div>
            </div>
            <div style={{padding: 20, background: "var(--ink)", color: "var(--bone)", borderRadius: 16}}>
              <div style={{fontFamily: "var(--font-display)", fontSize: 34, lineHeight: 1, color: "var(--lime)"}}>${Math.round(estimate * 0.06 - 2999).toLocaleString()}</div>
              <div style={{fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-dark)", marginTop: 6}}>Est. savings</div>
            </div>
            <div style={{padding: 20, background: "var(--bone-2)", borderRadius: 16}}>
              <div style={{fontFamily: "var(--font-display)", fontSize: 34, lineHeight: 1}}>18d</div>
              <div style={{fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginTop: 6}}>Avg close</div>
            </div>
          </div>
          <div style={{display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap"}}>
            <a className="btn btn-primary btn-lg" href="#/" onClick={() => { localStorage.removeItem(STORAGE_KEY); }}>Back to home</a>
            <button className="btn btn-ghost btn-lg">Book an agent call</button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---- Router
function FlowRouter() {
  const hash = useHashRoute();
  useEffectF(() => { window.scrollTo({top: 0, behavior: "instant"}); }, [hash]);
  if (hash.startsWith("#/submit/address")) return <Step1/>;
  if (hash.startsWith("#/submit/property")) return <Step2/>;
  if (hash.startsWith("#/submit/mls")) return <Step3/>;
  if (hash.startsWith("#/submit/details")) return <Step4/>;
  if (hash.startsWith("#/submit/contact")) return <Step5/>;
  if (hash.startsWith("#/submit/done")) return <StepDone/>;
  return null;
}

function isFlowRoute() {
  return (window.location.hash || "").startsWith("#/submit/");
}

window.FlowRouter = FlowRouter;
window.isFlowRoute = isFlowRoute;
window.saveFlow = saveFlow;
window.loadFlow = loadFlow;
window.navFlow = nav;

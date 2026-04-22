const { useState: useStateF, useEffect: useEffectF, useRef: useRefF } = React;

// Mocked "data API" results keyed on address
const MOCK_PROPERTY_DATA = {
  default: {
    beds: 3, baths: 2, sqft: 1840, year: 1998, lot: "0.21 ac",
    type: "Single Family", parking: "2-car garage", stories: 2,
    est: 742000, tax: "$6,840/yr",
  }
};

const MOCK_MLS = {
  listed: {
    status: "active",
    agent: "Michelle Duarte · Century 21",
    listPrice: 749000,
    dom: 18,
    listed: "Apr 4, 2026",
    photos: 24,
  },
  notListed: null,
};

function useLockBody(locked) {
  useEffectF(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}

function SubmissionFlow({ open, onClose, seedAddress }) {
  const [step, setStep] = useState(0);
  const TOTAL = 6;

  // Step 1 — unit
  const [hasUnit, setHasUnit] = useState(null); // null/'no'/'yes'
  const [unitType, setUnitType] = useState("Unit");
  const [unit, setUnit] = useState("");

  // Step 2 — property data (prefilled)
  const [data, setData] = useState(MOCK_PROPERTY_DATA.default);

  // Step 3 — MLS check (mock: 50/50)
  const [mlsChecking, setMlsChecking] = useState(true);
  const [mlsResult, setMlsResult] = useState(null);
  const [mlsConfirmed, setMlsConfirmed] = useState(null);

  // Step 4 — condition / timeline
  const [condition, setCondition] = useState("");
  const [timeline, setTimeline] = useState("");
  const [reason, setReason] = useState("");

  // Step 5 — contact
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useLockBody(open);

  useEffectF(() => {
    if (!open) return;
    setStep(0);
    setHasUnit(null); setUnit(""); setUnitType("Unit");
    setData(MOCK_PROPERTY_DATA.default);
    setMlsChecking(true); setMlsResult(null); setMlsConfirmed(null);
    setCondition(""); setTimeline(""); setReason("");
    setName(""); setEmail(""); setPhone("");
  }, [open]);

  // simulate MLS check when entering step 3
  useEffectF(() => {
    if (step !== 2) return;
    setMlsChecking(true);
    setMlsResult(null);
    const t = setTimeout(() => {
      setMlsChecking(false);
      // randomize — or key on seed for deterministic: here use seedAddress length
      const isListed = ((seedAddress?.addr?.length || 0) % 2) === 0;
      setMlsResult(isListed ? { ...MOCK_MLS.listed } : null);
    }, 1600);
    return () => clearTimeout(t);
  }, [step, seedAddress]);

  if (!open) return null;

  const canAdvance = (() => {
    if (step === 0) return hasUnit === "no" || (hasUnit === "yes" && unit.trim().length > 0);
    if (step === 1) return data.beds > 0 && data.sqft > 0;
    if (step === 2) return !mlsChecking && mlsConfirmed !== null;
    if (step === 3) return condition && timeline;
    if (step === 4) return name && email.includes("@") && phone.replace(/\D/g, "").length >= 10;
    return false;
  })();

  const next = () => {
    if (step < 5) setStep(s => s + 1);
  };
  const back = () => { if (step > 0) setStep(s => s - 1); };

  const displayAddr = seedAddress ? `${seedAddress.addr}${hasUnit === "yes" && unit ? `, ${unitType} ${unit}` : ""}, ${seedAddress.city}` : "Your property";

  const fmt = (n) => "$" + Math.round(n).toLocaleString();

  return (
    <div className="flow-scrim" onClick={onClose}>
      <div className="flow-modal" onClick={e => e.stopPropagation()}>
        <div className="flow-head">
          <span className="wordmark" style={{fontSize: 14}}>
            <span className="dot">sellfree</span><span className="ai">.ai</span>
          </span>
          <div className="flow-progress">
            <div className="flow-progress-fill" style={{width: `${((step) / (TOTAL - 1)) * 100}%`}}/>
          </div>
          <span className="flow-step-n">{step < 5 ? `${step + 1} / 5` : "Done"}</span>
          <button className="flow-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flow-body">
          {step === 0 && <StepUnit {...{seedAddress, hasUnit, setHasUnit, unit, setUnit, unitType, setUnitType}}/>}
          {step === 1 && <StepData {...{displayAddr, data, setData}}/>}
          {step === 2 && <StepMLS {...{displayAddr, mlsChecking, mlsResult, mlsConfirmed, setMlsConfirmed}}/>}
          {step === 3 && <StepDetails {...{condition, setCondition, timeline, setTimeline, reason, setReason}}/>}
          {step === 4 && <StepContact {...{name, setName, email, setEmail, phone, setPhone, estimate: data.est}}/>}
          {step === 5 && <StepDone {...{name, displayAddr, estimate: data.est}}/>}
        </div>

        {step < 5 && (
          <div className="flow-foot">
            <button className={"flow-back " + (step === 0 ? "hidden" : "")} onClick={back}>← Back</button>
            <button className="btn btn-primary" disabled={!canAdvance} onClick={next} style={{opacity: canAdvance ? 1 : 0.4, pointerEvents: canAdvance ? "auto" : "none"}}>
              {step === 4 ? "Submit" : "Continue"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}
        {step === 5 && (
          <div className="flow-foot">
            <span style={{fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)"}}>Check your email — magic link sent</span>
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- STEP 1
function StepUnit({ seedAddress, hasUnit, setHasUnit, unit, setUnit, unitType, setUnitType }) {
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 12}}>Step 1 · Address</div>
      <h2>Confirm your address.</h2>
      <p className="lede">We found a match — does your property have a unit, suite, or apartment number?</p>

      <div className="field">
        <label>Property address</label>
        <input value={seedAddress ? `${seedAddress.addr}, ${seedAddress.city}` : ""} readOnly style={{background: "var(--bone-2)"}}/>
      </div>

      <div className="field" style={{marginTop: 8}}>
        <label>Is there a unit, suite, or apt #?</label>
        <div className="chip-group">
          <button className={"chip " + (hasUnit === "no" ? "selected" : "")} onClick={() => setHasUnit("no")}>No, single dwelling</button>
          <button className={"chip " + (hasUnit === "yes" ? "selected" : "")} onClick={() => setHasUnit("yes")}>Yes, there is</button>
        </div>
      </div>

      {hasUnit === "yes" && (
        <div className="field-row" style={{marginTop: 12}}>
          <div className="field">
            <label>Type</label>
            <select value={unitType} onChange={e => setUnitType(e.target.value)}>
              <option>Unit</option><option>Apt</option><option>Suite</option><option>#</option><option>Lot</option><option>Floor</option>
            </select>
          </div>
          <div className="field">
            <label>Number</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. 4B"/>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- STEP 2
function StepData({ displayAddr, data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 12}}>Step 2 · Property details</div>
      <h2>Verify the details.</h2>
      <p className="lede">We pulled these from public records and tax data. Edit anything that's off.</p>

      <div className="autofill-card">
        <div className="autofill-head">
          <div>
            <div style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--lime)", marginBottom: 4}}>Autofilled · Source: county records</div>
            <div className="addr">{displayAddr}</div>
          </div>
          <span className="pill pill-lime" style={{flexShrink: 0}}>Est {"$" + (data.est/1000).toFixed(0)}K</span>
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
        <div className="field">
          <label>Beds</label>
          <input type="number" value={data.beds} onChange={e => set("beds", parseInt(e.target.value || 0))}/>
        </div>
        <div className="field">
          <label>Baths</label>
          <input type="number" step="0.5" value={data.baths} onChange={e => set("baths", parseFloat(e.target.value || 0))}/>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Square feet</label>
          <input type="number" value={data.sqft} onChange={e => set("sqft", parseInt(e.target.value || 0))}/>
        </div>
        <div className="field">
          <label>Year built</label>
          <input type="number" value={data.year} onChange={e => set("year", parseInt(e.target.value || 0))}/>
        </div>
      </div>

      <div className="field-help">Don't worry about perfect numbers — you can refine these later.</div>
    </div>
  );
}

// ---- STEP 3
function StepMLS({ displayAddr, mlsChecking, mlsResult, mlsConfirmed, setMlsConfirmed }) {
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 12}}>Step 3 · MLS check</div>
      <h2>{mlsChecking ? "Checking the MLS…" : (mlsResult ? "Found an active listing." : "No active listing found.")}</h2>
      <p className="lede">
        {mlsChecking && "Scanning 600+ MLS feeds for this property. Takes a second."}
        {!mlsChecking && mlsResult && "Is this your listing? Confirm so we can import photos, history, and save you time."}
        {!mlsChecking && !mlsResult && "Your home isn't currently listed anywhere — you're clear to list with sellfree.ai."}
      </p>

      {mlsChecking && (
        <div style={{padding: 40, textAlign: "center"}}>
          <div style={{display: "inline-flex", gap: 6}}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--lime-deep)",
                animation: "blink 1.2s ease infinite",
                animationDelay: `${i * 0.15}s`,
              }}/>
            ))}
          </div>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", color: "var(--muted)", marginTop: 16, textTransform: "uppercase"}}>
            Querying RETS · Zillow · Redfin · Realtor
          </div>
        </div>
      )}

      {!mlsChecking && mlsResult && (
        <>
          <div className="mls-card">
            <div className="mls-img img-ph">
              <span className="mls-status">Active · {mlsResult.dom} days</span>
              <span style={{fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)"}}>{mlsResult.photos} photos on file</span>
            </div>
            <div className="mls-body">
              <div className="mls-addr">{displayAddr}</div>
              <div className="mls-stats">
                <span>Listed {mlsResult.listed}</span>
                <span>·</span>
                <span>List price <strong style={{color: "var(--ink)"}}>${(mlsResult.listPrice/1000).toFixed(0)}K</strong></span>
              </div>
              <div className="mls-row"><span className="k">Listing agent</span><span className="v">{mlsResult.agent}</span></div>
              <div className="mls-row"><span className="k">MLS status</span><span className="v" style={{color: "var(--lime-deep)"}}>Active</span></div>
              <div className="mls-row"><span className="k">Days on market</span><span className="v">{mlsResult.dom}</span></div>
            </div>
          </div>

          <div className="field">
            <label>Is this your home?</label>
            <div className="chip-group">
              <button className={"chip " + (mlsConfirmed === "yes" ? "selected" : "")} onClick={() => setMlsConfirmed("yes")}>Yes, this is my listing</button>
              <button className={"chip " + (mlsConfirmed === "switching" ? "selected" : "")} onClick={() => setMlsConfirmed("switching")}>Yes — I want to switch to sellfree</button>
              <button className={"chip " + (mlsConfirmed === "no" ? "selected" : "")} onClick={() => setMlsConfirmed("no")}>No, that's not my home</button>
            </div>
          </div>
        </>
      )}

      {!mlsChecking && !mlsResult && (
        <>
          <div style={{border: "1px solid var(--line)", background: "var(--bone-2)", borderRadius: 16, padding: 20, marginBottom: 20, display: "flex", gap: 14, alignItems: "center"}}>
            <div style={{width: 36, height: 36, borderRadius: "50%", background: "var(--lime)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", flexShrink: 0, fontWeight: 700}}>✓</div>
            <div>
              <div style={{fontWeight: 600}}>Ready to list on the MLS</div>
              <div style={{fontSize: 13, color: "var(--muted)", marginTop: 2}}>No listing history found in the last 90 days.</div>
            </div>
          </div>
          <div className="field">
            <label>Confirm to continue</label>
            <div className="chip-group">
              <button className={"chip " + (mlsConfirmed === "confirmed" ? "selected" : "")} onClick={() => setMlsConfirmed("confirmed")}>Got it, let's continue</button>
              <button className={"chip " + (mlsConfirmed === "was-listed" ? "selected" : "")} onClick={() => setMlsConfirmed("was-listed")}>Actually, I am listed elsewhere</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- STEP 4
function StepDetails({ condition, setCondition, timeline, setTimeline, reason, setReason }) {
  const conditions = ["Turnkey", "Good", "Needs minor work", "Fixer-upper"];
  const timelines = ["ASAP", "1–3 months", "3–6 months", "Just exploring"];
  const reasons = ["Upsizing", "Downsizing", "Relocating", "Investment", "Life change", "Other"];
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 12}}>Step 4 · A few more details</div>
      <h2>Tell us about the home and timing.</h2>
      <p className="lede">Helps us recommend the right plan and pricing strategy.</p>

      <div className="field">
        <label>Overall condition</label>
        <div className="chip-group">
          {conditions.map(c => (
            <button key={c} className={"chip " + (condition === c ? "selected" : "")} onClick={() => setCondition(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>When do you want to sell?</label>
        <div className="chip-group">
          {timelines.map(t => (
            <button key={t} className={"chip " + (timeline === t ? "selected" : "")} onClick={() => setTimeline(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Reason for selling (optional)</label>
        <div className="chip-group">
          {reasons.map(r => (
            <button key={r} className={"chip " + (reason === r ? "selected" : "")} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- STEP 5
function StepContact({ name, setName, email, setEmail, phone, setPhone, estimate }) {
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 12}}>Step 5 · Your info</div>
      <h2>Where should we send your report?</h2>
      <p className="lede">We'll email your full property report, estimated savings breakdown, and next steps — no spam, no call center.</p>

      <div className="field">
        <label>Full name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="First and last"/>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"/>
        </div>
        <div className="field">
          <label>Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567"/>
        </div>
      </div>

      <div style={{marginTop: 24, padding: 16, background: "var(--bone-2)", borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12}}>
        <div>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)"}}>Your savings report will include</div>
          <div style={{fontSize: 14, marginTop: 6, color: "var(--ink-3)"}}>Est. home value · Projected savings · Recommended plan · Sample listing preview</div>
        </div>
        <div style={{textAlign: "right", flexShrink: 0}}>
          <div style={{fontFamily: "var(--font-display)", fontSize: 24, color: "var(--lime-deep)"}}>
            ${Math.round(estimate * 0.06 - 2999).toLocaleString()}
          </div>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)"}}>Est savings</div>
        </div>
      </div>

      <div className="field-help" style={{marginTop: 14}}>By continuing you agree to our Terms and Privacy Policy. We never share your data.</div>
    </div>
  );
}

// ---- DONE
function StepDone({ name, displayAddr, estimate }) {
  return (
    <div className="flow-success">
      <div className="flow-success-check">✓</div>
      <h2 style={{textAlign: "center"}}>Report on the way, {name.split(" ")[0]}.</h2>
      <p className="lede" style={{textAlign: "center", maxWidth: 440, margin: "8px auto 24px"}}>
        Your full property report for <strong style={{color: "var(--ink)"}}>{displayAddr}</strong> is generating now. We'll email it in under 60 seconds.
      </p>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, maxWidth: 480, margin: "0 auto"}}>
        <div style={{padding: 16, background: "var(--bone-2)", borderRadius: 14, textAlign: "center"}}>
          <div style={{fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1}}>${(estimate/1000).toFixed(0)}K</div>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginTop: 4}}>Est. value</div>
        </div>
        <div style={{padding: 16, background: "var(--ink)", color: "var(--bone)", borderRadius: 14, textAlign: "center"}}>
          <div style={{fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1, color: "var(--lime)"}}>${Math.round(estimate * 0.06 - 2999).toLocaleString()}</div>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-dark)", marginTop: 4}}>Est. savings</div>
        </div>
        <div style={{padding: 16, background: "var(--bone-2)", borderRadius: 14, textAlign: "center"}}>
          <div style={{fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1}}>18d</div>
          <div style={{fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginTop: 4}}>Avg close</div>
        </div>
      </div>
    </div>
  );
}

window.SubmissionFlow = SubmissionFlow;

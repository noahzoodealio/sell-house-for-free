const { useState, useEffect, useRef } = React;

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
            <div className="kpi-num">{v3}<span className="unit"> days</span></div>
            <div className="kpi-label">Median time to offer</div>
          </div>
          <div className="kpi">
            <div className="kpi-num">{v4}<span className="unit">%</span></div>
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

function HowItWorks() {
  const steps = [
    { title: "List in 20 min", desc: "Answer a few questions. Our AI drafts your listing, handles photos, and pulls comps from MLS.", time: "Day 0", icon: "scan" },
    { title: "Go live everywhere", desc: "Syndication to Zillow, Redfin, Realtor.com, Trulia, and 97 more — plus an MLS-grade listing.", time: "Day 1", icon: "broadcast" },
    { title: "Manage offers", desc: "Inbox triages buyers, surfaces high-intent leads, auto-replies to duds, schedules tours.", time: "Day 3–14", icon: "inbox" },
    { title: "Close, keep the cash", desc: "Docs, disclosures, e-sign, escrow, wire instructions — every step handled by the platform.", time: "Day 18", icon: "lock" },
  ];

  const icons = {
    scan: <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>,
    broadcast: <><circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 8a5.66 5.66 0 000 8M16 8a5.66 5.66 0 010 8M5 5a9.9 9.9 0 000 14M19 5a9.9 9.9 0 010 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    inbox: <><path d="M3 13h4l2 3h6l2-3h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 5h14l2 8v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5l2-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="1.5"/></>,
  };

  return (
    <section className="how" id="how-it-works">
      <div className="container">
        <div className="how-head reveal">
          <div>
            <div className="eyebrow">How it works</div>
            <h2 className="display">From "let's sell" to "sold" — in under three weeks.</h2>
          </div>
          <p>Every step is automated by AI, backstopped by a licensed agent when you want one. You decide how hands-on we get.</p>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div key={i} className="step reveal" style={{transitionDelay: `${i * 80}ms`}}>
              <div className="step-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{icons[s.icon]}</svg>
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

function FeatureGrid() {
  const [barTick, setBarTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setBarTick(t => t + 1), 1800);
    return () => clearInterval(i);
  }, []);
  const activeIdx = barTick % 12;

  return (
    <section className="features" id="features">
      <div className="container">
        <div className="features-head reveal">
          <div className="eyebrow">What you get</div>
          <h2 className="display">A full listing stack — without the listing agent.</h2>
          <p style={{color: "var(--muted)", fontSize: 16}}>Every tool a 6% agent would use, running for you in the background.</p>
        </div>

        <div className="features-grid">
          <div className="feat big reveal">
            <div>
              <div className="pill" style={{marginBottom: 16}}>AI · Live</div>
              <h3>Pricing engine, trained on 41M comps.</h3>
              <p>Set a listing price backed by recent-sale data, neighborhood velocity, and your home's features. Updates daily as the market moves.</p>
            </div>
            <div className="viz">
              <div className="chart-bars">
                {Array.from({length: 12}).map((_, i) => (
                  <div key={i} className={i === activeIdx ? "active" : ""} style={{height: `${30 + ((i * 37) % 70)}%`}}/>
                ))}
              </div>
            </div>
          </div>

          <div className="feat med dark reveal">
            <div>
              <div className="pill pill-lime" style={{marginBottom: 16}}>100+ sites</div>
              <h3>MLS + every major portal.</h3>
              <p>Zillow, Redfin, Realtor.com, Trulia, Homes.com, and 97 more — one click, full syndication.</p>
            </div>
            <div className="viz" style={{display: "flex", flexWrap: "wrap", gap: 6, alignItems: "flex-end"}}>
              {["MLS", "Zillow", "Redfin", "Realtor", "Trulia", "Homes", "+97"].map((t, i) => (
                <span key={i} className="pill" style={{background: i === 0 ? "var(--lime)" : "var(--ink-3)", color: i === 0 ? "var(--ink)" : "var(--bone)", fontSize: 11}}>{t}</span>
              ))}
            </div>
          </div>

          <div className="feat sm reveal">
            <div>
              <h3 style={{fontSize: 22}}>E-sign & docs</h3>
              <p>Every disclosure, contract, and addendum — pre-filled and tracked.</p>
            </div>
            <div className="viz" style={{display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end"}}>
              {["Listing agreement", "Seller disclosure", "Purchase contract"].map((t, i) => (
                <div key={i} style={{display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bone-2)", borderRadius: 10, fontSize: 12, fontFamily: "var(--font-mono)"}}>
                  <span>{t}</span>
                  <span style={{color: "var(--lime-deep)"}}>✓ signed</span>
                </div>
              ))}
            </div>
          </div>

          <div className="feat sm lime reveal">
            <div>
              <h3 style={{fontSize: 22}}>On-call agents</h3>
              <p>Licensed, local, 7 days a week — from $0/call on paid plans.</p>
            </div>
            <div className="viz" style={{display: "flex", alignItems: "flex-end", gap: 8}}>
              <div style={{display: "flex"}}>
                <div style={{width: 36, height: 36, borderRadius: "50%", background: "oklch(0.5 0.08 255)", border: "2px solid var(--lime)"}}/>
                <div style={{width: 36, height: 36, borderRadius: "50%", background: "oklch(0.72 0.18 35)", border: "2px solid var(--lime)", marginLeft: -10}}/>
                <div style={{width: 36, height: 36, borderRadius: "50%", background: "oklch(0.3 0.02 255)", border: "2px solid var(--lime)", marginLeft: -10}}/>
              </div>
              <span style={{fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600}}>247 online</span>
            </div>
          </div>

          <div className="feat half reveal">
            <div>
              <div className="pill" style={{marginBottom: 16}}>Inbox AI</div>
              <h3>Offer triage that never sleeps.</h3>
              <p>Every message from buyers, agents, title, lender — scored, summarized, flagged for action. Reply in one tap.</p>
            </div>
            <div className="viz" style={{display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end"}}>
              <div style={{display: "flex", gap: 8, alignItems: "center", background: "var(--bone-2)", padding: "10px 14px", borderRadius: 12}}>
                <div style={{width: 8, height: 8, borderRadius: "50%", background: "var(--lime-deep)"}}/>
                <span style={{fontSize: 13, flex: 1}}><strong>Offer · $782K</strong> · all cash · 10-day close</span>
                <span style={{fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)"}}>2m</span>
              </div>
              <div style={{display: "flex", gap: 8, alignItems: "center", background: "var(--bone-2)", padding: "10px 14px", borderRadius: 12}}>
                <div style={{width: 8, height: 8, borderRadius: "50%", background: "oklch(0.72 0.18 35)"}}/>
                <span style={{fontSize: 13, flex: 1}}><strong>Tour request</strong> · Sat 2pm</span>
                <span style={{fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)"}}>14m</span>
              </div>
            </div>
          </div>

          <div className="feat half reveal">
            <div>
              <div className="pill" style={{marginBottom: 16}}>Showing stats</div>
              <h3>Watch demand build in real time.</h3>
              <p>Saves, tours, open-house traffic, and offer activity — charted so you can reprice with confidence.</p>
            </div>
            <div className="viz">
              <svg className="chart-svg" viewBox="0 0 400 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.88 0.2 125)" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="oklch(0.88 0.2 125)" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0 110 L40 95 L80 100 L120 80 L160 70 L200 55 L240 60 L280 40 L320 30 L360 20 L400 15 L400 140 L0 140 Z" fill="url(#g1)"/>
                <path d="M0 110 L40 95 L80 100 L120 80 L160 70 L200 55 L240 60 L280 40 L320 30 L360 20 L400 15" fill="none" stroke="var(--lime-deep)" strokeWidth="2"/>
                {[0,40,80,120,160,200,240,280,320,360,400].map((x, i) => {
                  const ys = [110,95,100,80,70,55,60,40,30,20,15];
                  return <circle key={i} cx={x} cy={ys[i]} r="3" fill="var(--lime-deep)"/>;
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.KpiStrip = KpiStrip;
window.HowItWorks = HowItWorks;
window.FeatureGrid = FeatureGrid;

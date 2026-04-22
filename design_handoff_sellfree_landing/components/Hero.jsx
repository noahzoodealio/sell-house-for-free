const { useState, useEffect, useRef } = React;

const SAMPLE_ADDRESSES = [
  { addr: "1429 Maple Grove Lane", city: "Austin, TX 78704", est: "$742,000" },
  { addr: "1429 Maple Street", city: "Denver, CO 80205", est: "$615,000" },
  { addr: "1429 Maple Ave", city: "Brooklyn, NY 11201", est: "$1,240,000" },
  { addr: "1429 Maplewood Dr", city: "Nashville, TN 37215", est: "$488,000" },
  { addr: "1429 Maple Ridge Rd", city: "Portland, OR 97214", est: "$692,000" },
];

function AddressInput({ onReveal, dark = false, onSubmit }) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setFocused(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = q.length > 1
    ? SAMPLE_ADDRESSES.filter(a => a.addr.toLowerCase().includes(q.toLowerCase()) || a.city.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : SAMPLE_ADDRESSES.slice(0, 4);

  const pick = (a) => {
    setQ(`${a.addr}, ${a.city}`);
    setSelected(a);
    setFocused(false);
    onReveal && onReveal(a);
  };

  const launch = () => {
    const picked = selected || SAMPLE_ADDRESSES[0];
    if (!selected) { setQ(`${picked.addr}, ${picked.city}`); setSelected(picked); onReveal && onReveal(picked); }
    onSubmit && onSubmit(picked);
  };

  return (
    <div className="address-box" ref={boxRef}>
      <svg className="pin" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
      <input
        placeholder="Enter your property address"
        value={q}
        onChange={e => { setQ(e.target.value); setFocused(true); setActive(0); }}
        onFocus={() => setFocused(true)}
        onKeyDown={e => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, matches.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
          if (e.key === "Enter" && matches[active]) pick(matches[active]);
        }}
      />
      <button className="btn btn-lime" onClick={launch}>
        Get my estimate
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {focused && matches.length > 0 && (
        <div className="autocomplete">
          {matches.map((a, i) => (
            <div
              key={i}
              className={"autocomplete-item " + (i === active ? "active" : "")}
              onMouseEnter={() => setActive(i)}
              onMouseDown={e => { e.preventDefault(); pick(a); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{opacity: 0.5}}>
                <path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <div>
                <div style={{fontWeight: 500}}>{a.addr}</div>
                <div style={{fontSize: 12, color: "var(--muted)"}}>{a.city}</div>
              </div>
              <span className="addr-meta">{a.est}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function useCounter(target, duration = 1600, trigger = true) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
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

function EstimateCard({ revealed }) {
  const [triggered, setTriggered] = useState(false);
  useEffect(() => {
    if (revealed) {
      setTriggered(false);
      const t = setTimeout(() => setTriggered(true), 200);
      return () => clearTimeout(t);
    } else {
      setTriggered(true);
    }
  }, [revealed]);

  const value = revealed ? parseInt(revealed.est.replace(/\D/g, '')) : 742000;
  const animated = useCounter(value, 1400, triggered);
  const savings = useCounter(Math.round(value * 0.055 - 499), 1400, triggered);

  const bars = [35, 55, 42, 68, 82, 76, 95, 88, 72, 90, 78, 84];

  return (
    <div className="estimate-card estimate-main">
      <div className="ec-head">
        <span className="pill pill-dark">
          <span className="dot-blink"></span>
          LIVE MARKET DATA
        </span>
        <span className="ec-label">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>
      <div className="ec-label" style={{marginTop: 8}}>Estimated home value</div>
      <div className="ec-value">${animated.toLocaleString()}</div>
      <div className="ec-meta">
        <span style={{color: "var(--lime)"}}>▲ 4.2% YoY</span>
        <span>· Confidence 94%</span>
      </div>
      <div className="ec-bars">
        {bars.map((h, i) => (
          <div
            key={i}
            className={"ec-bar " + (i >= 8 ? "hl" : "")}
            style={{ height: triggered ? `${h}%` : '8px', transitionDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      <div style={{fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted-dark)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12}}>
        12-month neighborhood trend
      </div>
      <div className="ec-stat-row">
        <div>
          <div className="k">With sellfree</div>
          <div className="v" style={{color: "var(--lime)"}}>${savings.toLocaleString()}</div>
        </div>
        <div>
          <div className="k">With 6% agent</div>
          <div className="v" style={{textDecoration: "line-through", opacity: 0.5}}>$0</div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const [revealed, setRevealed] = useState(null);
  const launchFlow = (addr) => { window.dispatchEvent(new CustomEvent("sf:open-flow", { detail: addr })); };

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="reveal in">
            <div className="pill" style={{marginBottom: 24}}>
              <span className="dot-blink"></span>
              Freemium · No listing fees · Live in 24 hrs
            </div>
            <h1 className="display">
              Sell your home.<br/>
              <span style={{color: "var(--lime-deep)", fontStyle: "italic"}}>For free.</span>
            </h1>
            <p className="hero-sub">
              AI-powered home selling with on-demand licensed agent support — pay <strong>$0 commission</strong>, keep the 6%. Listings, marketing, offers, docs, and closing — all in one platform.
            </p>
            <AddressInput onReveal={setRevealed} onSubmit={launchFlow} />
            <div className="trust-row">
              <div className="avatars">
                <div style={{background: "oklch(0.72 0.18 35)"}} />
                <div style={{background: "oklch(0.88 0.2 125)"}} />
                <div style={{background: "oklch(0.45 0.1 255)"}} />
                <div style={{background: "oklch(0.3 0.02 255)"}} />
              </div>
              <span><strong style={{color: "var(--ink)"}}>12,847 sellers</strong> saved an avg of $41,290 this year</span>
            </div>
          </div>
          <div className="estimate-stack reveal in">
            <div className="estimate-floating estimate-f1">
              <div style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4}}>You keep</div>
              <div style={{fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1}}>$40,921</div>
            </div>
            <EstimateCard revealed={revealed} />
            <div className="estimate-floating estimate-f2">
              <div style={{display: "flex", gap: 10, alignItems: "center"}}>
                <div style={{width: 32, height: 32, borderRadius: "50%", background: "repeating-linear-gradient(135deg, oklch(0.88 0.05 90) 0 4px, oklch(0.82 0.05 90) 4px 8px)"}} />
                <div>
                  <div style={{fontSize: 12, fontWeight: 600}}>Offer received · 2m ago</div>
                  <div style={{fontSize: 11, color: "var(--muted)"}}>$735K · All cash · 14-day close</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
window.AddressInput = AddressInput;
window.useCounter = useCounter;

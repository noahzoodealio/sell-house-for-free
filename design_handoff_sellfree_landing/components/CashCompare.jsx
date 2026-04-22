const { useState, useEffect, useRef } = React;

function CashOffer() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setPhase(p => (p + 1) % 4), 2200);
    return () => clearInterval(i);
  }, []);

  const steps = [
    { n: "01", title: "Share your address", desc: "60 seconds. No inspection. No staging.", time: "Today" },
    { n: "02", title: "Get a cash offer", desc: "Real, vetted-buyer offer within 24 hours.", time: "Day 1" },
    { n: "03", title: "Pick your close date", desc: "Anywhere from 7 to 90 days out. You choose.", time: "Day 2" },
    { n: "04", title: "Cash in your account", desc: "Wire transfer. No commissions. No repairs.", time: "Day 7+" },
  ];

  return (
    <section className="cash" id="cash-offer">
      <div className="container">
        <div className="cash-grid">
          <div className="reveal">
            <div className="eyebrow" style={{color: "var(--lime)"}}>Cash offer · Optional</div>
            <h2 className="display">Don't want to list? Take a <em>cash offer</em> in 24 hours.</h2>
            <p className="cash-sub">Skip the listing entirely. Our network of institutional and investor buyers will make a real cash offer on your home — no repairs, no showings, no commission.</p>
            <div style={{display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32}}>
              <button className="btn btn-lime btn-lg">Request a cash offer</button>
              <button className="btn btn-dark-ghost btn-lg">How it compares</button>
            </div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 460}}>
              <div style={{paddingLeft: 16, borderLeft: "1px solid var(--line-dark)"}}>
                <div style={{fontFamily: "var(--font-display)", fontSize: 32, color: "var(--lime)"}}>24 hrs</div>
                <div style={{fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-dark)", marginTop: 4}}>To first offer</div>
              </div>
              <div style={{paddingLeft: 16, borderLeft: "1px solid var(--line-dark)"}}>
                <div style={{fontFamily: "var(--font-display)", fontSize: 32, color: "var(--lime)"}}>0%</div>
                <div style={{fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-dark)", marginTop: 4}}>Commission on cash sale</div>
              </div>
            </div>
          </div>

          <div className="cash-panel reveal">
            <div className="cash-badge">Live buyer network · 284 active</div>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16}}>
              <div>
                <div style={{fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-dark)"}}>Cash offer timeline</div>
                <div style={{fontFamily: "var(--font-display)", fontSize: 28, marginTop: 4}}>From address to wire: 7 days</div>
              </div>
            </div>
            <div className="cash-timeline">
              {steps.map((s, i) => (
                <div key={i} className="cash-step" style={{
                  opacity: phase >= i ? 1 : 0.4,
                  transition: "opacity 0.5s"
                }}>
                  <div className="cash-step-num" style={{color: phase === i ? "var(--lime)" : "var(--muted-dark)"}}>{s.n}</div>
                  <div className="cash-step-content" style={{flex: 1}}>
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

function CompareTable() {
  const rows = [
    { name: "Listing commission", sub: "On a $750K home", us: "$0–$2,999 flat", agent: "$45,000", fsbo: "$0" },
    { name: "MLS + Zillow + 100 sites", us: true, agent: true, fsbo: false },
    { name: "Professional photos", us: true, agent: true, fsbo: false },
    { name: "Pricing + comps analysis", us: "AI + agent review", agent: "Agent only", fsbo: "DIY" },
    { name: "Licensed agent support", us: "On-demand", agent: true, fsbo: false },
    { name: "Offer & contract handling", us: true, agent: true, fsbo: "DIY" },
    { name: "Closing coordinator", us: true, agent: true, fsbo: false },
    { name: "Cash-offer option", us: true, agent: false, fsbo: false },
    { name: "Avg. time to sale", us: "18 days", agent: "32 days", fsbo: "47 days" },
  ];

  const Cell = ({ v, us }) => {
    if (v === true) return <span className={"check"}>✓</span>;
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
          {rows.map((r, i) => (
            <div key={i} className="compare-row-data">
              <div className="feat-name">
                {r.name}
                {r.sub && <span className="sub">{r.sub}</span>}
              </div>
              <div><Cell v={r.us} us/></div>
              <div><Cell v={r.agent}/></div>
              <div><Cell v={r.fsbo}/></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

window.CashOffer = CashOffer;
window.CompareTable = CompareTable;

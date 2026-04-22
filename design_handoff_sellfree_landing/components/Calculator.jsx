const { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = React;

const TIERS = {
  starter: { label: "Free", price: 0, fee: 0, includes: "Self-service listing on all major platforms" },
  essentials: { label: "Essentials", price: 799, fee: 799, includes: "On-call licensed agent + pro photos + boosts" },
  pro: { label: "Pro", price: 2999, fee: 2999, includes: "Full-service agent, end-to-end handled", badge: "Most popular" },
};

function Calculator() {
  const [tier, setTier] = useState2("essentials");
  const [value, setValue] = useState2(750000);
  const trackRef = useRef2(null);
  const switchRef = useRef2(null);
  const [pill, setPill] = useState2({ left: 4, width: 0 });

  const min = 150000, max = 3000000;
  const percent = ((value - min) / (max - min)) * 100;

  const agentCost = Math.round(value * 0.06);
  const ourCost = TIERS[tier].fee;
  const savings = Math.max(0, agentCost - ourCost);
  const youKeep = value - ourCost;

  const animSavings = useCounter(savings, 900, true);

  useEffect2(() => {
    if (!switchRef.current) return;
    const btn = switchRef.current.querySelector(`[data-tier="${tier}"]`);
    if (btn) {
      setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [tier]);

  const fmt = (n) => "$" + Math.round(n).toLocaleString();

  const keepPct = (youKeep / value) * 100;

  return (
    <section className="calc" id="savings">
      <div className="container">
        <div className="calc-grid">
          <div className="reveal">
            <div className="eyebrow">Savings calculator</div>
            <h2 className="display">See how much you could <em style={{fontStyle: "italic", color: "var(--lime)"}}>keep</em>.</h2>
            <p style={{color: "var(--muted-dark)", fontSize: 17, lineHeight: 1.55, marginBottom: 32, maxWidth: 440}}>
              Traditional agents charge 6% — split between buyer and seller side. Pick a plan, slide your home value, watch the math.
            </p>
            <div style={{display: "flex", gap: 12, flexWrap: "wrap"}}>
              <button className="btn btn-lime btn-lg">
                Start selling free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="btn btn-dark-ghost btn-lg">Compare all plans</button>
            </div>

            <div style={{marginTop: 48, display: "flex", gap: 32}}>
              <div>
                <div style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-dark)"}}>Avg. transaction</div>
                <div style={{fontFamily: "var(--font-display)", fontSize: 32, marginTop: 6}}>18 days</div>
              </div>
              <div>
                <div style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-dark)"}}>Offer rate</div>
                <div style={{fontFamily: "var(--font-display)", fontSize: 32, marginTop: 6}}>93%</div>
              </div>
              <div>
                <div style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-dark)"}}>Over ask</div>
                <div style={{fontFamily: "var(--font-display)", fontSize: 32, marginTop: 6, color: "var(--lime)"}}>+$8.2K</div>
              </div>
            </div>
          </div>

          <div className="calc-panel reveal">
            <div className="tier-switch" ref={switchRef}>
              <div className="slider-pill" style={{left: pill.left, width: pill.width}}/>
              {Object.keys(TIERS).map(k => (
                <button key={k} data-tier={k} className={tier === k ? "active" : ""} onClick={() => setTier(k)}>
                  {TIERS[k].label} {TIERS[k].price > 0 ? `· $${TIERS[k].price}` : ""}
                </button>
              ))}
            </div>

            <div className="savings-display">
              <div className="savings-label">Your estimated savings</div>
              <div className="savings-value">{fmt(animSavings)}</div>
              <div style={{fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted-dark)", marginTop: 8}}>
                vs. a traditional 6% agent commission
              </div>
            </div>

            <div className="home-value-group">
              <div className="home-value-row">
                <span className="label">Your home value</span>
                <span className="val">{fmt(value)}</span>
              </div>
              <div className="range-wrap" ref={trackRef}>
                <div className="range-track" />
                <div className="range-fill" style={{width: `${percent}%`}} />
                <input
                  type="range"
                  className="range-input"
                  min={min} max={max} step={5000}
                  value={value}
                  onChange={e => setValue(parseInt(e.target.value))}
                />
              </div>
              <div className="range-ticks">
                <span>$150K</span><span>$1M</span><span>$2M</span><span>$3M+</span>
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
              <div style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-dark)"}}>
                Proceeds from sale
              </div>
              <div className="keep-bar">
                <div className="you" style={{width: `${keepPct}%`}}>
                  You keep {fmt(youKeep)}
                </div>
                <div className="them" style={{width: `${100 - keepPct}%`}}>
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

window.Calculator = Calculator;

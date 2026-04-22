const { useState, useEffect, useRef } = React;

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
        <a href="#" className="wordmark" style={{textDecoration: "none"}}>
          <span className="dot">sellfree</span><span className="ai">.ai</span>
        </a>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#savings">Savings</a>
          <a href="#features">Features</a>
          <a href="#cash-offer">Cash offer</a>
          <a href="#stories">Stories</a>
        </div>
        <div className="nav-cta">
          <a href="#" style={{textDecoration: "none", opacity: 0.8}}>Log in</a>
          <a href="#" className="btn btn-primary">Start free</a>
        </div>
      </div>
    </nav>
  );
}

function Marquee() {
  const items = ["Sell for free", "Keep the 6%", "18-day average close", "Licensed in 50 states", "MLS + 100 portals", "Cash offers in 24 hrs", "AI pricing engine", "On-demand agent support"];
  const loop = [...items, ...items, ...items];
  return (
    <div style={{background: "var(--lime)", color: "var(--ink)", padding: "14px 0", overflow: "hidden", borderTop: "1px solid var(--lime-deep)", borderBottom: "1px solid var(--lime-deep)"}}>
      <div className="marquee">
        <div className="marquee-track">
          {loop.map((t, i) => (
            <span key={i} style={{display: "inline-flex", alignItems: "center", gap: 48, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase"}}>
              {t} <span style={{opacity: 0.4}}>/</span>
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
          <span className="press-label" style={{fontFamily: "var(--font-mono)", color: "var(--ink)"}}>TRUSTPILOT · 4.9 ★</span>
        </div>
      </div>
    </section>
  );
}

function FloatCTA() {
  return (
    <div className="float-cta" onClick={() => document.getElementById("savings")?.scrollIntoView({behavior: "smooth", block: "start"})}>
      <span className="dot-blink"></span>
      Calculate your savings
    </div>
  );
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add("in");
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function App() {
  useReveal();
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowAddr, setFlowAddr] = useState(null);
  useEffect(() => {
    const onOpen = (e) => { setFlowAddr(e.detail); setFlowOpen(true); };
    window.addEventListener("sf:open-flow", onOpen);
    return () => window.removeEventListener("sf:open-flow", onOpen);
  }, []);
  return (
    <>
      <Nav/>
      <Hero/>
      <Marquee/>
      <PressBar/>
      <KpiStrip/>
      <Calculator/>
      <HowItWorks/>
      <FeatureGrid/>
      <CashOffer/>
      <CompareTable/>
      <Testimonials/>
      <FAQ/>
      <FinalCTA/>
      <Footer/>
      <FloatCTA/>
      <SubmissionFlow open={flowOpen} onClose={() => setFlowOpen(false)} seedAddress={flowAddr}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

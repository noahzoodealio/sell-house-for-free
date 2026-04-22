const { useState, useEffect, useRef } = React;

const TESTIMONIALS = [
  { name: "Jess & Terry", loc: "Boulder, CO", saved: "$65K", quote: "\"We saved sixty-five grand and never felt like we were on our own. When we needed a human, they were right there.\"", headline: "Jess & Terry saved", amount: "$65,000", sub: "The platform paid for itself in the first 48 hours." },
  { name: "Bradd", loc: "Yorba Linda, CA", saved: "$130K", quote: "\"Listed the home, hosted four open houses, opened escrow in under a week. Sale closed $135K over asking.\"", headline: "Bradd sold", amount: "$135K over ask", sub: "Four open houses. Escrow in seven days. No agent." },
  { name: "Lorraine", loc: "Denver, CO", saved: "$14K", quote: "\"I was skeptical. The AI walked me through disclosures better than my last agent ever did.\"", headline: "Lorraine closed in", amount: "11 days", sub: "From listing to contract — faster than a traditional agent." },
  { name: "Mike & Dana", loc: "Austin, TX", saved: "$42K", quote: "\"Cash offer option was the closer for us. Got three offers within 24 hours, picked the best one.\"", headline: "Mike & Dana took", amount: "$42K in savings", sub: "Three cash offers in 24 hours. Picked the best, closed in 12 days." },
];

function Testimonials() {
  const [active, setActive] = useState(0);
  const t = TESTIMONIALS[active];

  return (
    <section className="testi" id="stories">
      <div className="container">
        <div className="testi-head reveal">
          <div className="eyebrow" style={{color: "var(--lime)"}}>Seller stories</div>
          <h2 className="display">Homeowners are saving an average of <span className="amt">$41,290.</span></h2>
          <p style={{color: "var(--muted-dark)", fontSize: 16, maxWidth: 620, margin: "0 auto"}}>
            Across every price point, every market, every closing timeline.
          </p>
        </div>

        <div className="testi-grid reveal">
          <div className="testi-list">
            {TESTIMONIALS.map((x, i) => (
              <div key={i} className={"testi-item " + (active === i ? "active" : "")} onClick={() => setActive(i)}>
                <div className="testi-item-head">
                  <div className="testi-person">
                    <div className="testi-avatar" style={{background: `repeating-linear-gradient(${i * 47}deg, oklch(0.4 0.04 ${i * 60}) 0 6px, oklch(0.3 0.02 255) 6px 12px)`}}/>
                    <div>
                      <div className="name">{x.name}</div>
                      <div className="loc">{x.loc}</div>
                    </div>
                  </div>
                  <span className="testi-saved">Saved {x.saved}</span>
                </div>
                <div className="testi-quote">{x.quote}</div>
              </div>
            ))}
          </div>

          <div className="testi-feature">
            <div className="testi-feature-img img-ph">
              <span className="img-ph-tag">portrait · seller at home</span>
              <div style={{fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em"}}>{t.name.toLowerCase()}_kitchen_morning.jpg</div>
            </div>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap"}}>
              <div style={{flex: 1, minWidth: 280}}>
                <h3>{t.headline} <em>{t.amount}</em></h3>
                <p>{t.sub}</p>
              </div>
              <button className="btn btn-lime">
                Read full story
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Is it really free to list?", a: "Yes — our Starter plan is $0 to list your home on the MLS and 100+ portals, with our AI pricing and marketing tools. You'll only pay standard closing costs (title, escrow, transfer taxes) at the end, like with any sale. Upgrade to Essentials or Pro if you want hands-on agent support." },
  { q: "How do you make money if it's free?", a: "We partner with vetted title, escrow, and mortgage providers who pay us a referral when our sellers opt in — at no markup. We also earn on our Essentials and Pro plans, where sellers pay a flat fee for extra support. You never pay a percentage commission." },
  { q: "What does a 'licensed agent' actually do here?", a: "On Essentials ($799) and Pro ($2,999) plans, a licensed agent in your state is assigned to your listing. They review your pricing, negotiate offers on your behalf if you want, attend closing, and answer questions on demand — by phone, chat, or video." },
  { q: "How is the cash offer different from Opendoor or Offerpad?", a: "We don't buy your home — we route your info to a vetted network of investor and institutional buyers who bid competitively. That means you'll see multiple cash offers, not just one. You keep full control over who to pick, or whether to take any of them." },
  { q: "Can I actually save $40K+?", a: "On a $750K home, a traditional 6% commission is $45,000. Our Pro plan is a $2,999 flat fee — that's $42,001 in savings. Savings scale with home price. Use the calculator above with your own home value." },
  { q: "What if I get stuck or things go sideways?", a: "Every paid plan includes a licensed agent and a closing coordinator. If you're on the free plan and need help, you can upgrade mid-listing or book a one-off consult at $99." },
];

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="faq-inner">
          <div className="reveal">
            <div className="eyebrow">FAQ</div>
            <h2 className="display">The honest answers.</h2>
            <p style={{color: "var(--ink-3)", fontSize: 15, maxWidth: 300}}>
              Can't find what you're looking for? <a href="#" style={{color: "var(--ink)", textDecoration: "underline"}}>Talk to a licensed agent</a>.
            </p>
          </div>
          <div className="faq-list reveal">
            {FAQS.map((f, i) => (
              <div key={i} className={"faq-item " + (open === i ? "open" : "")}>
                <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                  <span>{f.q}</span>
                  <span className="plus">+</span>
                </button>
                <div className="faq-a"><div className="faq-a-inner">{f.a}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const launchFlow = (addr) => { window.dispatchEvent(new CustomEvent("sf:open-flow", { detail: addr })); };
  return (
    <section className="final">
      <div className="final-hero-word">sellfree</div>
      <div className="container">
        <div className="final-inner reveal">
          <div className="eyebrow" style={{marginBottom: 16}}>Ready when you are</div>
          <h2 className="display">Keep the <em>commission.</em></h2>
          <p className="final-sub">30-second signup. Free to list. Save the average seller $41,290.</p>
          <AddressInput onSubmit={launchFlow} />
          <div style={{marginTop: 24, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink)", opacity: 0.6}}>
            No card required · Cancel anytime · Licensed in all 50 states
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-huge">sellfree</div>
      <div className="container" style={{position: "relative", zIndex: 1}}>
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="wordmark"><span className="dot">sellfree</span><span className="ai">.ai</span></span>
            <p>Sell your home on your terms — for a flat fee, not a 6% commission. Licensed in all 50 states.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#">How it works</a></li>
              <li><a href="#">Pricing plans</a></li>
              <li><a href="#">Cash offer</a></li>
              <li><a href="#">Savings calculator</a></li>
              <li><a href="#">Browse listings</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Learn</h4>
            <ul>
              <li><a href="#">Seller guides</a></li>
              <li><a href="#">State guides</a></li>
              <li><a href="#">True cost analysis</a></li>
              <li><a href="#">FSBO vs agent</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Agents</a></li>
              <li><a href="#">Brokerages</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li><a href="#" style={{color: "var(--lime)"}}>hi@sellfree.ai</a></li>
              <li style={{color: "var(--muted-dark)", fontSize: 13}}>sellfree.ai, Inc.</li>
              <li style={{color: "var(--muted-dark)", fontSize: 13}}>1890 Market Street</li>
              <li style={{color: "var(--muted-dark)", fontSize: 13}}>San Francisco, CA 94102</li>
            </ul>
            <div style={{display: "flex", gap: 14, marginTop: 20}}>
              {["IG", "FB", "X", "in"].map(s => (
                <a key={s} href="#" style={{width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--line-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-mono)"}}>{s}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 sellfree.ai, Inc. — Licensed broker in 50 states.</span>
          <div style={{display: "flex", gap: 24}}>
            <a href="#" style={{color: "inherit", textDecoration: "none"}}>Privacy</a>
            <a href="#" style={{color: "inherit", textDecoration: "none"}}>Terms</a>
            <a href="#" style={{color: "inherit", textDecoration: "none"}}>Do not sell my data</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

window.Testimonials = Testimonials;
window.FAQ = FAQ;
window.FinalCTA = FinalCTA;
window.Footer = Footer;

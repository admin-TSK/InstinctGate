export default function HomePage() {
  return (
    <div className="wrap">
      <header className="site-header">
        <a className="brand" href="/">
          InstinctGate
        </a>
        <nav className="nav">
          <a href="#product">Product</a>
          <a href="#pricing">Pricing</a>
          <a href="#install">Install</a>
          <a href="/trial">Trial</a>
        </nav>
      </header>

      <main>
        <section className="hero" style={{ borderTop: "none", paddingTop: "4rem" }}>
          <h1>Your coding agent should get smarter after every session.</h1>
          <p className="lede">
            InstinctGate captures instincts from the run, promotes the winners
            into skills, and scores verification so you know the session
            actually stuck.
          </p>
          <p className="subhead">
            A thin bolt-on for Cursor and Claude. Paid cloud product with a
            7-day trial. Account and card required. Hosted vault sync and a web
            scoreboard included.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="/trial">
              Start 7-day trial
            </a>
            <a className="btn btn-ghost" href="#install">
              Install after signup
            </a>
          </div>
          <span className="pro-tease">
            Draft about A$29 AUD/mo after trial. Card required to start. Stripe
            Checkout not live yet; no fake paid checkout.
          </span>
        </section>

        <section id="problem">
          <h2>The problem</h2>
          <p className="problem">
            Agents forget. You rediscover the same pitfall next week. Giant
            skill packs look impressive and still do not learn from{" "}
            <em>your</em> last hour of work.
          </p>
        </section>

        <section id="product">
          <h2>What it does</h2>
          <div className="steps">
            <article className="card">
              <h3>1. Capture</h3>
              <p>
                Turn a short session summary into 1 to 5 instinct candidates
                with confidence.
              </p>
            </article>
            <article className="card">
              <h3>2. Promote</h3>
              <p>
                Graduate a strong instinct into a SKILL.md stub you can reuse.
              </p>
            </article>
            <article className="card">
              <h3>3. Score</h3>
              <p>
                Plan, tests, review, verify. A simple scoreboard, not vibes.
              </p>
            </article>
          </div>
          <p className="install-note" style={{ marginTop: "1.25rem" }}>
            Compatible with Cursor rules and Claude skills. Cloud sync, web
            scoreboard, and multi-device recall are part of the paid product.
          </p>
        </section>

        <section id="pricing">
          <h2>Pricing</h2>
          <article className="card" style={{ maxWidth: "36rem" }}>
            <h3>InstinctGate subscription</h3>
            <p>
              <strong>No free tier.</strong> Paid subscription only. Draft
              about <strong>A$29 AUD per month</strong> per seat.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              <strong>7-day trial</strong> with account + credit card collected
              upfront (Stripe subscription trial with payment method on file).
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Includes hosted vault sync, web scoreboard, multi-device recall,
              and device-token API access.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              MIT source may exist in the public repo for transparency. That is
              not a free forever product tier.
            </p>
          </article>
          <div className="cta-row" style={{ marginTop: "1.25rem" }}>
            <a className="btn btn-primary" href="/trial">
              Start 7-day trial
            </a>
          </div>
          <p className="install-note">
            Real Stripe Checkout is not wired yet. CTA goes to the{" "}
            <a href="/trial">/trial</a> waitlist; no fake Checkout URL.
          </p>
        </section>

        <section id="install">
          <h2>Install (after signup / trial)</h2>
          <div className="install-block">
            <pre>
              <code>npx instinctgate@latest setup</code>
            </pre>
          </div>
          <p className="install-note">
            For trial and paid customers. Vault, Cursor rule, Claude skill,
            smoke capture. Start the 7-day trial (account + card) before
            treating install as the happy path.
          </p>
        </section>

        <section id="cta">
          <h2>Next step</h2>
          <p className="problem">
            Start the 7-day trial. Then run setup. Star the repo if the loop
            helps your agents compound.
          </p>
          <div className="cta-row" style={{ marginTop: "1rem" }}>
            <a className="btn btn-primary" href="/trial">
              Start 7-day trial
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          Built in Australia. Not a clone of anyone&apos;s 200-skill empire.
          Just the loop that makes agents compound.
        </p>
        <p>
          InstinctGate - paid SaaS with a card-required 7-day trial. No free
          tier.
        </p>
      </footer>
    </div>
  );
}

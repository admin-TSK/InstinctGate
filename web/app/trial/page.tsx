"use client";

import { FormEvent, useState } from "react";
import { PRICE_AUD_MO, STRIPE_TEST_PAYMENT_LINK, TRIAL_DAYS } from "../../lib/billing";

export default function TrialPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: "trial-page" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("err");
        setMessage(data.message ?? "Could not join waitlist.");
        return;
      }
      setStatus("ok");
      setMessage(
        "Saved. Prefer the Stripe Checkout link above for the real card-required trial. Waitlist is a fallback until Vercel + live keys ship."
      );
      setEmail("");
    } catch {
      setStatus("err");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <div className="wrap">
      <header className="site-header">
        <a className="brand" href="/">
          InstinctGate
        </a>
        <nav className="nav">
          <a href="/#product">Product</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#install">Install</a>
          <a href={STRIPE_TEST_PAYMENT_LINK}>Trial</a>
        </nav>
      </header>

      <main>
        <section className="hero" style={{ borderTop: "none", paddingTop: "3rem" }}>
          <h1>Start your {TRIAL_DAYS}-day trial</h1>
          <p className="lede">
            Paid subscription only. No free tier. Trial requires an account and
            a credit card upfront. Draft about A${PRICE_AUD_MO} AUD/mo after trial.
          </p>
          <p className="subhead">
            Stripe TEST Checkout is live via Payment Link. Use a Stripe test
            card. Live money starts after the sandbox is claimed and Vercel is
            deployed.
          </p>

          <div className="cta-row" style={{ marginTop: "1.25rem" }}>
            <a className="btn btn-primary" href={STRIPE_TEST_PAYMENT_LINK}>
              Start {TRIAL_DAYS}-day trial (Stripe)
            </a>
          </div>
          <p className="install-note" style={{ marginTop: "0.75rem" }}>
            Card required. No free tier. After checkout:{" "}
            <code>npx instinctgate@latest setup</code>
          </p>

          <article className="card" style={{ maxWidth: "28rem", marginTop: "2rem" }}>
            <h3>Optional waitlist fallback</h3>
            <p className="install-note" style={{ marginTop: "0.5rem" }}>
              Prefer Checkout above. Waitlist only if you cannot complete TEST
              checkout yet.
            </p>
            <form onSubmit={onSubmit} style={{ marginTop: "1rem" }}>
              <label
                htmlFor="email"
                style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem" }}
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{
                  width: "100%",
                  padding: "0.65rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border)",
                  background: "#0b0d10",
                  color: "var(--text)",
                  fontSize: "1rem",
                }}
              />
              <button
                className="btn btn-ghost"
                type="submit"
                disabled={status === "loading"}
                style={{ marginTop: "0.9rem", width: "100%" }}
              >
                {status === "loading" ? "Saving…" : "Join waitlist fallback"}
              </button>
            </form>
            {message ? (
              <p
                className="install-note"
                style={{
                  marginTop: "0.85rem",
                  color: status === "err" ? "#ff8f8f" : undefined,
                }}
              >
                {message}
              </p>
            ) : null}
          </article>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          InstinctGate - paid SaaS. {TRIAL_DAYS}-day trial with card required. Built in
          Australia.
        </p>
      </footer>
    </div>
  );
}

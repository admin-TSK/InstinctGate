"use client";

import { FormEvent, useState } from "react";

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
        "You are on the waitlist. When Stripe is live you will get a 7-day trial with account + card required. No free tier."
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
        </nav>
      </header>

      <main>
        <section className="hero" style={{ borderTop: "none", paddingTop: "3rem" }}>
          <h1>Start your 7-day trial</h1>
          <p className="lede">
            Paid subscription only. No free tier. Trial requires an account and
            a credit card upfront. Draft about A$29 AUD/mo after trial.
          </p>
          <p className="subhead">
            Stripe Checkout is not live yet, so this page collects a waitlist
            email. When Checkout ships, you will go straight to a real card
            form (trial_period_days: 7). No fake paid checkout here.
          </p>

          <article className="card" style={{ maxWidth: "28rem", marginTop: "1.5rem" }}>
            <h3>Join the trial waitlist</h3>
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
                className="btn btn-primary"
                type="submit"
                disabled={status === "loading"}
                style={{ marginTop: "0.9rem", width: "100%" }}
              >
                {status === "loading" ? "Joining…" : "Join waitlist"}
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

          <p className="install-note" style={{ marginTop: "1.5rem" }}>
            After signup / trial:{" "}
            <code>npx instinctgate@latest setup</code>
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          InstinctGate - paid SaaS. 7-day trial with card required. Built in
          Australia.
        </p>
      </footer>
    </div>
  );
}

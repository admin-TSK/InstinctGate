import Fastify from "fastify";
import Stripe from "stripe";
import { store } from "./store.js";
import { registerPortalRoutes } from "./billing-portal.js";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

/** Stripe keys from process.env only (never load stripe.env from the repo). */
const STRIPE_SECRET_KEY = (process.env.STRIPE_SECRET_KEY ?? "").trim();
const STRIPE_PRICE_ID = (process.env.STRIPE_PRICE_ID ?? "").trim();
const stripeConfigured = Boolean(STRIPE_SECRET_KEY && STRIPE_PRICE_ID);

const stripe = stripeConfigured
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;

const FALLBACK_SUCCESS_URL =
  "https://github.com/admin-TSK/InstinctGate?checkout=success";
const FALLBACK_CANCEL_URL =
  "https://github.com/admin-TSK/InstinctGate?checkout=cancel";

const app = Fastify({ logger: true });

function bearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m?.[1];
}

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function urlOrFallback(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
    return value.trim();
  }
  return fallback;
}

app.get("/health", async () => ({
  ok: true,
  service: "instinctgate-pro-api",
  stub: !stripeConfigured,
  stripe: stripeConfigured,
  pricing: {
    free_tier: false,
    trial_days: 7,
    card_required: true,
    price_aud_mo: 29,
  },
  note: stripeConfigured
    ? "Stripe TEST keys present. Checkout Sessions are live."
    : "Local stub only. Not production. No Stripe Checkout until STRIPE_SECRET_KEY + STRIPE_PRICE_ID are set.",
}));

app.post<{ Body: { code?: string; email?: string } }>("/v1/auth/device", async (req) => {
  const email = isEmail(req.body?.email) ? req.body!.email!.trim().toLowerCase() : null;
  const record = store.createDeviceToken(email);
  return {
    device_token: record.token,
    expires_at: record.expires_at,
    stub: true,
    echo: { code: req.body?.code ?? null, email },
  };
});

app.post<{ Body: { device_token?: string } }>("/v1/auth/revoke", async (req, reply) => {
  const fromBody = typeof req.body?.device_token === "string" ? req.body.device_token : undefined;
  const token = fromBody ?? bearerToken(req.headers.authorization);
  const revoked = store.revokeToken(token);
  if (!revoked) {
    return reply.code(404).send({ error: "not_found", message: "Unknown or already revoked device_token." });
  }
  return { revoked: true, stub: true };
});

app.get("/v1/me", async (req, reply) => {
  const token = bearerToken(req.headers.authorization);
  const rec = store.getToken(token);
  if (!rec) {
    return reply.code(401).send({ error: "unauthorized", message: "Bearer device_token required. POST /v1/auth/device first." });
  }
  const entitlement = store.entitlementForEmail(rec.email, stripeConfigured);
  return {
    account: { email: rec.email, device_expires_at: rec.expires_at },
    entitlement,
    product: { free_tier: false, trial_requires_card: true, trial_days: 7, price_aud_mo: 29 },
    stub: !stripeConfigured,
    stripe_live: stripeConfigured,
  };
});

app.post<{ Body: { email?: string; success_url?: string; cancel_url?: string } }>("/v1/billing/checkout-session", async (req, reply) => {
  const email = isEmail(req.body?.email) ? req.body!.email!.trim().toLowerCase() : null;
  const success_url = urlOrFallback(req.body?.success_url, FALLBACK_SUCCESS_URL);
  const cancel_url = urlOrFallback(req.body?.cancel_url, FALLBACK_CANCEL_URL);

  if (!stripeConfigured || !stripe) {
    return {
      live: false, stripe_live: false, mode: "subscription", currency: "aud", price_aud_mo: 29,
      trial_period_days: 7, payment_method_collection: "always", requires: ["account", "card"], free_tier: false,
      email, success_url: req.body?.success_url ?? null, cancel_url: req.body?.cancel_url ?? null,
      checkout_url: null,
      message: "Stripe Checkout is not live. Start waitlist via POST /v1/billing/waitlist. Set STRIPE_SECRET_KEY + STRIPE_PRICE_ID to enable Checkout Sessions.",
      stub: true,
    };
  }

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      payment_method_collection: "always",
      success_url,
      cancel_url,
    };
    if (email) sessionParams.customer_email = email;
    const session = await stripe.checkout.sessions.create(sessionParams);
    return {
      live: true, stripe_live: true, mode: "subscription", currency: "aud", price_aud_mo: 29,
      trial_period_days: 7, payment_method_collection: "always", requires: ["account", "card"], free_tier: false,
      email, success_url, cancel_url, checkout_url: session.url, session_id: session.id, stub: false,
    };
  } catch (err) {
    req.log.error({ err }, "stripe checkout.sessions.create failed");
    return reply.code(502).send({ error: "stripe_checkout_failed", message: "Failed to create Stripe Checkout Session.", live: false, checkout_url: null });
  }
});

registerPortalRoutes(app, { stripe, stripeSecretKey: STRIPE_SECRET_KEY });

app.post<{ Body: { email?: string; source?: string } }>("/v1/billing/waitlist", async (req, reply) => {
  if (!isEmail(req.body?.email)) {
    return reply.code(400).send({ error: "invalid_email", message: "Valid email required." });
  }
  const entry = store.addWaitlist(req.body!.email!, typeof req.body?.source === "string" ? req.body.source : "api");
  return {
    ok: true, waitlisted: true, email: entry.email, created_at: entry.created_at,
    next: stripeConfigured
      ? "Stripe Checkout is available via POST /v1/billing/checkout-session (7-day trial, card required). No free tier."
      : "When Stripe is live you will get Checkout (7-day trial, card required). No free tier.",
    stub: true, stripe_live: stripeConfigured,
  };
});

app.get("/v1/billing/waitlist", async () => ({
  count: store.waitlist.length, stub: true, note: "In-memory only; resets on process exit.",
}));

app.post<{ Body: { instincts?: Array<Record<string, unknown> & { id: string; updated_at?: string }>; skills?: Array<Record<string, unknown> & { id: string; updated_at?: string }> } }>("/v1/vault/sync", async (req, reply) => {
  const token = bearerToken(req.headers.authorization);
  if (!store.hasToken(token)) {
    return reply.code(401).send({ error: "unauthorized", message: "Bearer device_token required. POST /v1/auth/device first." });
  }
  const result = store.syncVault({ instincts: (req.body?.instincts ?? []) as never, skills: (req.body?.skills ?? []) as never });
  return { accepted: result.accepted, conflicts: result.conflicts, counts: { instincts: store.instincts.size, skills: store.skills.size } };
});

app.post<{ Body: Record<string, unknown> }>("/v1/scorecards", async (req, reply) => {
  const token = bearerToken(req.headers.authorization);
  if (!store.hasToken(token)) {
    return reply.code(401).send({ error: "unauthorized", message: "Bearer device_token required. POST /v1/auth/device first." });
  }
  const body = req.body ?? {};
  const card = store.addScorecard({
    session: typeof body.session === "string" ? body.session : undefined,
    checks: body.checks,
    band: typeof body.band === "string" ? body.band : undefined,
    raw: typeof body.raw === "string" ? body.raw : undefined,
    ...body,
  });
  return { scorecard: card };
});

async function main() {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(
    stripeConfigured
      ? `InstinctGate Pro API on http://${HOST}:${PORT} (Stripe Checkout enabled)`
      : `InstinctGate Pro API stub on http://${HOST}:${PORT} (NOT production, no Stripe)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

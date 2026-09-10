import Fastify from "fastify";
import { store } from "./store.js";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

function bearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m?.[1];
}

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

app.get("/health", async () => ({
  ok: true,
  service: "instinctgate-pro-api",
  stub: true,
  stripe: false,
  pricing: {
    free_tier: false,
    trial_days: 7,
    card_required: true,
    price_aud_mo: 29,
  },
  note: "Local stub only. Not production. No Stripe Checkout.",
}));

/** Stub device auth: returns a disposable device_token. No magic-link yet. */
app.post<{
  Body: { code?: string; email?: string };
}>("/v1/auth/device", async (req) => {
  const email = isEmail(req.body?.email) ? req.body!.email!.trim().toLowerCase() : null;
  const record = store.createDeviceToken(email);
  return {
    device_token: record.token,
    expires_at: record.expires_at,
    stub: true,
    echo: {
      code: req.body?.code ?? null,
      email,
    },
  };
});

app.post<{
  Body: { device_token?: string };
}>("/v1/auth/revoke", async (req, reply) => {
  const fromBody = typeof req.body?.device_token === "string" ? req.body.device_token : undefined;
  const token = fromBody ?? bearerToken(req.headers.authorization);
  const revoked = store.revokeToken(token);
  if (!revoked) {
    return reply.code(404).send({
      error: "not_found",
      message: "Unknown or already revoked device_token.",
    });
  }
  return { revoked: true, stub: true };
});

/** Account + entitlement (stub). Real Stripe will drive status. */
app.get("/v1/me", async (req, reply) => {
  const token = bearerToken(req.headers.authorization);
  const rec = store.getToken(token);
  if (!rec) {
    return reply.code(401).send({
      error: "unauthorized",
      message: "Bearer device_token required. POST /v1/auth/device first.",
    });
  }
  const entitlement = store.entitlementForEmail(rec.email);
  return {
    account: {
      email: rec.email,
      device_expires_at: rec.expires_at,
    },
    entitlement,
    product: {
      free_tier: false,
      trial_requires_card: true,
      trial_days: 7,
      price_aud_mo: 29,
    },
    stub: true,
    stripe_live: false,
  };
});

/**
 * Checkout session stub. Never returns a live Stripe URL.
 * Contract for when Stripe is wired: 7-day trial + card upfront + AUD.
 */
app.post<{
  Body: { email?: string; success_url?: string; cancel_url?: string };
}>("/v1/billing/checkout-session", async (req) => {
  const email = isEmail(req.body?.email) ? req.body!.email!.trim().toLowerCase() : null;
  return {
    live: false,
    stripe_live: false,
    mode: "subscription",
    currency: "aud",
    price_aud_mo: 29,
    trial_period_days: 7,
    payment_method_collection: "always",
    requires: ["account", "card"],
    free_tier: false,
    email,
    success_url: req.body?.success_url ?? null,
    cancel_url: req.body?.cancel_url ?? null,
    checkout_url: null,
    message:
      "Stripe Checkout is not live. Start waitlist via POST /v1/billing/waitlist. Human blocker: Jeremy Stripe account + Checkout (trial + card upfront) + Customer Portal.",
    stub: true,
  };
});

/** Trial waitlist until Stripe Checkout is live. */
app.post<{
  Body: { email?: string; source?: string };
}>("/v1/billing/waitlist", async (req, reply) => {
  if (!isEmail(req.body?.email)) {
    return reply.code(400).send({
      error: "invalid_email",
      message: "Valid email required.",
    });
  }
  const entry = store.addWaitlist(
    req.body!.email!,
    typeof req.body?.source === "string" ? req.body.source : "api"
  );
  return {
    ok: true,
    waitlisted: true,
    email: entry.email,
    created_at: entry.created_at,
    next:
      "When Stripe is live you will get Checkout (7-day trial, card required). No free tier.",
    stub: true,
    stripe_live: false,
  };
});

app.get("/v1/billing/waitlist", async () => ({
  count: store.waitlist.length,
  stub: true,
  note: "In-memory only; resets on process exit.",
}));

app.post<{
  Body: {
    instincts?: Array<Record<string, unknown> & { id: string; updated_at?: string }>;
    skills?: Array<Record<string, unknown> & { id: string; updated_at?: string }>;
  };
}>("/v1/vault/sync", async (req, reply) => {
  const token = bearerToken(req.headers.authorization);
  if (!store.hasToken(token)) {
    return reply.code(401).send({
      error: "unauthorized",
      message: "Bearer device_token required. POST /v1/auth/device first.",
    });
  }

  const result = store.syncVault({
    instincts: (req.body?.instincts ?? []) as never,
    skills: (req.body?.skills ?? []) as never,
  });

  return {
    accepted: result.accepted,
    conflicts: result.conflicts,
    counts: {
      instincts: store.instincts.size,
      skills: store.skills.size,
    },
  };
});

app.post<{
  Body: Record<string, unknown>;
}>("/v1/scorecards", async (req, reply) => {
  const token = bearerToken(req.headers.authorization);
  if (!store.hasToken(token)) {
    return reply.code(401).send({
      error: "unauthorized",
      message: "Bearer device_token required. POST /v1/auth/device first.",
    });
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
    `InstinctGate Pro API stub on http://${HOST}:${PORT} (NOT production, no Stripe)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import type { FastifyInstance } from "fastify";
import type Stripe from "stripe";
import { store } from "./store.js";

const FALLBACK_PORTAL_RETURN_URL =
  "https://github.com/admin-TSK/InstinctGate?portal=return";

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function urlOrFallback(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
    return value.trim();
  }
  return fallback;
}

export function registerPortalRoutes(
  app: FastifyInstance,
  deps: {
    stripe: Stripe | null;
    stripeSecretKey: string;
  }
) {
  const { stripe, stripeSecretKey } = deps;

  app.post<{
    Body: { email?: string; return_url?: string; customer_id?: string };
  }>("/v1/billing/portal-session", async (req, reply) => {
    const email = isEmail(req.body?.email) ? req.body!.email!.trim().toLowerCase() : null;
    const return_url = urlOrFallback(req.body?.return_url, FALLBACK_PORTAL_RETURN_URL);
    const customer_id =
      typeof req.body?.customer_id === "string" && req.body.customer_id.trim()
        ? req.body.customer_id.trim()
        : null;

    if (!stripeSecretKey || !stripe) {
      return {
        live: false,
        stripe_live: false,
        portal_url: null,
        email,
        return_url: req.body?.return_url ?? null,
        message:
          "Customer Portal is not live. Set STRIPE_SECRET_KEY (and claim sandbox) to enable billing.stripe.com portal sessions.",
        stub: true,
      };
    }

    try {
      let resolvedCustomerId = customer_id;
      if (!resolvedCustomerId && email) {
        const listed = await stripe.customers.list({ email, limit: 1 });
        resolvedCustomerId = listed.data[0]?.id ?? null;
        if (resolvedCustomerId) {
          store.customersById.set(resolvedCustomerId, email);
        }
      }
      if (!resolvedCustomerId && email) {
        const ent = store.entitlementForEmail(email, true);
        resolvedCustomerId = ent.stripe_customer_id;
      }

      if (!resolvedCustomerId) {
        return reply.code(404).send({
          error: "customer_not_found",
          message:
            "No Stripe customer for this email yet. Complete Checkout (7-day trial, card required) first.",
          live: false,
          portal_url: null,
          email,
        });
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: resolvedCustomerId,
        return_url,
      });

      return {
        live: true,
        stripe_live: true,
        portal_url: portal.url,
        customer_id: resolvedCustomerId,
        email,
        return_url,
        stub: false,
      };
    } catch (err) {
      req.log.error({ err }, "stripe billingPortal.sessions.create failed");
      return reply.code(502).send({
        error: "stripe_portal_failed",
        message: "Failed to create Stripe Customer Portal session.",
        live: false,
        portal_url: null,
      });
    }
  });
}

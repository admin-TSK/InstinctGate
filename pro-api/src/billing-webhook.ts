import type { FastifyInstance } from "fastify";
import type Stripe from "stripe";
import type { EntitlementStatus } from "./store.js";
import { store } from "./store.js";

function mapSubscriptionStatus(status: string | null | undefined): EntitlementStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "canceled":
      return "cancelled";
    case "unpaid":
    case "past_due":
    case "incomplete_expired":
      return "unpaid";
    default:
      return "none";
  }
}

function trialEndsAtFromUnix(trialEnd: number | null | undefined): string | null {
  if (!trialEnd || typeof trialEnd !== "number") return null;
  return new Date(trialEnd * 1000).toISOString();
}

export function registerWebhookRoutes(
  app: FastifyInstance,
  deps: {
    stripe: Stripe | null;
    stripeConfigured: boolean;
    webhookConfigured: boolean;
    webhookSecret: string;
  }
) {
  const { stripe, stripeConfigured, webhookConfigured, webhookSecret } = deps;

  function applySubscriptionObject(sub: Stripe.Subscription) {
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
    const email =
      (customerId ? store.customersById.get(customerId) ?? null : null) ??
      (typeof sub.metadata?.email === "string" ? sub.metadata.email : null);
    return store.applyEntitlement({
      email,
      customer_id: customerId,
      subscription_id: sub.id,
      status: mapSubscriptionStatus(sub.status),
      trial_ends_at: trialEndsAtFromUnix(sub.trial_end),
      seats: sub.status === "trialing" || sub.status === "active" ? 1 : 0,
      stripe_live: stripeConfigured,
    });
  }

  async function handleStripeEvent(
    event: Stripe.Event | { id?: string; type: string; data?: { object?: Record<string, unknown> } }
  ) {
    const eventId =
      typeof event.id === "string" && event.id
        ? event.id
        : `stub_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const fresh = store.rememberWebhook(eventId, event.type);
    if (!fresh) {
      return { ok: true, duplicate: true, event_id: eventId, type: event.type };
    }

    const obj = (event.data?.object ?? {}) as Record<string, unknown>;
    let entitlement = null;

    if (event.type.startsWith("customer.subscription.")) {
      entitlement = applySubscriptionObject(obj as unknown as Stripe.Subscription);
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const customerId =
        typeof obj.customer === "string"
          ? obj.customer
          : (obj.customer as { id?: string } | null)?.id ?? null;
      const subField = obj.subscription;
      const subscriptionId =
        typeof subField === "string"
          ? subField
          : (subField as { id?: string } | null)?.id ?? null;
      const email =
        typeof obj.customer_email === "string"
          ? obj.customer_email
          : customerId
            ? store.customersById.get(customerId) ?? null
            : null;
      const status: EntitlementStatus =
        event.type === "invoice.paid" ? "active" : "unpaid";
      entitlement = store.applyEntitlement({
        email,
        customer_id: customerId,
        subscription_id: subscriptionId,
        status,
        seats: status === "active" ? 1 : 0,
        stripe_live: stripeConfigured,
      });
    } else if (event.type === "checkout.session.completed") {
      const email =
        typeof obj.customer_email === "string"
          ? obj.customer_email
          : typeof obj.customer_details === "object" &&
              obj.customer_details &&
              typeof (obj.customer_details as { email?: string }).email === "string"
            ? (obj.customer_details as { email: string }).email
            : null;
      const customerId =
        typeof obj.customer === "string"
          ? obj.customer
          : (obj.customer as { id?: string } | null)?.id ?? null;
      const subscriptionId =
        typeof obj.subscription === "string"
          ? obj.subscription
          : (obj.subscription as { id?: string } | null)?.id ?? null;
      entitlement = store.applyEntitlement({
        email,
        customer_id: customerId,
        subscription_id: subscriptionId,
        status: "trialing",
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        seats: 1,
        stripe_live: stripeConfigured,
      });
    } else if (event.type === "instinctgate.entitlement.stub") {
      entitlement = store.applyEntitlement({
        email: typeof obj.email === "string" ? obj.email : null,
        customer_id: typeof obj.customer_id === "string" ? obj.customer_id : null,
        subscription_id:
          typeof obj.subscription_id === "string" ? obj.subscription_id : null,
        status: mapSubscriptionStatus(
          typeof obj.status === "string" ? obj.status : "trialing"
        ),
        trial_ends_at:
          typeof obj.trial_ends_at === "string" ? obj.trial_ends_at : null,
        seats: 1,
        stripe_live: false,
      });
    }

    return {
      ok: true,
      duplicate: false,
      event_id: eventId,
      type: event.type,
      entitlement,
      stub: !webhookConfigured,
    };
  }

  app.register(async (scope) => {
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_req, body, done) => {
        done(null, body);
      }
    );

    scope.post("/v1/billing/webhook", async (req, reply) => {
      const raw = req.body as Buffer;
      const signature = req.headers["stripe-signature"];

      if (webhookConfigured && stripe) {
        if (typeof signature !== "string") {
          return reply.code(400).send({
            error: "missing_signature",
            message: "stripe-signature header required when webhook secret is set.",
          });
        }
        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
        } catch (err) {
          req.log.warn({ err }, "stripe webhook signature verification failed");
          return reply.code(400).send({
            error: "invalid_signature",
            message: "Webhook signature verification failed.",
          });
        }
        return handleStripeEvent(event);
      }

      let parsed: {
        id?: string;
        type: string;
        data?: { object?: Record<string, unknown> };
      };
      try {
        parsed = JSON.parse(raw.toString("utf8"));
      } catch {
        return reply.code(400).send({
          error: "invalid_json",
          message: "Webhook body must be JSON.",
        });
      }
      if (!parsed?.type || typeof parsed.type !== "string") {
        return reply.code(400).send({
          error: "invalid_event",
          message: "Event type required.",
        });
      }
      return handleStripeEvent(parsed);
    });
  });
}

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;

const liveSmoke = process.env.SMOKE_STRIPE_LIVE === "1";
const childEnv = { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" };
if (!liveSmoke) {
  delete childEnv.STRIPE_SECRET_KEY;
  delete childEnv.STRIPE_PRICE_ID;
  delete childEnv.STRIPE_WEBHOOK_SECRET;
}

const child = spawn("node", ["dist/index.js"], {
  env: childEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (buf) => process.stdout.write(buf));
child.stderr.on("data", (buf) => process.stderr.write(buf));

async function waitReady(ms = 8000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error("server did not become healthy in time");
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

try {
  await waitReady();

  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  assert(health.ok === true, "health.ok");
  assert(health.stripe === liveSmoke, `health.stripe expected ${liveSmoke}`);
  assert(health.pricing?.free_tier === false, "no free tier");
  assert(health.pricing?.card_required === true, "card required");
  assert(typeof health.webhook === "boolean", "webhook flag");

  const auth = await fetch(`${BASE}/v1/auth/device`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "smoke", email: "smoke@example.com" }),
  }).then((r) => r.json());
  assert(typeof auth.device_token === "string", "device_token");

  const me = await fetch(`${BASE}/v1/me`, {
    headers: { authorization: `Bearer ${auth.device_token}` },
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(me.status === 200, `me status ${me.status}`);

  const checkout = await fetch(`${BASE}/v1/billing/checkout-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "smoke@example.com" }),
  }).then((r) => r.json());
  assert(checkout.trial_period_days === 7, "trial 7 days");
  if (liveSmoke) {
    assert(checkout.live === true, "checkout must be live");
  } else {
    assert(checkout.live === false, "checkout must not be live");
    assert(checkout.checkout_url === null, "no fake checkout_url");
  }

  const portal = await fetch(`${BASE}/v1/billing/portal-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "smoke@example.com" }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  if (liveSmoke) {
    assert(
      portal.body.live === true || portal.body.error === "customer_not_found",
      "portal live or customer_not_found"
    );
  } else {
    assert(portal.status === 200, `portal status ${portal.status}`);
    assert(portal.body.live === false, "portal stub live false");
  }

  const hook = await fetch(`${BASE}/v1/billing/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "evt_smoke_entitlement_1",
      type: "instinctgate.entitlement.stub",
      data: {
        object: {
          email: "smoke@example.com",
          status: "trialing",
          customer_id: "cus_smoke",
          subscription_id: "sub_smoke",
          trial_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
        },
      },
    }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(hook.status === 200, `webhook status ${hook.status}`);
  assert(hook.body.entitlement?.status === "trialing", "webhook entitled trialing");

  console.log(liveSmoke ? "SMOKE OK (stripe live)" : "SMOKE OK");
  process.exitCode = 0;
} catch (err) {
  console.error("SMOKE FAIL", err);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  await sleep(200);
  if (!child.killed) child.kill("SIGKILL");
}

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;

const child = spawn("node", ["dist/index.js"], {
  env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" },
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
    } catch {
      // retry
    }
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
  assert(health.stripe === false, "health.stripe must be false");
  assert(health.pricing?.free_tier === false, "no free tier");
  assert(health.pricing?.card_required === true, "card required");

  const auth = await fetch(`${BASE}/v1/auth/device`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "smoke", email: "smoke@example.com" }),
  }).then((r) => r.json());
  assert(typeof auth.device_token === "string", "device_token");
  assert(auth.device_token.startsWith("dev_"), "stub token prefix");

  const me = await fetch(`${BASE}/v1/me`, {
    headers: { authorization: `Bearer ${auth.device_token}` },
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(me.status === 200, `me status ${me.status}`);
  assert(me.body.product?.free_tier === false, "me free_tier false");
  assert(me.body.stripe_live === false, "me stripe_live false");

  const checkout = await fetch(`${BASE}/v1/billing/checkout-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "smoke@example.com" }),
  }).then((r) => r.json());
  assert(checkout.live === false, "checkout must not be live");
  assert(checkout.checkout_url === null, "no fake checkout_url");
  assert(checkout.trial_period_days === 7, "trial 7 days");
  assert(checkout.requires?.includes("card"), "card required");

  const wait = await fetch(`${BASE}/v1/billing/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "smoke@example.com", source: "smoke" }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(wait.status === 200, `waitlist status ${wait.status}`);
  assert(wait.body.waitlisted === true, "waitlisted");

  const waitCount = await fetch(`${BASE}/v1/billing/waitlist`).then((r) =>
    r.json()
  );
  assert(waitCount.count >= 1, "waitlist count");

  const sync = await fetch(`${BASE}/v1/vault/sync`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${auth.device_token}`,
    },
    body: JSON.stringify({
      instincts: [
        {
          id: "ins_smoke_1",
          updated_at: new Date().toISOString(),
          title: "Prefer local vault first",
        },
      ],
      skills: [],
    }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(sync.status === 200, `sync status ${sync.status}`);
  assert(sync.body.accepted?.includes("ins_smoke_1"), "instinct accepted");

  const sc = await fetch(`${BASE}/v1/scorecards`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${auth.device_token}`,
    },
    body: JSON.stringify({
      session: "smoke",
      band: "green",
      checks: { plan: true, tests: true },
    }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(sc.status === 200, `scorecards status ${sc.status}`);
  assert(sc.body.scorecard?.id, "scorecard id");

  const unauth = await fetch(`${BASE}/v1/vault/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert(unauth.status === 401, "unauth should 401");

  const revoked = await fetch(`${BASE}/v1/auth/revoke`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${auth.device_token}`,
    },
    body: "{}",
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert(revoked.status === 200, "revoke ok");
  assert(revoked.body.revoked === true, "revoked");

  console.log("SMOKE OK");
  process.exitCode = 0;
} catch (err) {
  console.error("SMOKE FAIL", err);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  await sleep(200);
  if (!child.killed) child.kill("SIGKILL");
}

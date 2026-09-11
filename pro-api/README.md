# InstinctGate Pro API

Minimal Fastify TypeScript service matching the sketches in `../PRO.md`.

Tokens and waitlist live in memory and vanish when the process exits. Stripe routes activate from process env only (do not commit keys).

## Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | none | Liveness; `stripe` / `webhook` flags; pricing lock echoed |
| POST | `/v1/auth/device` | none | Stub `{ device_token, expires_at }` |
| POST | `/v1/auth/revoke` | Bearer or body | Revoke device token |
| GET | `/v1/me` | Bearer | Account + entitlement |
| POST | `/v1/billing/checkout-session` | none | Stub `live: false` without keys; live Session when keys set |
| POST | `/v1/billing/portal-session` | none | Customer Portal URL when secret key + customer exist |
| POST | `/v1/billing/webhook` | Stripe signature when secret set | Entitlement updates; stub JSON ok without secret |
| POST | `/v1/billing/waitlist` | none | Collect trial waitlist email (fallback) |
| GET | `/v1/billing/waitlist` | none | In-memory count |
| POST | `/v1/vault/sync` | Bearer | Accept `{ instincts[], skills[] }` → `{ accepted[], conflicts[] }` |
| POST | `/v1/scorecards` | Bearer | Push one scorecard |

## Pricing lock

- No free tier
- 7-day trial; account + card required (`payment_method_collection: always`)
- Draft ~A$29 AUD/mo per seat
- Live Checkout: `mode: subscription`, `subscription_data.trial_period_days: 7`, omit `payment_method_types`

## Env

| Var | Purpose |
|-----|---------|
| `STRIPE_SECRET_KEY` | Enables Checkout Sessions + Portal |
| `STRIPE_PRICE_ID` | Required with secret for Checkout |
| `STRIPE_WEBHOOK_SECRET` | Verifies `POST /v1/billing/webhook` signatures |
| `PORT` / `HOST` | Listen bind (default `8787` / `0.0.0.0`) |

## Run locally

```bash
cd pro-api
npm install
npm run build
# optional: set STRIPE_* from outside the repo
npm start
```

Smoke (stub path by default; `SMOKE_STRIPE_LIVE=1` keeps env keys):

```bash
npm run smoke
```

### Quick curl

```bash
curl -s localhost:8787/health | jq

TOKEN=$(curl -s -X POST localhost:8787/v1/auth/device \
  -H 'content-type: application/json' \
  -d '{"code":"dev","email":"dev@example.com"}' | jq -r .device_token)

curl -s localhost:8787/v1/me -H "authorization: Bearer $TOKEN" | jq

curl -s -X POST localhost:8787/v1/billing/checkout-session \
  -H 'content-type: application/json' \
  -d '{"email":"dev@example.com"}' | jq

curl -s -X POST localhost:8787/v1/billing/portal-session \
  -H 'content-type: application/json' \
  -d '{"email":"dev@example.com"}' | jq

curl -s -X POST localhost:8787/v1/billing/webhook \
  -H 'content-type: application/json' \
  -d '{"id":"evt_dev_1","type":"instinctgate.entitlement.stub","data":{"object":{"email":"dev@example.com","status":"trialing"}}}' | jq
```

## Explicit non-goals (still stub)

- No SQLite persistence (in-memory only)
- No teams / seats
- No production auth (anyone can mint a stub token)

When real billing ships fully, keep paid-subscription-only; local vault remains a cache for entitled seats.

# InstinctGate Pro API

Minimal Fastify TypeScript service matching the sketches in `../PRO.md`.

Tokens and waitlist live in memory and vanish when the process exits. Stripe Checkout Sessions are created when `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` are present in the process environment (do not commit keys; keep them outside the repo).

## Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | none | Liveness; `stripe: true` when keys set; pricing lock echoed |
| POST | `/v1/auth/device` | none | Stub `{ device_token, expires_at }` |
| POST | `/v1/auth/revoke` | Bearer or body | Revoke device token |
| GET | `/v1/me` | Bearer | Account + entitlement stub |
| POST | `/v1/billing/checkout-session` | none | Stub `live: false` / `checkout_url: null` without keys; live Session + `checkout_url` when keys set |
| POST | `/v1/billing/waitlist` | none | Collect trial waitlist email |
| GET | `/v1/billing/waitlist` | none | In-memory count |
| POST | `/v1/vault/sync` | Bearer | Accept `{ instincts[], skills[] }` → `{ accepted[], conflicts[] }` |
| POST | `/v1/scorecards` | Bearer | Push one scorecard |

## Pricing lock

- No free tier
- 7-day trial; account + card required (`payment_method_collection: always`)
- Draft ~A$29 AUD/mo per seat
- Live Checkout: `mode: subscription`, `subscription_data.trial_period_days: 7`, omit `payment_method_types`

## Run locally

```bash
cd pro-api
npm install
npm run build
# optional: set STRIPE_SECRET_KEY + STRIPE_PRICE_ID from outside the repo
npm start
# listens on http://0.0.0.0:8787 (override with PORT / HOST)
```

Dev watch:

```bash
npm run dev
```

Smoke (stub path by default; `SMOKE_STRIPE_LIVE=1` keeps env keys for a live Checkout assert):

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

curl -s -X POST localhost:8787/v1/billing/waitlist \
  -H 'content-type: application/json' \
  -d '{"email":"dev@example.com","source":"curl"}' | jq
```

## Explicit non-goals (still stub)

- No Customer Portal / webhooks yet
- No SQLite persistence (in-memory only)
- No teams / seats
- No production auth (anyone can mint a stub token)

When real billing ships fully, keep paid-subscription-only; local vault remains a cache for entitled seats.

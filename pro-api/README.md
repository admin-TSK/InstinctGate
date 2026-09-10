# InstinctGate Pro API (stub)

Minimal Fastify TypeScript service matching the sketches in `../PRO.md`.

**This is NOT production.** There is no Stripe, no durable database, no magic-link email, and no real billing. Tokens and waitlist live in memory and vanish when the process exits.

## Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | none | Liveness; `stripe: false`; pricing lock echoed |
| POST | `/v1/auth/device` | none | Stub `{ device_token, expires_at }` |
| POST | `/v1/auth/revoke` | Bearer or body | Revoke device token |
| GET | `/v1/me` | Bearer | Account + entitlement stub |
| POST | `/v1/billing/checkout-session` | none | **Always** `live: false`, `checkout_url: null` (no fake Checkout) |
| POST | `/v1/billing/waitlist` | none | Collect trial waitlist email |
| GET | `/v1/billing/waitlist` | none | In-memory count |
| POST | `/v1/vault/sync` | Bearer | Accept `{ instincts[], skills[] }` → `{ accepted[], conflicts[] }` |
| POST | `/v1/scorecards` | Bearer | Push one scorecard |

## Pricing lock (stub echoes this)

- No free tier
- 7-day trial; account + card required when Stripe is live
- Draft ~A$29 AUD/mo per seat

## Run locally

```bash
cd pro-api
npm install
npm run build
npm start
# listens on http://0.0.0.0:8787 (override with PORT / HOST)
```

Dev watch:

```bash
npm run dev
```

Smoke:

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

## Explicit non-goals (this stub)

- No Stripe Checkout / Customer Portal / webhooks
- No SQLite persistence (in-memory only)
- No teams / seats
- No production auth (anyone can mint a stub token)

When real billing ships, keep paid-subscription-only; local vault remains a cache for entitled seats.

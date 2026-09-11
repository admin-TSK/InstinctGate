# InstinctGate - human blockers

Only Jeremy can clear these. Automation ships product stubs around them.

| Blocker | Why | Status / what to do |
|---------|-----|---------------------|
| **GitHub** | Repo ownership | **DONE** — https://github.com/admin-TSK/InstinctGate (public, MIT). |
| **Stripe TEST checkout** | Sandbox billing path | **DONE** — TEST product/price + Payment Link created. Price `price_1UEFXZGynPFSwIN9TddEF43P`; Payment Link `https://buy.stripe.com/test_8x2eVdexg9KWcxV8df1wY00`. Pro API creates Checkout Sessions when `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` are set. |
| **Stripe claim sandbox** | Legal / payout identity | Claim the Stripe TEST sandbox (AUD). Enable Customer Portal in Dashboard. Create webhook endpoint → `POST /v1/billing/webhook` with `STRIPE_WEBHOOK_SECRET`. Move to live keys only after claim. |
| **Vercel** | Hosting auth / deploy | Authenticate Vercel MCP (needsAuth) and deploy `web/` (+ wire Pro API env: Stripe keys, price id, webhook secret). |
| **npm** | Package name on registry | Publish `instinctgate` from `cli/` so `npx instinctgate@latest setup` works for trial/paid customers. |

## Locked product rules (do not reopen in blockers)

- No free tier. Paid subscription only.
- 7-day trial requires account + credit card.
- One-command setup after signup: `npx instinctgate setup`.

## Stub / live billing contract

- Landing CTA → Stripe TEST Payment Link (see `web/lib/billing.ts`). `/trial` prefers Checkout; waitlist is fallback only.
- Pro API: `POST /v1/billing/checkout-session` returns `live: false`, `checkout_url: null` when Stripe env keys are missing.
- Pro API: when `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` are set, same route creates a real Stripe Checkout Session (`mode: subscription`, 7-day trial, `payment_method_collection: always`) and returns `live: true` + `checkout_url`.
- Pro API: `POST /v1/billing/portal-session` → Customer Portal URL when secret key + customer exist; stub otherwise.
- Pro API: `POST /v1/billing/webhook` verifies signature when `STRIPE_WEBHOOK_SECRET` is set; stub JSON events entitle locally for smoke.
- Pro API: `POST /v1/billing/waitlist`, `GET /v1/me`.
- `GET /health` reports `stripe` / `webhook` when keys are present.

When production Stripe is live, keep card-required trial; swap Payment Link + env to live keys.

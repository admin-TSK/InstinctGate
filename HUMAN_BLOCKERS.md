# InstinctGate - human blockers

Only Jeremy can clear these. Automation ships product stubs around them.

| Blocker | Why | What to do |
|---------|-----|------------|
| **Stripe** | Legal / payout identity | Create Stripe account (AUD). Product: subscription ~A$29/mo, `trial_period_days: 7`, payment method collected upfront, Customer Portal, webhooks for entitlement. |
| **GitHub** | Repo ownership | Public repo for InstinctGate (MIT transparency). Not CompNow org naming. |
| **npm** | Package name on registry | Publish `instinctgate` from `cli/` so `npx instinctgate@latest setup` works for trial/paid customers. |

## Locked product rules (do not reopen in blockers)

- No free tier. Paid subscription only.
- 7-day trial requires account + credit card.
- One-command setup after signup: `npx instinctgate setup`.

## Stub already in tree

- Landing CTA → `/trial` waitlist (no fake Checkout URL).
- Pro API: `POST /v1/billing/checkout-session` returns `live: false`, `checkout_url: null`.
- Pro API: `POST /v1/billing/waitlist`, `GET /v1/me`.

When Stripe is live, replace waitlist CTA with real Checkout; keep card-required trial.

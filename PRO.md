# InstinctGate - product and billing

**Status:** Product/billing lock 2026-09-09 (AEST). Local API stub in `pro-api/` (Fastify) includes billing waitlist + checkout-session stub (`live: false`). No real Stripe Checkout yet. Document requirements here; implement Stripe when Jeremy clears the Stripe blocker.

## Product lock

InstinctGate is a **paid cloud SaaS** with a **7-day trial**. There is **no free tier**.

| | InstinctGate (cloud product) |
|---|------------------------------|
| Access | Paid subscription; 7-day trial with account + card |
| Vault | Hosted vault sync (+ local cache under `.instinctgate/`) |
| Scoreboard | Web scoreboard + history |
| Devices | Multi-device recall |
| Seats | Per-seat billing; team seats later |
| API | Cloud product (device-token API) |
| Price | **Draft: ~A$29 AUD/mo** per seat |
| Source | MIT in repo for transparency only; not a free product promise |

Kill the old story: "OSS forever free local + optional Pro." Landing and PLAN must not promise free forever.

## Trial and checkout (requirements; not implemented yet)

When Stripe is wired:

1. **CTA:** Start 7-day trial.
2. **Account required** before trial starts (email/signup).
3. **Credit card required upfront** via Stripe Checkout (or Payment Element) collecting a payment method.
4. Create a Stripe **subscription** with `trial_period_days: 7` and payment method attached so the first invoice charges automatically when the trial ends (unless cancelled).
5. **Customer Portal** for cancel, payment method update, invoices.
6. Webhooks: `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed` → entitle / disable cloud sync and device tokens.
7. Currency: **AUD**. Draft list price **A$29/mo** per seat (confirm before launch).
8. Do **not** ship a fake live checkout. Until Stripe is live, landing may use a "Start 7-day trial" CTA that explains card-required trial and routes to waitlist or placeholder; never claim "free forever."

### Entitlement rules (draft)

- Trial seat: full product for 7 days; card on file; account active.
- Paid seat: subscription `active` / `trialing` → device tokens and sync entitled.
- Cancelled or unpaid → revoke sync entitlement; local cache may remain on disk but cloud features stop.

## Architecture (target)

```
[ Cursor / Claude agent ]
          |
          v
[ instinctgate CLI ] ---- local vault cache (after signup / entitlement)
          |
          |  cloud product (entitled seats)
          v
[ Cloud API ]  Authorization: Bearer <device_token>
          |
          +-- sync instincts / skills
          +-- push scorecards
          +-- pull recall for multi-device
          |
          v
[ Web dashboard + Stripe Checkout / Customer Portal ]
```

- CLI stores a **device token** after `instinctgate login` (not in v0.1).
- Local vault is a cache / offline workspace for entitled users; the **product** is cloud SaaS.
- API remains a **cloud product** surface, not an optional freemium add-on.

## API surface sketch

Base URL (placeholder): `https://api.instinctgate.dev/v1`

### Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/device` | Exchange magic-link or CLI code → `{ device_token, expires_at }` (requires entitled account) |
| POST | `/auth/revoke` | Revoke device token |
| GET | `/me` | Account, plan, trial end, seat count, entitlement |

All product routes: `Authorization: Bearer <device_token>`.

### Sync instincts / skills

| Method | Path | Notes |
|--------|------|-------|
| GET | `/vault/instincts?since=<iso>` | Incremental pull |
| PUT | `/vault/instincts/:id` | Upsert one instinct (Markdown + frontmatter JSON) |
| GET | `/vault/skills?since=<iso>` | Incremental pull |
| PUT | `/vault/skills/:id` | Upsert skill stub |
| POST | `/vault/sync` | Batch push `{ instincts[], skills[] }` → `{ accepted[], conflicts[] }` |

Conflict policy (draft): last-write-wins on `updated_at`, with conflict list returned for UI.

### Scorecards

| Method | Path | Notes |
|--------|------|-------|
| POST | `/scorecards` | Push one scorecard (`session`, checks, band, raw md) |
| GET | `/scorecards?limit=&cursor=` | Web scoreboard feed |
| GET | `/scorecards/summary` | Aggregates for dashboard (band histogram, streak) |

### Teams (later)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/teams` | Create team |
| POST | `/teams/:id/seats` | Invite seat |
| GET | `/teams/:id/vault/…` | Shared recall namespace |

## CLI commands (future, not v0.1)

```
instinctgate login
instinctgate logout
instinctgate sync          # push/pull vault
instinctgate score … --push
```

## Billing summary

- **No free tier.**
- Stripe Checkout + Customer Portal.
- 7-day trial; **account + card required** at checkout.
- Draft **A$29 AUD/mo** per seat.
- Webhook-driven entitlement for the cloud API.
- Real Stripe not in this repo yet; this file is the contract for when it is.

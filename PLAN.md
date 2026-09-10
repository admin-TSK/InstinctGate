# InstinctGate - PLAN

**Status:** LOCKED wedge + monetisation as of 2026-09-09 (AEST)  
**Brand:** InstinctGate (neutral). NOT CompNow. NOT AlertLedger. NOT Gumroad ZIP. NOT StackPilot / generic MCP picker.

### Build status (2026-09-10 AEST)

| Slice | Status | Path |
|-------|--------|------|
| v0.1 CLI (`setup` / capture / promote / score) | **Done** (smokes) | `cli/` |
| Landing site (Next.js App Router, Vercel-ready) | **Done** | `web/` |
| Trial waitlist (`/trial` + `/api/waitlist`) | **Done** | `web/app/trial`, `web/app/api/waitlist` |
| Pro API stub (auth, vault, scorecards, billing stub) | **Done** (in-memory; not Stripe) | `pro-api/` |
| Billing stub (`/v1/me`, checkout-session, waitlist, revoke) | **Done** (`live: false`) | `pro-api/` |
| Human blockers doc | **Done** | `HUMAN_BLOCKERS.md` |
| npm publish | **Human blocker** | - |
| Real Stripe Checkout (trial + card upfront) | **Human blocker** | - |
| GitHub public repo | **Human blocker** | - |

## Why ECC proves the category

[ECC](https://github.com/affaan-m/ecc) (agent harness performance: skills, instincts, memory, verify loops) shows demand for **durable agent improvement** beyond one-shot prompts. The category signal is clear: operators want agents that **learn from runs**, keep patterns as reusable assets, and **score verification** instead of vibes.

ECC is a **wide harness** (many agents, huge skill catalog, multi-tool install matrix). That proves appetite. It does not prove we should clone 68 agents / 286 skills.

**ECC seamlessness we keep:** one terminal command deploys the happy path. No clone-then-`install.sh` multi-step as the primary UX.

## Our wedge vs ECC

| | ECC | InstinctGate |
|---|-----|--------------|
| Scope | Full harness + catalog | Thin post-session loop |
| Core loop | Skills + instincts + memory + research-first | **Capture → promote → score** |
| Install | One-shot harness install | **`npx instinctgate setup`** after signup / trial |
| Catalog | Hundreds of skills | User-grown stubs only |
| Product | Open mega-system | **Paid SaaS** (MIT source in repo for transparency) |

**One-liner:** After each agent session, extract instincts (patterns with confidence), promote winners into skills, and score the run on a verification scoreboard. Cursor/Claude-compatible.

We are a **bolt-on**, not a replacement IDE or mega-harness. Agents stay Cursor / Claude Code; InstinctGate is the memory and scoreboard layer they write into.

## Primary install (P0)

Install is for **paying customers and trial users** (account + card already collected). Not a free-forever public default.

```bash
npx instinctgate setup
# once published:
npx instinctgate@latest setup
```

That single command must:

1. Init local `.instinctgate/` vault  
2. Write Cursor rule + Claude skill stubs into the project  
3. Expose the CLI via the package `bin` (`npx` / global install)  
4. Optionally run a smoke capture (default on)

Other subcommands remain; **setup is the product face after signup**.

## Monetisation (LOCKED - 2026-09-09)

**Product story:** paid subscription SaaS. **No free tier.** Kill freemium and "OSS forever free local + optional Pro."

| Rule | Detail |
|------|--------|
| Model | Paid subscription only |
| List price | **Draft ~A$29 AUD/mo** per seat (keep unless this PLAN changes) |
| Trial | **7 days** |
| Trial gate | **Account + credit card required** (Stripe subscription trial with payment method collected upfront) |
| Source | MIT source may stay in the repo for transparency; that is **not** a product free tier |
| Cloud | Hosted vault sync, web scoreboard, multi-device recall, team seats, device-token API |

See [PRO.md](./PRO.md) for product/billing and checkout requirements. `pro-api/` is a local stub. **Do not implement real Stripe in this tree yet** - document Checkout + trial + card-upfront clearly, then wire later.

### Architecture note

- Product access requires an InstinctGate account. Trial and paid seats both go through Stripe with a card on file.
- CLI talks to the cloud API with a **device token** (`Authorization: Bearer …`); local vault works offline once entitled.
- Landing and PLAN must **not** promise a free forever tier. MIT in the repo is transparency, not freemium.

### Math to ~A$50/day (paid seats only)

- Target net ≈ **A$50/day** ≈ **A$1,500/mo**.
- Draft list **A$29 AUD/mo**. After Stripe fees, use **~A$25 net/seat/mo** conservative.
- Steady state: **1,500 ÷ 25 ≈ 60 paying seats** (trial conversion into paid; math counts **paying seats only**, not trial accounts).
- Growth: **~2 new paid seats/day** gross, or **~1.7 retained seats/day** blended MRR accretion (honest SaaS view).
- First 30 days will undershoot. Funnel: content → landing → **Start 7-day trial** (card) → convert to paid. No free→Pro freemium funnel.

## Distribution

1. **Landing** - paid product + 7-day trial (card required). CTA: Start 7-day trial.  
2. **GitHub** - public repo, MIT for transparency; README does not lead with free forever.  
3. **npm** - package `instinctgate` (publish from `cli/`) for entitled customers / after signup.  
4. **Content** - one-command demos, scoreboard screenshots, Cursor rule paste. No CompNow / MSP angle.

## Human blockers (once each)

| Blocker | Why only Jeremy |
|---------|-----------------|
| **Stripe** account + Checkout (7-day trial, card upfront) + Customer Portal | Legal/payout identity |
| **GitHub org** + **npm publish** token | Ownership + package name on registry |

## Explicit exclusions

- Not CompNow / MSP / Intune.
- Not Gumroad ZIP kits.
- Not AlertLedger / trading.
- Not StackPilot / generic MCP picker (cancelled).
- Not a wholesale ECC clone.
- Not freemium / free forever local product tier.

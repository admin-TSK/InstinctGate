# InstinctGate

**After each agent session, extract instincts (patterns with confidence), promote winners into skills, and score the run on a verification scoreboard.** Cursor/Claude-compatible.

Thin wedge - not an ECC clone, not a 200-skill catalog. **Paid cloud product** with a **7-day trial** (account + card required). Draft about **A$29 AUD/mo** after trial. One command deploys the loop once you are signed up.

## Pricing (locked)

- **No free tier.** Subscription only.
- **7-day trial** requires account + credit card (Stripe trial with payment method upfront; not wired in this tree yet).
- **Draft ~A$29 AUD/mo** per seat.
- MIT licence on source is for transparency, not a free forever product promise.

See [PRO.md](./PRO.md) for billing/checkout requirements and [PLAN.md](./PLAN.md) for monetisation math on **paid seats only**.

## Install (trial / paid customers)

After signup and trial start (card on file):

```bash
npx instinctgate setup
```

Once published on npm:

```bash
npx instinctgate@latest setup
```

That single command:

- inits `.instinctgate/` (instincts, skills, scorecards)
- writes Cursor rule + Claude skill stubs
- uses the package `bin` so the CLI is available via `npx`
- runs a smoke capture so you see instincts immediately

## Local / from this repo

```bash
cd cli
npm install
npm run build
node dist/index.js setup
# or: npm test
```

Optional global link while developing: `npm link` then `instinctgate setup` anywhere.

## 60-second demo (after setup)

```bash
npx instinctgate list
npx instinctgate capture path/to/session-summary.md
npx instinctgate promote <instinct-id>
npx instinctgate score path/to/rubric.json
```

Sample fixtures live in `cli/fixtures/`.

## Cloud product

InstinctGate is SaaS: hosted vault sync, web scoreboard, multi-device recall, team seats, device-token API. Local vault is a cache for entitled users. Real Stripe Checkout is **not** implemented yet; requirements live in [PRO.md](./PRO.md). Stub API: `pro-api/`.

## Docs

- [PLAN.md](./PLAN.md) - wedge, monetisation, blockers  
- [SPEC.md](./SPEC.md) - v0.1 scope  
- [PRO.md](./PRO.md) - product / billing / API  
- [LANDING.md](./LANDING.md) - landing copy (implemented in `web/`)  
- [web/](./web/) - Next.js App Router landing (Vercel-ready)  
- [pro-api/](./pro-api/) - cloud API stub (local only; not Stripe)  

## License

MIT (source transparency; product remains paid SaaS with trial)

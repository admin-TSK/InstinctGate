# InstinctGate landing (web)

Next.js App Router site. Copy sourced from `../LANDING.md` (AU English).

## Routes

| Path | Purpose |
|------|---------|
| `/` | Marketing landing |
| `/trial` | Trial waitlist (until Stripe Checkout is live) |
| `/api/waitlist` | POST email → local `.data/waitlist.jsonl` (+ optional Pro API forward) |

Optional env: `INSTINCTGATE_API_URL` (e.g. `http://127.0.0.1:8787`) to forward waitlist to the Pro API stub.

## Local

```bash
npm install
npm run dev
```

## Build (Vercel-ready)

```bash
npm install
npm run build
npm start
```

Deploy the `web/` directory on Vercel. No env vars required for the static landing + waitlist stub.

Brand: InstinctGate (neutral). Not CompNow. Paid subscription only; no free tier.

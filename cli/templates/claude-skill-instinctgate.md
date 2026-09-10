---
name: instinctgate-session-close
description: Close an agent session by capturing InstinctGate instincts and scoring verification.
---

# InstinctGate session close

Use this skill at the end of a meaningful coding session.

## Steps

1. Draft `session-summary.md` with headings and bullets (Lessons, Gotchas, What we did).
2. `instinctgate capture session-summary.md`
3. `instinctgate list --kind instincts` and optionally `instinctgate promote <id>` for winners.
4. Write `rubric.json` with plan/tests/review/verify flags; `instinctgate score rubric.json`.

## Rules

- Offline heuristic capture is enough; do not require API keys for the default path.
- Keep the vault local under `.instinctgate/`.
- Do not install mega harness catalogs.

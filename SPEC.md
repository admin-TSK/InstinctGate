# InstinctGate — SPEC v0.1

**Scope fence:** v0.1 ONLY. Ship the thin loop. No catalog empire.  
**P0 product face:** one terminal command — `npx instinctgate setup`.

## Product

Local-first CLI that maintains a Markdown vault under `.instinctgate/`. After agent sessions, operators (or agents via stubs) **capture** instinct candidates, **promote** strong ones to skill stubs, and **score** the run.

## Primary install

```bash
npx instinctgate setup
npx instinctgate@latest setup
```

`setup` is the main entry. With no args, `npx instinctgate` also runs `setup`.

### `setup` behaviour

1. **Init vault** — `.instinctgate/{instincts,skills,scorecards}/` + vault README  
2. **Wire stubs** — write (unless present, or `--force`):
   - `.cursor/rules/instinctgate.mdc`
   - `.claude/skills/instinctgate-session-close/SKILL.md`
3. **CLI on path** — via npm package `bin` field when run through `npx` / global install (no separate install.sh)  
4. **Smoke** — copy packaged sample session into the vault and run `capture` (skip with `--skip-smoke`)

Flags: `--vault <path>`, `--force`, `--skip-smoke`.

## Other CLI commands

```
instinctgate init
instinctgate capture <session-summary.md> [--vault ...]
instinctgate list [--kind instincts|skills|all]
instinctgate promote <instinct-id-or-path>
instinctgate score <rubric.json>
```

### `capture`

Offline heuristic (no API key): parse headings/bullets → **1–5** instincts with YAML frontmatter (`id`, `title`, `confidence`, `source`, `created`, `status`).

### `promote`

Instinct → `.instinctgate/skills/<slug>/SKILL.md`; mark instinct `status: promoted`.

### `score`

Rubric JSON (`plan`, `tests`, `review`, `verify`) → `scorecards/sc-*.md` + stdout summary.

## Agent stubs

Shipped inside the npm package (`templates/`) and written by `setup`. Stubs tell the agent when to call capture/score. No skill catalog.

## Non-goals (v0.1)

- No 200 skills catalog / ECC mirror  
- No multi-harness install matrix  
- No GitHub App / hosted sync in OSS (Pro later)  
- No clone-then-install.sh as the happy path  
- No Stripe / Pro API implementation (document in PRO.md only)  

## Acceptance

- `npm test` in `cli/` passes (build + smoke including **`setup`**)  
- After `setup` in an empty project: vault, Cursor rule, Claude skill, and 1–5 instincts exist  
- No API keys required  

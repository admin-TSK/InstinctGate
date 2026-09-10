# Session: InstinctGate CLI scaffold

## What we did
- Built a thin TypeScript CLI with init, capture, list, promote, score
- Kept extraction offline so smoke tests need no API keys
- Avoided cloning a mega skill catalog

## Lessons
- Prefer a local Markdown vault over hosted memory for v0
- Always write a session summary before capture
- Never ship a 200-skill catalog in the MVP
- Fix failing smoke scripts before adding Pro features

## Gotchas
- Relative vault paths matter when cwd is not the project root

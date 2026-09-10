#!/usr/bin/env node
import { cmdCapture } from "./commands/capture.js";
import { cmdInit } from "./commands/init.js";
import { cmdList } from "./commands/list.js";
import { cmdPromote } from "./commands/promote.js";
import { cmdScore } from "./commands/score.js";
import { cmdSetup } from "./commands/setup.js";

function usage(): never {
  console.log(`InstinctGate — capture instincts, promote skills, score runs

Primary (one command):
  npx instinctgate setup
  npx instinctgate@latest setup

Also:
  instinctgate init [--vault <path>]
  instinctgate capture <session-summary.md> [--vault <path>]
  instinctgate list [--kind instincts|skills|all] [--vault <path>]
  instinctgate promote <instinct-id-or-path> [--vault <path>]
  instinctgate score <rubric.json> [--vault <path>]
  instinctgate setup [--vault <path>] [--force] [--skip-smoke]

No API keys required for heuristic capture (v0.1).
`);
  process.exit(1);
}

function takeFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}

function takeBool(args: string[], name: string): boolean {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}

function main(): void {
  const argv = process.argv.slice(2);
  // Default to setup when invoked with no args (npx instinctgate)
  if (argv.length === 0) {
    cmdSetup({});
    return;
  }
  if (argv[0] === "-h" || argv[0] === "--help") usage();
  const cmd = argv.shift()!;
  const vault = takeFlag(argv, "--vault") ?? takeFlag(argv, "--out");

  try {
    switch (cmd) {
      case "setup": {
        const force = takeBool(argv, "--force");
        const skipSmoke = takeBool(argv, "--skip-smoke");
        cmdSetup({ vault, force, skipSmoke });
        break;
      }
      case "init":
        cmdInit({ vault });
        break;
      case "capture": {
        const file = argv[0];
        if (!file) usage();
        cmdCapture(file, { vault });
        break;
      }
      case "list": {
        const kind = takeFlag(argv, "--kind") ?? "all";
        cmdList({ kind, vault });
        break;
      }
      case "promote": {
        const ref = argv[0];
        if (!ref) usage();
        cmdPromote(ref, { vault });
        break;
      }
      case "score": {
        const file = argv[0];
        if (!file) usage();
        cmdScore(file, { vault });
        break;
      }
      default:
        console.error(`Unknown command: ${cmd}`);
        usage();
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();

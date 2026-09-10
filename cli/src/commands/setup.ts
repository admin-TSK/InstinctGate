import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cmdCapture } from "./capture.js";
import { ensureVault, resolveVault } from "../lib/vault.js";

function packageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..");
}

function readTemplate(name: string): string {
  const p = path.join(packageRoot(), "templates", name);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing packaged template: ${p}`);
  }
  return fs.readFileSync(p, "utf8");
}

function writeFile(target: string, content: string, force: boolean): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target) && !force) {
    console.log(`  skip (exists): ${target}`);
    return;
  }
  fs.writeFileSync(target, content, "utf8");
  console.log(`  wrote: ${target}`);
}

export interface SetupOpts {
  vault?: string;
  cwd?: string;
  force?: boolean;
  skipSmoke?: boolean;
}

/**
 * One-command product face: vault + agent stubs + optional smoke capture.
 * Path registration is via the npm package `bin` when installed / run with npx.
 */
export function cmdSetup(opts: SetupOpts = {}): void {
  const cwd = opts.cwd ?? process.cwd();
  const vault = resolveVault(cwd, opts.vault);
  const force = Boolean(opts.force);

  console.log("InstinctGate setup");
  console.log(`  project: ${cwd}`);

  // 1) Vault
  ensureVault(vault);
  console.log(`InstinctGate vault ready: ${vault}`);

  // 2) Wire Cursor + Claude stubs
  console.log("Wiring agent stubs…");
  writeFile(
    path.join(cwd, ".cursor", "rules", "instinctgate.mdc"),
    readTemplate("cursor-rule-instinctgate.mdc"),
    force
  );
  writeFile(
    path.join(
      cwd,
      ".claude",
      "skills",
      "instinctgate-session-close",
      "SKILL.md"
    ),
    readTemplate("claude-skill-instinctgate.md"),
    force
  );

  writeFile(
    path.join(vault, "INTEGRATION.md"),
    `# Agent integration

CLI: \`npx instinctgate\` (package bin). Primary install:

\`\`\`bash
npx instinctgate@latest setup
\`\`\`

- Cursor rule: \`.cursor/rules/instinctgate.mdc\`
- Claude skill: \`.claude/skills/instinctgate-session-close/SKILL.md\`
`,
    force
  );

  // 3) Optional smoke capture
  if (!opts.skipSmoke) {
    const fixture = path.join(packageRoot(), "fixtures", "sample-session.md");
    if (fs.existsSync(fixture)) {
      console.log("Running smoke capture…");
      const smokeSummary = path.join(vault, "smoke-session.md");
      fs.copyFileSync(fixture, smokeSummary);
      cmdCapture(smokeSummary, { vault });
    } else {
      console.log("  skip smoke: packaged fixture missing");
    }
  }

  console.log(`
Setup complete.

Next:
  npx instinctgate list
  npx instinctgate capture <your-session-summary.md>
  npx instinctgate score <rubric.json>

InstinctGate is paid SaaS (~A$29 AUD/mo draft) with a 7-day trial (account + card). See PRO.md.
`);
}

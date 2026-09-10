import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const bin = path.join(root, "dist", "index.js");
const fixtureRubric = path.join(root, "fixtures", "sample-rubric.json");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ig-smoke-"));

function run(args) {
  const r = spawnSync(process.execPath, [bin, ...args], {
    cwd: tmp,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
    throw new Error(`Command failed: instinctgate ${args.join(" ")}`);
  }
  return r.stdout;
}

console.log("smoke cwd:", tmp);

// P0: one-command setup
const setupOut = run(["setup"]);
console.log(setupOut.trim().split("\n").slice(0, 12).join("\n"), "\n…");

const vault = path.join(tmp, ".instinctgate");
if (!fs.existsSync(vault)) throw new Error("setup did not create vault");
const cursorRule = path.join(tmp, ".cursor", "rules", "instinctgate.mdc");
const claudeSkill = path.join(
  tmp,
  ".claude",
  "skills",
  "instinctgate-session-close",
  "SKILL.md"
);
if (!fs.existsSync(cursorRule)) throw new Error("missing Cursor rule");
if (!fs.existsSync(claudeSkill)) throw new Error("missing Claude skill");

const instincts = fs
  .readdirSync(path.join(vault, "instincts"))
  .filter((f) => f.endsWith(".md"));
if (instincts.length < 1 || instincts.length > 5) {
  throw new Error(`Expected 1–5 instincts from setup smoke, got ${instincts.length}`);
}

const listOut = run(["list", "--kind", "instincts"]);
console.log(listOut.trim());

const firstId = instincts[0].match(/^ig-\d{8}-\d{3}/)?.[0];
if (!firstId) throw new Error(`Could not parse instinct id from ${instincts[0]}`);
run(["promote", firstId]);
run(["score", fixtureRubric]);

const skills = fs.readdirSync(path.join(vault, "skills"));
const cards = fs
  .readdirSync(path.join(vault, "scorecards"))
  .filter((f) => f.endsWith(".md"));
if (skills.length < 1) throw new Error("promote did not create a skill");
if (cards.length < 1) throw new Error("score did not create a scorecard");

console.log("SMOKE OK", {
  instincts: instincts.length,
  skills: skills.length,
  scorecards: cards.length,
  cursorRule: true,
  claudeSkill: true,
});

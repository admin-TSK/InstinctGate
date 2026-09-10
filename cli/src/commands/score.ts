import fs from "node:fs";
import path from "node:path";
import { renderScorecard, scoreRubric, type Rubric } from "../lib/score.js";
import { ensureVault, resolveVault } from "../lib/vault.js";

export function cmdScore(rubricFile: string, opts: { vault?: string }): void {
  const abs = path.resolve(rubricFile);
  if (!fs.existsSync(abs)) throw new Error(`Rubric not found: ${abs}`);
  let rubric: Rubric;
  try {
    rubric = JSON.parse(fs.readFileSync(abs, "utf8")) as Rubric;
  } catch {
    throw new Error(`Invalid JSON rubric: ${abs}`);
  }
  const vault = resolveVault(process.cwd(), opts.vault);
  ensureVault(vault);
  const when = new Date();
  const result = scoreRubric(rubric);
  const stamp = when
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z")
    .replace("T", "-");
  const out = path.join(vault, "scorecards", `sc-${stamp}.md`);
  fs.writeFileSync(out, renderScorecard(result, when), "utf8");
  console.log(
    `Score ${result.points}/${result.max} (${(result.ratio * 100).toFixed(0)}%) band ${result.band} — ${result.session}`
  );
  console.log(`Wrote ${out}`);
}

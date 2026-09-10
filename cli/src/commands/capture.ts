import fs from "node:fs";
import path from "node:path";
import { extractInstincts, instinctPath } from "../lib/capture.js";
import { ensureVault, resolveVault, stringifyFrontmatter } from "../lib/vault.js";

export function cmdCapture(
  summaryFile: string,
  opts: { vault?: string }
): void {
  const abs = path.resolve(summaryFile);
  if (!fs.existsSync(abs)) {
    throw new Error(`Session summary not found: ${abs}`);
  }
  const vault = resolveVault(process.cwd(), opts.vault);
  ensureVault(vault);
  const md = fs.readFileSync(abs, "utf8");
  const instincts = extractInstincts(md, path.relative(process.cwd(), abs) || abs);
  const written: string[] = [];
  for (const inst of instincts) {
    const out = instinctPath(vault, inst.id, inst.title);
    fs.writeFileSync(out, stringifyFrontmatter(inst.frontmatter, inst.body), "utf8");
    written.push(out);
  }
  console.log(`Captured ${written.length} instinct(s):`);
  for (const w of written) {
    console.log(`  - ${w}`);
  }
}

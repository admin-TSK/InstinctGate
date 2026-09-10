import fs from "node:fs";
import path from "node:path";
import {
  ensureVault,
  parseFrontmatter,
  resolveVault,
  slugify,
  stringifyFrontmatter,
} from "../lib/vault.js";

function findInstinct(vault: string, ref: string): string {
  if (fs.existsSync(ref) && ref.endsWith(".md")) return path.resolve(ref);
  const abs = path.resolve(ref);
  if (fs.existsSync(abs)) return abs;
  const dir = path.join(vault, "instincts");
  if (!fs.existsSync(dir)) throw new Error("No instincts directory — run init/capture first.");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const hit =
    files.find((f) => f.startsWith(ref) || f.includes(ref)) ||
    files.find((f) => {
      const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
      return String(data.id) === ref;
    });
  if (!hit) throw new Error(`Instinct not found: ${ref}`);
  return path.join(dir, hit);
}

export function cmdPromote(ref: string, opts: { vault?: string }): void {
  const vault = resolveVault(process.cwd(), opts.vault);
  ensureVault(vault);
  const instinctFile = findInstinct(vault, ref);
  const raw = fs.readFileSync(instinctFile, "utf8");
  const { data, body } = parseFrontmatter(raw);
  const title = String(data.title ?? "untitled");
  const slug = slugify(title);
  const skillDir = path.join(vault, "skills", slug);
  fs.mkdirSync(skillDir, { recursive: true });
  const skillPath = path.join(skillDir, "SKILL.md");
  const skillFm = {
    id: `skill-${slug}`,
    from_instinct: String(data.id ?? path.basename(instinctFile)),
    title,
  };
  const whenMatch = body.match(/## When\s*\n([\s\S]*?)(?=\n## |\n*$)/);
  const patternMatch = body.match(/## Pattern\s*\n([\s\S]*?)(?=\n## |\n*$)/);
  const caveatsMatch = body.match(/## Caveats\s*\n([\s\S]*?)(?=\n## |\n*$)/);
  const skillBody = `# Skill: ${title}

## When
${(whenMatch?.[1] ?? "When this pattern recurs.").trim()}

## Steps
1. Recall the pattern: ${(patternMatch?.[1] ?? title).trim().split("\n")[0]}
2. Apply with the smallest change that proves it.
3. Note outcome for the next scorecard.

## Verify
${(caveatsMatch?.[1] ?? "Confirm with tests or a review checklist.").trim()}
`;
  fs.writeFileSync(skillPath, stringifyFrontmatter(skillFm, skillBody), "utf8");

  data.status = "promoted";
  fs.writeFileSync(instinctFile, stringifyFrontmatter(data, body), "utf8");

  console.log(`Promoted → ${skillPath}`);
  console.log(`Marked instinct status=promoted: ${instinctFile}`);
}

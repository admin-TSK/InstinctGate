import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, resolveVault } from "../lib/vault.js";

export function cmdList(opts: { kind?: string; vault?: string }): void {
  const vault = resolveVault(process.cwd(), opts.vault);
  const kind = (opts.kind ?? "all").toLowerCase();
  const rows: { kind: string; id: string; title: string; meta: string; path: string }[] = [];

  if (kind === "all" || kind === "instincts") {
    const dir = path.join(vault, "instincts");
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md")).sort()) {
        const p = path.join(dir, f);
        const { data } = parseFrontmatter(fs.readFileSync(p, "utf8"));
        rows.push({
          kind: "instinct",
          id: String(data.id ?? f),
          title: String(data.title ?? f),
          meta: `conf=${data.confidence ?? "?"} status=${data.status ?? "?"}`,
          path: p,
        });
      }
    }
  }

  if (kind === "all" || kind === "skills") {
    const dir = path.join(vault, "skills");
    if (fs.existsSync(dir)) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const p = path.join(dir, entry.name, "SKILL.md");
        if (!fs.existsSync(p)) continue;
        const { data } = parseFrontmatter(fs.readFileSync(p, "utf8"));
        rows.push({
          kind: "skill",
          id: String(data.id ?? entry.name),
          title: String(data.title ?? entry.name),
          meta: `from=${data.from_instinct ?? "?"}`,
          path: p,
        });
      }
    }
  }

  if (rows.length === 0) {
    console.log("No entries. Run capture or promote first.");
    return;
  }
  for (const r of rows) {
    console.log(`[${r.kind}] ${r.id}  ${r.title}  (${r.meta})`);
    console.log(`         ${r.path}`);
  }
}

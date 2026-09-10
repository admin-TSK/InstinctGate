import path from "node:path";
import { slugify, type Frontmatter } from "./vault.js";

export interface InstinctCandidate {
  id: string;
  title: string;
  confidence: number;
  body: string;
  frontmatter: Frontmatter;
}

const SIGNAL =
  /lesson|pattern|instinct|fix|prefer|always|never|do not|don't|gotcha|pitfall|remember|heuristic|rule/i;

function cleanBullet(s: string): string {
  return s.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "").trim();
}

function titleFromText(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= 72) return t;
  return t.slice(0, 69).trimEnd() + "…";
}

/**
 * Offline heuristic: turn headings + bullets into 1–5 instinct candidates.
 * No API keys.
 */
export function extractInstincts(
  markdown: string,
  sourcePath: string,
  now = new Date()
): InstinctCandidate[] {
  const lines = markdown.split(/\r?\n/);
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const candidates: { title: string; body: string; confidence: number }[] = [];

  let currentHeading = "";
  let headingIsSignal = false;
  const underHeading: string[] = [];

  const flushHeading = () => {
    if (!currentHeading) return;
    if (underHeading.length === 0) {
      if (SIGNAL.test(currentHeading)) {
        candidates.push({
          title: titleFromText(currentHeading),
          body: `## When\nApply after similar sessions.\n\n## Pattern\n${currentHeading}\n\n## Caveats\nValidate on the next run before promoting.\n`,
          confidence: 0.55,
        });
      }
      return;
    }
    for (const b of underHeading) {
      const conf = headingIsSignal || SIGNAL.test(b) ? 0.72 : 0.48;
      candidates.push({
        title: titleFromText(b),
        body: `## When\nContext: **${currentHeading || "session"}**\n\n## Pattern\n${b}\n\n## Caveats\nHeuristic capture — review before promote.\n`,
        confidence: conf,
      });
    }
  };

  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.+)$/);
    if (h) {
      flushHeading();
      underHeading.length = 0;
      currentHeading = h[1].trim();
      headingIsSignal = SIGNAL.test(currentHeading);
      continue;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/) || line.match(/^\s*\d+\.\s+(.+)$/);
    if (bullet) {
      underHeading.push(cleanBullet(line));
    }
  }
  flushHeading();

  // Fallback: first non-empty paragraph sentences
  if (candidates.length === 0) {
    const para = markdown
      .replace(/^#.+$/gm, "")
      .split(/\n\n+/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter((p) => p.length > 40);
    for (const p of para.slice(0, 3)) {
      candidates.push({
        title: titleFromText(p),
        body: `## When\nGeneral session takeaway.\n\n## Pattern\n${p}\n\n## Caveats\nLow-structure summary; edit before promote.\n`,
        confidence: 0.4,
      });
    }
  }

  if (candidates.length === 0) {
    candidates.push({
      title: "Empty session summary — add lessons next time",
      body: `## When\nN/A\n\n## Pattern\nSession summary at \`${sourcePath}\` had no extractable bullets.\n\n## Caveats\nRe-run capture with a richer summary.\n`,
      confidence: 0.2,
    });
  }

  // Prefer higher confidence, unique titles, max 5
  candidates.sort((a, b) => b.confidence - a.confidence);
  const seen = new Set<string>();
  const picked: typeof candidates = [];
  for (const c of candidates) {
    const key = slugify(c.title);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(c);
    if (picked.length >= 5) break;
  }

  return picked.map((c, i) => {
    const id = `ig-${date}-${String(i + 1).padStart(3, "0")}`;
    const frontmatter: Frontmatter = {
      id,
      title: c.title,
      confidence: Number(c.confidence.toFixed(2)),
      source: sourcePath,
      created: now.toISOString(),
      status: "candidate",
    };
    return {
      id,
      title: c.title,
      confidence: c.confidence,
      body: c.body,
      frontmatter,
    };
  });
}

export function instinctFilename(id: string, title: string): string {
  return `${id}-${slugify(title)}.md`;
}

export function instinctPath(vaultRoot: string, id: string, title: string): string {
  return path.join(vaultRoot, "instincts", instinctFilename(id, title));
}

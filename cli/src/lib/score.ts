export interface Rubric {
  session?: string;
  plan?: boolean;
  tests?: boolean;
  review?: boolean;
  verify?: boolean;
}

export interface ScoreResult {
  points: number;
  max: number;
  ratio: number;
  band: string;
  checks: { key: string; ok: boolean }[];
  session: string;
}

const KEYS = ["plan", "tests", "review", "verify"] as const;

export function scoreRubric(rubric: Rubric): ScoreResult {
  const checks = KEYS.map((key) => ({
    key,
    ok: Boolean(rubric[key]),
  }));
  const points = checks.filter((c) => c.ok).length;
  const max = KEYS.length;
  const ratio = points / max;
  let band = "D";
  if (ratio >= 0.9) band = "A";
  else if (ratio >= 0.7) band = "B";
  else if (ratio >= 0.5) band = "C";
  return {
    points,
    max,
    ratio,
    band,
    checks,
    session: rubric.session ?? "untitled",
  };
}

export function renderScorecard(result: ScoreResult, when: Date): string {
  const rows = result.checks
    .map((c) => `| ${c.key} | ${c.ok ? "yes" : "no"} |`)
    .join("\n");
  return `# Scorecard — ${result.session}

- **When:** ${when.toISOString()}
- **Score:** ${result.points}/${result.max} (${(result.ratio * 100).toFixed(0)}%) — band **${result.band}**

| Check | Done |
|-------|------|
${rows}

## Notes

Rubric is intentionally thin for v0.1: plan, tests, review, verify.
`;
}

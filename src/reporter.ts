import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunResult } from "./types.js";
import { RESULTS_DIR } from "./config.js";

function loadResults(): RunResult[] {
  const resultsFile = join(RESULTS_DIR, "results.jsonl");
  try {
    const content = readFileSync(resultsFile, "utf-8");
    return content
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as RunResult);
  } catch {
    return [];
  }
}

function summarize(runs: RunResult[]) {
  const n = runs.length;
  return {
    runs: n,
    pass_rate: runs.filter((r) => r.grade.pass).length / n,
    avg_precision: runs.reduce((s, r) => s + r.grade.precision, 0) / n,
    avg_recall: runs.reduce((s, r) => s + r.grade.recall, 0) / n,
    avg_f1: runs.reduce((s, r) => s + r.grade.f1, 0) / n,
  };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function generateReport(): string {
  const results = loadResults();
  if (results.length === 0) return "No results found.";

  const lines: string[] = [];
  lines.push("# Superpowers Bench Results");
  lines.push("");

  // ── Per-condition summary ──────────────────────────────────────────

  const conditionGroups = new Map<string, RunResult[]>();
  for (const r of results) {
    if (!conditionGroups.has(r.condition)) conditionGroups.set(r.condition, []);
    conditionGroups.get(r.condition)!.push(r);
  }
  const conditionIds = [...conditionGroups.keys()];

  lines.push("## Summary by Condition");
  lines.push("");
  lines.push("| Condition | Model | Runs | Pass% | Precision | Recall | F1 |");
  lines.push("|-----------|-------|------|-------|-----------|--------|-----|");
  for (const [cid, runs] of conditionGroups) {
    const s = summarize(runs);
    lines.push(
      `| ${cid} | ${runs[0].model} | ${s.runs} | ${pct(s.pass_rate)} | ${pct(s.avg_precision)} | ${pct(s.avg_recall)} | ${pct(s.avg_f1)} |`,
    );
  }
  lines.push("");

  // ── Baseline vs triggered comparison ───────────────────────────────

  const agents = [...new Set(results.map((r) => r.agent))];
  const hasTriggered = conditionIds.some((c) => c.endsWith("-triggered"));

  if (hasTriggered) {
    lines.push("## Baseline vs Triggered");
    lines.push("");
    lines.push("| Agent | Variant | Runs | Pass% | Precision | Recall | F1 |");
    lines.push("|-------|---------|------|-------|-----------|--------|-----|");

    for (const agent of agents) {
      const baseline = results.filter(
        (r) => r.agent === agent && !r.condition.endsWith("-triggered"),
      );
      const triggered = results.filter(
        (r) => r.agent === agent && r.condition.endsWith("-triggered"),
      );

      if (baseline.length > 0) {
        const s = summarize(baseline);
        lines.push(
          `| ${agent} | baseline | ${s.runs} | ${pct(s.pass_rate)} | ${pct(s.avg_precision)} | ${pct(s.avg_recall)} | ${pct(s.avg_f1)} |`,
        );
      }
      if (triggered.length > 0) {
        const s = summarize(triggered);
        lines.push(
          `| ${agent} | triggered | ${s.runs} | ${pct(s.pass_rate)} | ${pct(s.avg_precision)} | ${pct(s.avg_recall)} | ${pct(s.avg_f1)} |`,
        );
      }
    }
    lines.push("");
  }

  // ── Per-task breakdown ─────────────────────────────────────────────

  lines.push("## Per-Task Breakdown");
  lines.push("");

  const taskMap = new Map<
    string,
    { expected: string[]; results: Record<string, { passes: number; total: number }> }
  >();
  for (const r of results) {
    if (!taskMap.has(r.task)) {
      taskMap.set(r.task, { expected: r.grade.expected, results: {} });
    }
    const t = taskMap.get(r.task)!;
    if (!t.results[r.condition]) t.results[r.condition] = { passes: 0, total: 0 };
    t.results[r.condition].total++;
    if (r.grade.pass) t.results[r.condition].passes++;
  }

  const header = ["| Task | Expected |"];
  const sep = ["|------|----------|"];
  for (const cid of conditionIds) {
    header.push(` ${cid} |`);
    sep.push("------|");
  }
  lines.push(header.join(""));
  lines.push(sep.join(""));

  for (const [task, data] of taskMap) {
    const expectedStr = data.expected.length > 0 ? data.expected.join(", ") : "(none)";
    const cols = [`| ${task} | ${expectedStr} |`];
    for (const cid of conditionIds) {
      const r = data.results[cid];
      if (r) {
        cols.push(` ${pct(r.passes / r.total)} (${r.passes}/${r.total}) |`);
      } else {
        cols.push(" - |");
      }
    }
    lines.push(cols.join(""));
  }
  lines.push("");

  // ── Skill-level recall ─────────────────────────────────────────────

  lines.push("## Skill Detection Recall");
  lines.push("");

  const skillStats = new Map<string, Record<string, { expected: number; detected: number }>>();
  for (const r of results) {
    for (const skill of r.grade.expected) {
      if (!skillStats.has(skill)) skillStats.set(skill, {});
      const ss = skillStats.get(skill)!;
      if (!ss[r.condition]) ss[r.condition] = { expected: 0, detected: 0 };
      ss[r.condition].expected++;
      if (r.detected_skills.includes(skill)) ss[r.condition].detected++;
    }
  }

  lines.push("| Skill | " + conditionIds.join(" | ") + " |");
  lines.push("|-------|" + conditionIds.map(() => "------").join("|") + "|");
  for (const [skill, stats] of skillStats) {
    const cols = [`| ${skill} |`];
    for (const cid of conditionIds) {
      const s = stats[cid];
      if (s) {
        cols.push(` ${pct(s.detected / s.expected)} (${s.detected}/${s.expected}) |`);
      } else {
        cols.push(" - |");
      }
    }
    lines.push(cols.join(""));
  }

  return lines.join("\n");
}

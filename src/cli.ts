#!/usr/bin/env tsx
/**
 * CLI entry point for superpowers-bench.
 *
 * Usage:
 *   npm run bench -- run --condition claude --task implement_validator
 *   npm run bench -- matrix [--parallel 4] [--condition claude] [--task X]
 *   npm run bench -- report
 */

import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { loadConfig, RESULTS_DIR, BENCH_ROOT } from "./config.js";
import { runOne, ensureWorkspaces } from "./runner.js";
import { generateReport } from "./reporter.js";
import { retryRun, type RetryRunResult } from "./retry.js";
import { prepareResultsDir, shouldResetResultsForRun } from "./results.js";
import type { RunSpec, ConditionDef, TaskDef } from "./types.js";

const CHILD_RUN_TIMEOUT_MS = 15 * 60 * 1000;
const CHILD_RUN_MAX_RETRIES = 1;

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      result[key] = args[i + 1] ?? "true";
      i++;
    }
  }
  return result;
}

function printUsage(): void {
  console.log(`
superpowers-bench - Compare agent skill selection

Commands:
  run      Run a single condition x task combination
  matrix   Run the full benchmark matrix
  report   Generate results report

Options:
  --condition <id>   Filter to specific condition (claude, codex, opencode-gpt-5-4, etc.)
  --task <id>        Filter to specific task
  --repeat <n>       Number of repeats per combination (default: 1)
  --parallel <n>     Max concurrent runs for matrix (default: 4)
  --worker-id <n>    Internal: workspace index for this worker

Examples:
  npm run bench -- run --condition claude --task implement_validator
  npm run bench -- matrix --parallel 4
  npm run bench -- matrix --condition codex --parallel 2
  npm run bench -- run --condition opencode-gpt-5-4 --task explain_code
  npm run bench -- report
`);
}

function printResult(
  prefix: string,
  task: TaskDef,
  result: { grade: { pass: boolean; missing: string[]; extra: string[] }; detected_skills: string[]; usage: { wall_clock_seconds: number; auto_responses: number } },
): void {
  const status = result.grade.pass ? "PASS" : "FAIL";
  const detected = result.detected_skills.length > 0
    ? result.detected_skills.join(", ")
    : "(none)";
  console.log(
    `  ${status} | expected: [${task.expected_skills.join(", ")}] | detected: [${detected}] | ` +
    `${result.usage.wall_clock_seconds.toFixed(0)}s | auto-resp: ${result.usage.auto_responses}`,
  );
  if (result.grade.missing.length > 0) {
    console.log(`  Missing: ${result.grade.missing.join(", ")}`);
  }
  if (result.grade.extra.length > 0) {
    console.log(`  Extra: ${result.grade.extra.join(", ")}`);
  }
}

// ── run command (single, sync) ───────────────────────────────────────

function runCmd(args: Record<string, string>): void {
  const config = loadConfig();
  const conditionId = args.condition;
  const taskId = args.task;
  const repeat = parseInt(args.repeat ?? "1", 10);
  const workerId = parseInt(args["worker-id"] ?? "0", 10);

  if (!conditionId || !taskId) {
    console.error("Error: --condition and --task are required for 'run'");
    process.exit(1);
  }

  const condition = config.conditions.find((c) => c.id === conditionId);
  if (!condition) {
    console.error(`Unknown condition: ${conditionId}`);
    process.exit(1);
  }

  const task = config.tasks.find((t) => t.id === taskId);
  if (!task) {
    console.error(`Unknown task: ${taskId}`);
    process.exit(1);
  }

  if (shouldResetResultsForRun(args["worker-id"])) {
    prepareResultsDir(RESULTS_DIR);
  } else {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  for (let run = 1; run <= repeat; run++) {
    console.log(`\n[${conditionId}] ${taskId} (run ${run}/${repeat})`);
    const spec: RunSpec = {
      condition: conditionId,
      task: taskId,
      run,
      model: condition.model,
      agent: condition.agent,
    };

    const result = runOne(spec, condition, task, config, workerId);
    printResult(`[${conditionId}] ${taskId}`, task, result);
  }
}

// ── matrix command (parallel) ────────────────────────────────────────

interface Combo {
  condition: ConditionDef;
  task: TaskDef;
  run: number;
}

interface SpawnRunResult extends RetryRunResult {
  combo: Combo;
}

function spawnRunOnce(combo: Combo, workerId: number, attempt: number): Promise<SpawnRunResult> {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      [
        "tsx", "src/cli.ts", "run",
        "--condition", combo.condition.id,
        "--task", combo.task.id,
        "--worker-id", String(workerId),
      ],
      {
        cwd: BENCH_ROOT,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
        detached: true,
      },
    );

    let stdout = "";
    let settled = false;
    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stdout += data.toString(); });

    const finish = (exitCode: number, timedOut: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);

      const lines = stdout.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        console.log(`  [w${workerId}] ${line.trim()}`);
      }
      if (timedOut) {
        console.log(
          `  [w${workerId}] timed out after ${Math.round(CHILD_RUN_TIMEOUT_MS / 60000)} minutes ` +
          `(attempt ${attempt})`,
        );
      }

      resolve({ combo, exitCode, timedOut, attempt });
    };

    const timeoutId = setTimeout(() => {
      try {
        if (child.pid) {
          process.kill(-child.pid, "SIGKILL");
        } else {
          child.kill("SIGKILL");
        }
      } catch {
        child.kill("SIGKILL");
      }
      finish(124, true);
    }, CHILD_RUN_TIMEOUT_MS);

    child.on("error", () => {
      finish(1, false);
    });

    child.on("close", (code) => {
      finish(code ?? 1, false);
    });
  });
}

function spawnRun(combo: Combo, workerId: number): Promise<SpawnRunResult> {
  return retryRun(
    (attempt) => spawnRunOnce(combo, workerId, attempt),
    CHILD_RUN_MAX_RETRIES,
    (result) => {
      const reason = result.timedOut ? "timeout" : `exit ${result.exitCode}`;
      console.log(`  [w${workerId}] retrying after ${reason} (attempt ${result.attempt})`);
    },
  );
}

async function matrixCmd(args: Record<string, string>): Promise<void> {
  const config = loadConfig();
  const repeat = parseInt(args.repeat ?? "1", 10);
  const parallel = parseInt(args.parallel ?? "4", 10);
  const conditionFilter = args.condition;
  const taskFilter = args.task;

  const conditions = conditionFilter
    ? config.conditions.filter((c) => c.id === conditionFilter)
    : config.conditions;
  const tasks = taskFilter
    ? config.tasks.filter((t) => t.id === taskFilter)
    : config.tasks;

  if (conditions.length === 0 || tasks.length === 0) {
    console.error("No matching conditions or tasks");
    process.exit(1);
  }

  prepareResultsDir(RESULTS_DIR);

  // Build and shuffle combo list
  const combos: Combo[] = [];
  for (const condition of conditions) {
    for (const task of tasks) {
      for (let run = 1; run <= repeat; run++) {
        combos.push({ condition, task, run });
      }
    }
  }
  shuffle(combos);

  const totalRuns = combos.length;
  const effectiveParallel = Math.min(parallel, totalRuns);

  console.log(
    `Matrix: ${conditions.length} conditions x ${tasks.length} tasks x ${repeat} repeats = ${totalRuns} runs`,
  );
  console.log(`Parallelism: ${effectiveParallel} workers\n`);

  // Pre-create all workspace copies
  console.log("Preparing workspaces...");
  ensureWorkspaces(effectiveParallel);
  console.log(`Created ${effectiveParallel} workspaces\n`);

  // Worker pool: each worker claims the next combo from the queue
  let nextIndex = 0;
  let completed = 0;
  let passes = 0;

  const workers = Array.from({ length: effectiveParallel }, async (_, workerId) => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= combos.length) break;

      const combo = combos[idx];
      console.log(
        `[${completed + 1}/${totalRuns}] w${workerId}: ${combo.condition.id} / ${combo.task.id}`,
      );

      const { exitCode } = await spawnRun(combo, workerId);
      completed++;

      // Check result from results.jsonl (last line matching this combo)
      // We just rely on the child's output for now
      if (exitCode === 0) {
        // Check the appended result
        try {
          const { readFileSync } = await import("node:fs");
          const lines = readFileSync(join(RESULTS_DIR, "results.jsonl"), "utf-8")
            .trim().split("\n");
          for (let i = lines.length - 1; i >= 0; i--) {
            const r = JSON.parse(lines[i]);
            if (r.condition === combo.condition.id && r.task === combo.task.id && r.run === combo.run) {
              if (r.grade.pass) passes++;
              break;
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  });

  await Promise.all(workers);

  console.log(`\nDone. ${passes}/${totalRuns} passed (${totalRuns > 0 ? ((passes / totalRuns) * 100).toFixed(0) : 0}%)`);
  console.log(`Run 'npm run bench -- report' to see full results.`);
}

function reportCmd(): void {
  const report = generateReport();
  console.log(report);

  const reportPath = join(RESULTS_DIR, "report.md");
  writeFileSync(reportPath, report);
  console.log(`\nReport saved to ${reportPath}`);
}

function shuffle<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ── Main ─────────────────────────────────────────────────────────────

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

switch (command) {
  case "run":
    runCmd(args);
    break;
  case "matrix":
    matrixCmd(args).catch((err) => {
      console.error(err);
      process.exit(1);
    });
    break;
  case "report":
    reportCmd();
    break;
  default:
    printUsage();
    process.exit(command ? 1 : 0);
}

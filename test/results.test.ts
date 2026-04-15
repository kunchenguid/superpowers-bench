import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { prepareResultsDir, shouldResetResultsForRun } from "../src/results.ts";

test("prepareResultsDir removes stale results before a fresh benchmark run", () => {
  const resultsDir = join(tmpdir(), `superpowers-results-${Date.now()}`);
  mkdirSync(join(resultsDir, "old-condition", "task1", "run1"), { recursive: true });
  writeFileSync(join(resultsDir, "results.jsonl"), '{"old":true}\n');
  writeFileSync(join(resultsDir, "report.md"), "old report\n");
  writeFileSync(join(resultsDir, "old-condition", "task1", "run1", "grade.json"), "{}\n");

  prepareResultsDir(resultsDir);

  assert.equal(existsSync(join(resultsDir, "results.jsonl")), false);
  assert.equal(existsSync(join(resultsDir, "report.md")), false);
  assert.equal(existsSync(join(resultsDir, "old-condition")), false);

  rmSync(resultsDir, { recursive: true, force: true });
});

test("shouldResetResultsForRun skips reset for matrix worker subprocesses", () => {
  assert.equal(shouldResetResultsForRun(undefined), true);
  assert.equal(shouldResetResultsForRun("0"), false);
});

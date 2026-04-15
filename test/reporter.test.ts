import test from "node:test";
import assert from "node:assert/strict";

import type { RunResult } from "../src/types.ts";
import { groupByConditionFamily } from "../src/reporter.ts";

function makeRun(condition: string): RunResult {
  return {
    condition,
    task: "task1",
    run: 1,
    model: "openai/gpt-5.4",
    agent: "opencode",
    timestamp: new Date(0).toISOString(),
    usage: { wall_clock_seconds: 1, auto_responses: 0 },
    grade: {
      expected: [],
      detected: [],
      correct: [],
      missing: [],
      extra: [],
      precision: 1,
      recall: 1,
      f1: 1,
      pass: true,
    },
    detected_skills: [],
    agent_output_truncated: "",
  };
}

test("groupByConditionFamily keeps model-specific condition ids separate", () => {
  const groups = groupByConditionFamily([
    makeRun("opencode-gpt-5-4"),
    makeRun("opencode-gpt-5-4-triggered"),
    makeRun("opencode-gpt-5-mini"),
    makeRun("opencode-gpt-5-mini-triggered"),
  ]);

  assert.deepEqual([...groups.keys()], ["opencode-gpt-5-4", "opencode-gpt-5-mini"]);
  assert.equal(groups.get("opencode-gpt-5-4")?.baseline.length, 1);
  assert.equal(groups.get("opencode-gpt-5-4")?.triggered.length, 1);
  assert.equal(groups.get("opencode-gpt-5-mini")?.baseline.length, 1);
  assert.equal(groups.get("opencode-gpt-5-mini")?.triggered.length, 1);
});

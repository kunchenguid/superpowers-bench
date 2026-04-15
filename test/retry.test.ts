import test from "node:test";
import assert from "node:assert/strict";

import { retryRun } from "../src/retry.ts";

test("retryRun retries once after timeout and returns the successful attempt", async () => {
  const attempts: number[] = [];

  const result = await retryRun(async (attempt) => {
    attempts.push(attempt);
    if (attempt === 1) {
      return { exitCode: 124, timedOut: true, attempt };
    }
    return { exitCode: 0, timedOut: false, attempt };
  }, 1);

  assert.deepEqual(attempts, [1, 2]);
  assert.deepEqual(result, { exitCode: 0, timedOut: false, attempt: 2 });
});

test("retryRun stops after the configured retry budget", async () => {
  const attempts: number[] = [];

  const result = await retryRun(async (attempt) => {
    attempts.push(attempt);
    return { exitCode: 1, timedOut: false, attempt };
  }, 1);

  assert.deepEqual(attempts, [1, 2]);
  assert.deepEqual(result, { exitCode: 1, timedOut: false, attempt: 2 });
});

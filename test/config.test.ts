import test from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "../src/config.ts";

test("loadConfig includes Claude Opus 4.7 baseline and triggered conditions", () => {
  const conditions = loadConfig().conditions;

  assert.deepEqual(
    conditions
      .filter((condition) => condition.id.startsWith("claude-opus-4-7"))
      .map((condition) => ({
        id: condition.id,
        agent: condition.agent,
        model: condition.model,
        triggered: condition.triggered,
      })),
    [
      {
        id: "claude-opus-4-7",
        agent: "claude",
        model: "claude-opus-4-7",
        triggered: false,
      },
      {
        id: "claude-opus-4-7-triggered",
        agent: "claude",
        model: "claude-opus-4-7",
        triggered: true,
      },
    ],
  );
});

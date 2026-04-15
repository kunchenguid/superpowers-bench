import test from "node:test";
import assert from "node:assert/strict";

import * as runner from "../src/runner.ts";

test("extractOpenCodeSessionId reads session from step_start event", () => {
  const jsonl = [
    JSON.stringify({
      type: "step_start",
      sessionID: "ses_opencode_123",
      part: { type: "step-start" },
    }),
    JSON.stringify({
      type: "text",
      sessionID: "ses_opencode_123",
      part: { type: "text", text: "done" },
    }),
  ].join("\n");

  assert.equal(
    typeof runner.extractOpenCodeSessionId,
    "function",
    "runner should export extractOpenCodeSessionId",
  );
  assert.equal(runner.extractOpenCodeSessionId?.(jsonl), "ses_opencode_123");
});

test("detectOpenCodeQuestion prefers final-answer question over commentary", () => {
  const jsonl = [
    JSON.stringify({
      type: "text",
      part: {
        type: "text",
        text: "Reading the repo first.",
        metadata: { openai: { phase: "commentary" } },
      },
    }),
    JSON.stringify({
      type: "text",
      part: {
        type: "text",
        text: "What should I implement?",
        metadata: { openai: { phase: "final_answer" } },
      },
    }),
  ].join("\n");

  assert.equal(
    typeof runner.detectOpenCodeQuestion,
    "function",
    "runner should export detectOpenCodeQuestion",
  );
  assert.equal(runner.detectOpenCodeQuestion?.(jsonl), "What should I implement?");
});

test("buildOpenCodeEnv does not disable project skill discovery", () => {
  const buildOpenCodeEnv = (runner as {
    buildOpenCodeEnv?: (isolatedHome: string) => Record<string, string>;
  }).buildOpenCodeEnv;

  assert.equal(
    typeof buildOpenCodeEnv,
    "function",
    "runner should export buildOpenCodeEnv",
  );

  const env = buildOpenCodeEnv!("/tmp/opencode-home");
  assert.equal(env.HOME, "/tmp/opencode-home");
  assert.equal(env.XDG_CONFIG_HOME, "/tmp/opencode-home/.config");
  assert.equal(env.XDG_DATA_HOME, "/tmp/opencode-home/.local/share");
  assert.equal(env.XDG_STATE_HOME, "/tmp/opencode-home/.local/state");
  assert.equal("OPENCODE_DISABLE_CLAUDE_CODE_SKILLS" in env, false);
});

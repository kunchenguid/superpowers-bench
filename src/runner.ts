/**
 * Benchmark runner with multi-turn auto-responder.
 *
 * For each run:
 * 1. Ensure workspace exists (shallow clone openclaw, copy skills)
 * 2. Reset workspace to clean state
 * 3. Run agent with multi-turn auto-response loop
 * 4. Detect skill invocations
 * 5. Grade + compute usage
 * 6. Save results
 *
 * Multi-turn auto-responder:
 * - Claude: uses --resume <session_id> to continue conversations
 * - Codex: re-invokes with augmented prompt including previous context
 */

import {
  execSync,
  type ExecSyncOptionsWithStringEncoding,
} from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  appendFileSync,
  rmSync,
  readdirSync,
  statSync,
  copyFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import type { RunSpec, RunResult, ConditionDef, TaskDef, BenchConfig } from "./types.js";
import { detectSkills } from "./detector.js";
import { gradeSkills } from "./grader.js";
import { BENCH_ROOT, RESULTS_DIR, SKILLS_DIR, CACHE_DIR, REPO_URL } from "./config.js";

const AUTO_RESPONSE = "Use your best judgment on any design decisions and proceed with the implementation.";
const MAX_AUTO_RESPONSES = 3;
const AGENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── Workspace management ─────────────────────────────────────────────

function ensureBaseRepo(): string {
  const baseDir = join(CACHE_DIR, "openclaw");
  if (!existsSync(join(baseDir, ".git"))) {
    console.log("  Cloning openclaw/openclaw (shallow)...");
    mkdirSync(CACHE_DIR, { recursive: true });
    execSync(`git clone --depth 1 ${REPO_URL} ${baseDir}`, { stdio: "pipe" });
  }
  return baseDir;
}

function ensureWorkspace(workerId = 0): string {
  const baseDir = ensureBaseRepo();
  const workspaceDir = join(CACHE_DIR, `workspace-${workerId}`);
  if (!existsSync(join(workspaceDir, ".git"))) {
    console.log(`  Creating workspace-${workerId}...`);
    execSync(`cp -r ${baseDir} ${workspaceDir}`, { stdio: "pipe" });
  }
  return workspaceDir;
}

/** Pre-create N workspace copies from the base repo. */
export function ensureWorkspaces(n: number): void {
  ensureBaseRepo();
  for (let i = 0; i < n; i++) {
    ensureWorkspace(i);
  }
}

function resetWorkspace(workspaceDir: string): void {
  execSync("git checkout -- .", { cwd: workspaceDir, stdio: "pipe" });
  execSync("git clean -fd", { cwd: workspaceDir, stdio: "pipe" });
}

function copySkillsToWorkspace(workspaceDir: string): void {
  // Remove any existing skill directories to start clean
  rmSync(join(workspaceDir, ".claude"), { recursive: true, force: true });
  rmSync(join(workspaceDir, ".agents"), { recursive: true, force: true });

  if (!existsSync(SKILLS_DIR)) {
    throw new Error(`Skills not found at ${SKILLS_DIR}. Run: npm run fetch-skills`);
  }

  const skills = readdirSync(SKILLS_DIR).filter((name) =>
    statSync(join(SKILLS_DIR, name)).isDirectory(),
  );

  for (const skill of skills) {
    const src = join(SKILLS_DIR, skill, "SKILL.md");
    if (!existsSync(src)) continue;

    // Claude Code: .claude/skills/<name>/SKILL.md
    const claudeDst = join(workspaceDir, ".claude", "skills", skill);
    mkdirSync(claudeDst, { recursive: true });
    copyFileSync(src, join(claudeDst, "SKILL.md"));

    // Codex: .agents/skills/<name>/SKILL.md
    const codexDst = join(workspaceDir, ".agents", "skills", skill);
    mkdirSync(codexDst, { recursive: true });
    copyFileSync(src, join(codexDst, "SKILL.md"));
  }
}

// ── Question detection ───────────────────────────────────────────────

function detectClaudeQuestion(jsonl: string): string | null {
  let lastText = "";
  let hasAskUser = false;

  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.type !== "assistant") continue;
      const msg = obj.message as { content?: Array<Record<string, unknown>> } | undefined;
      for (const block of msg?.content ?? []) {
        if (block.type === "tool_use" && block.name === "AskUserQuestion") {
          hasAskUser = true;
          const input = block.input as Record<string, string> | undefined;
          lastText = input?.question ?? input?.text ?? "";
        }
        if (block.type === "text" && typeof block.text === "string") {
          lastText = block.text;
        }
      }
    } catch {
      // skip
    }
  }

  if (hasAskUser) return lastText;
  // Heuristic: if last text ends with "?" it's likely a question
  const trimmed = lastText.trim();
  if (trimmed.endsWith("?") && trimmed.length > 20) return trimmed;
  return null;
}

function detectCodexQuestion(jsonl: string): string | null {
  let lastMessage = "";

  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.type !== "item.completed") continue;
      const item = obj.item as Record<string, unknown> | undefined;
      if (item?.type === "agent_message" && typeof item.text === "string") {
        lastMessage = item.text;
      }
    } catch {
      // skip
    }
  }

  const trimmed = lastMessage.trim();
  if (trimmed.endsWith("?") && trimmed.length > 20) return trimmed;
  return null;
}

// ── Extract session ID from Claude JSONL ──────────────────────────────

function extractClaudeSessionId(jsonl: string): string | null {
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.type === "system" && obj.subtype === "init") {
        return (obj.session_id as string) ?? null;
      }
    } catch {
      // skip
    }
  }
  return null;
}

// ── Extract Codex agent messages for context carry-over ───────────────

function extractCodexMessages(jsonl: string): string[] {
  const messages: string[] = [];
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.type !== "item.completed") continue;
      const item = obj.item as Record<string, unknown> | undefined;
      if (item?.type === "agent_message" && typeof item.text === "string") {
        messages.push(item.text);
      }
    } catch {
      // skip
    }
  }
  return messages;
}

// ── Isolated HOME for Codex ──────────────────────────────────────────

function createIsolatedHome(): string {
  const benchHome = join(tmpdir(), `superpowers-bench-${Date.now()}`);
  mkdirSync(benchHome, { recursive: true });
  mkdirSync(join(benchHome, ".codex"), { recursive: true });

  const realHome = process.env.HOME!;

  // Copy git config
  for (const file of [".gitconfig", ".netrc"]) {
    const src = join(realHome, file);
    if (existsSync(src)) copyFileSync(src, join(benchHome, file));
  }

  // Copy codex credentials
  const codexDir = join(realHome, ".codex");
  if (existsSync(codexDir)) {
    for (const file of readdirSync(codexDir)) {
      if (file.startsWith("auth") || file === "config.toml") {
        const src = join(codexDir, file);
        if (statSync(src).isFile()) {
          copyFileSync(src, join(benchHome, ".codex", file));
        }
      }
    }
  }

  return benchHome;
}

// ── Agent execution ──────────────────────────────────────────────────

function execAgent(
  cmd: string[],
  cwd: string,
  env?: Record<string, string>,
): string {
  try {
    return execSync(cmd.join(" "), {
      encoding: "utf-8",
      timeout: AGENT_TIMEOUT_MS,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
      cwd,
      maxBuffer: 50 * 1024 * 1024,
    } as ExecSyncOptionsWithStringEncoding);
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string };
    return execErr.stdout ?? "";
  }
}

function runClaudeMultiTurn(
  prompt: string,
  workspaceDir: string,
  model: string,
): { jsonl: string; autoResponses: number } {
  let allJsonl = "";
  let sessionId: string | null = null;
  let autoResponses = 0;

  for (let turn = 0; turn <= MAX_AUTO_RESPONSES; turn++) {
    let cmd: string[];

    if (turn === 0) {
      // Create a temporary empty MCP config for isolation
      const emptyMcp = join(workspaceDir, ".empty-mcp.json");
      writeFileSync(emptyMcp, JSON.stringify({ mcpServers: {} }));

      cmd = [
        "claude",
        "--setting-sources", "project",
        "-p", JSON.stringify(prompt),
        "--model", model,
        "--output-format", "stream-json",
        "--verbose",
        "--dangerously-skip-permissions",
        "--strict-mcp-config", "--mcp-config", emptyMcp,
        "--allowedTools", '"Bash,Read,Edit,Write,Glob,Grep,Skill,AskUserQuestion"',
        "--disallowedTools", '"WebFetch,WebSearch,ToolSearch,Agent"',
      ];
    } else {
      // Resume existing session
      cmd = [
        "claude",
        "--resume", sessionId!,
        "-p", JSON.stringify(AUTO_RESPONSE),
        "--output-format", "stream-json",
        "--verbose",
        "--dangerously-skip-permissions",
      ];
    }

    const output = execAgent(cmd, workspaceDir);
    allJsonl += output + "\n";

    // Extract session ID from first turn
    if (turn === 0) {
      sessionId = extractClaudeSessionId(output);
    }

    // Check if agent asked a question
    const question = detectClaudeQuestion(output);
    if (!question || !sessionId) break;

    autoResponses++;
    console.log(`    Auto-responding to Claude (turn ${turn + 1}): "${question.slice(0, 80)}..."`);
  }

  return { jsonl: allJsonl, autoResponses };
}

function runCodexMultiTurn(
  prompt: string,
  workspaceDir: string,
  model: string,
  isolatedHome: string,
): { jsonl: string; autoResponses: number } {
  let allJsonl = "";
  let autoResponses = 0;
  const conversationHistory: string[] = [];
  const env = {
    HOME: isolatedHome,
    CODEX_HOME: join(isolatedHome, ".codex"),
  };

  for (let turn = 0; turn <= MAX_AUTO_RESPONSES; turn++) {
    let fullPrompt: string;

    if (turn === 0) {
      fullPrompt = prompt;
    } else {
      // Include previous conversation context so Codex can continue
      const history = conversationHistory.join("\n\n");
      fullPrompt = [
        prompt,
        "",
        "--- Previous conversation (your file changes are on disk) ---",
        history,
        `User: ${AUTO_RESPONSE}`,
        "--- End previous conversation ---",
        "",
        "Continue working on the task from where you left off.",
      ].join("\n");
    }

    const cmd = [
      "codex", "exec", "--json",
      "--model", model,
      "--skip-git-repo-check",
      "--dangerously-bypass-approvals-and-sandbox",
      "--ephemeral",
      "--config", "'skills.bundled.enabled=false'",
      "-C", workspaceDir,
      JSON.stringify(fullPrompt),
    ];

    const output = execAgent(cmd, workspaceDir, env);
    allJsonl += output + "\n";

    // Collect agent messages for context carry-over
    const messages = extractCodexMessages(output);
    for (const msg of messages) {
      conversationHistory.push(`Assistant: ${msg}`);
    }

    // Check if agent asked a question
    const question = detectCodexQuestion(output);
    if (!question) break;

    autoResponses++;
    conversationHistory.push(`[Agent asked: ${question}]`);
    console.log(`    Auto-responding to Codex (turn ${turn + 1}): "${question.slice(0, 80)}..."`);
  }

  return { jsonl: allJsonl, autoResponses };
}

// ── Main entry point ─────────────────────────────────────────────────

export function runOne(
  spec: RunSpec,
  condition: ConditionDef,
  task: TaskDef,
  config: BenchConfig,
  workerId = 0,
): RunResult {
  // 1. Create artifact directory
  const artifactDir = join(RESULTS_DIR, spec.condition, spec.task, `run${spec.run}`);
  mkdirSync(artifactDir, { recursive: true });

  // 2. Prepare workspace
  const workspaceDir = ensureWorkspace(workerId);
  resetWorkspace(workspaceDir);
  copySkillsToWorkspace(workspaceDir);

  // 3. Build effective prompt (append trigger hint for triggered conditions)
  let effectivePrompt = task.prompt;
  if (condition.triggered && task.trigger_hint) {
    effectivePrompt = `${task.prompt.trim()}\n\n${task.trigger_hint.trim()}`;
  }

  // 4. Run agent with multi-turn auto-responder
  const startTime = Date.now();
  let jsonl: string;
  let autoResponses: number;

  if (condition.agent === "claude") {
    ({ jsonl, autoResponses } = runClaudeMultiTurn(effectivePrompt, workspaceDir, condition.model));
  } else {
    const isolatedHome = createIsolatedHome();
    try {
      ({ jsonl, autoResponses } = runCodexMultiTurn(
        effectivePrompt,
        workspaceDir,
        condition.model,
        isolatedHome,
      ));
    } finally {
      rmSync(isolatedHome, { recursive: true, force: true });
    }
  }

  const wallClockSeconds = (Date.now() - startTime) / 1000;

  // 4. Save raw output
  writeFileSync(join(artifactDir, "agent_output.jsonl"), jsonl);

  // 5. Detect skill invocations
  const detected = detectSkills(jsonl, condition.agent, config.fingerprints);

  // 6. Usage
  const usage = { wall_clock_seconds: wallClockSeconds, auto_responses: autoResponses };

  // 7. Grade
  const grade = gradeSkills(task.expected_skills, detected);

  // 8. Build result
  const result: RunResult = {
    condition: spec.condition,
    task: spec.task,
    run: spec.run,
    model: condition.model,
    agent: condition.agent,
    timestamp: new Date().toISOString(),
    usage,
    grade,
    detected_skills: detected,
    agent_output_truncated: jsonl.slice(0, 3000),
  };

  // 9. Append to results JSONL
  const resultsFile = join(RESULTS_DIR, "results.jsonl");
  appendFileSync(resultsFile, JSON.stringify(result) + "\n");

  // 10. Save grade
  writeFileSync(join(artifactDir, "grade.json"), JSON.stringify(grade, null, 2));

  return result;
}

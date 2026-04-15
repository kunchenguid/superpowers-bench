import type { SkillFingerprints } from "./types.js";

/**
 * Detect skills invoked by Claude Code via the Skill tool_use in JSONL output.
 * Claude's stream-json emits assistant messages containing tool_use blocks.
 * When Claude invokes a skill, we see: { name: "Skill", input: { command: "skill-name" } }
 */
export function detectClaudeSkills(jsonl: string): string[] {
  const skills = new Set<string>();
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.type !== "assistant") continue;
      const msg = obj.message as { content?: Array<Record<string, unknown>> } | undefined;
      for (const block of msg?.content ?? []) {
        if (block.type === "tool_use" && block.name === "Skill") {
          const input = block.input as Record<string, string> | undefined;
          // Claude uses "command" as the parameter name for skills
          const name = input?.command ?? input?.skill;
          if (name) skills.add(name);
        }
      }
    } catch {
      // skip unparseable lines
    }
  }
  return [...skills];
}

/**
 * Detect skills invoked by Codex via fingerprint matching.
 *
 * Codex uses progressive disclosure: skill name+description are loaded at startup,
 * but the full SKILL.md body is only loaded when the skill is actually invoked.
 * When Codex reads a SKILL.md (via sed/cat/etc), the body content appears in the
 * command output within the JSONL transcript.
 *
 * We check for distinctive phrases from each SKILL.md body - if found, that skill
 * was loaded into context.
 */
export function detectCodexSkills(jsonl: string, fingerprints: SkillFingerprints): string[] {
  const skills = new Set<string>();
  for (const [skill, phrases] of Object.entries(fingerprints)) {
    // Require at least 1 fingerprint phrase to match
    if (phrases.some((phrase) => jsonl.includes(phrase))) {
      skills.add(skill);
    }
  }
  return [...skills];
}

/**
 * Unified detection: pick the right strategy based on agent backend.
 */
export function detectSkills(
  jsonl: string,
  agent: "claude" | "codex" | "opencode",
  fingerprints: SkillFingerprints,
): string[] {
  if (agent === "claude") {
    return detectClaudeSkills(jsonl);
  }
  return detectCodexSkills(jsonl, fingerprints);
}

export type AgentBackend = "claude" | "codex" | "opencode";

export interface ConditionDef {
  id: string;
  name: string;
  agent: AgentBackend;
  model: string;
  triggered: boolean;
}

export interface TaskDef {
  id: string;
  category: string;
  prompt: string;
  expected_skills: string[];
  trigger_hint?: string;
}

export interface SkillFingerprints {
  [skill: string]: string[];
}

export interface RunSpec {
  condition: string;
  task: string;
  run: number;
  model: string;
  agent: AgentBackend;
}

export interface SkillGrade {
  expected: string[];
  detected: string[];
  correct: string[];
  missing: string[];
  extra: string[];
  precision: number;
  recall: number;
  f1: number;
  pass: boolean;
}

export interface UsageMetrics {
  wall_clock_seconds: number;
  auto_responses: number;
}

export interface RunResult {
  condition: string;
  task: string;
  run: number;
  model: string;
  agent: AgentBackend;
  timestamp: string;
  usage: UsageMetrics;
  grade: SkillGrade;
  detected_skills: string[];
  agent_output_truncated: string;
}

export interface BenchConfig {
  conditions: ConditionDef[];
  tasks: TaskDef[];
  fingerprints: SkillFingerprints;
}

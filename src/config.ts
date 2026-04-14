import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { BenchConfig, ConditionDef, TaskDef, SkillFingerprints } from "./types.js";

export const BENCH_ROOT = resolve(import.meta.dirname, "..");
export const RESULTS_DIR = join(BENCH_ROOT, "results");
export const SKILLS_DIR = join(BENCH_ROOT, "skills");
export const CACHE_DIR = join(BENCH_ROOT, ".cache");
export const REPO_URL = "https://github.com/openclaw/openclaw.git";

export function loadConfig(): BenchConfig {
  const conditionsRaw = parseYaml(
    readFileSync(join(BENCH_ROOT, "config", "conditions.yaml"), "utf-8"),
  ) as { conditions: Record<string, Omit<ConditionDef, "id">> };

  const conditions: ConditionDef[] = Object.entries(conditionsRaw.conditions).map(
    ([id, def]) => ({ id, ...def }),
  );

  const tasksRaw = parseYaml(
    readFileSync(join(BENCH_ROOT, "config", "tasks.yaml"), "utf-8"),
  ) as { tasks: Record<string, Omit<TaskDef, "id">> };

  const tasks: TaskDef[] = Object.entries(tasksRaw.tasks).map(
    ([id, def]) => ({ id, ...def }),
  );

  const fpRaw = parseYaml(
    readFileSync(join(BENCH_ROOT, "config", "fingerprints.yaml"), "utf-8"),
  ) as { fingerprints: SkillFingerprints };

  return { conditions, tasks, fingerprints: fpRaw.fingerprints };
}

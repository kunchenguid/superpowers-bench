import { mkdirSync, rmSync } from "node:fs";

export function prepareResultsDir(resultsDir: string): void {
  rmSync(resultsDir, { recursive: true, force: true });
  mkdirSync(resultsDir, { recursive: true });
}

export function shouldResetResultsForRun(workerId?: string): boolean {
  return workerId === undefined;
}

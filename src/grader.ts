import type { SkillGrade } from "./types.js";

/**
 * Programmatic grading via set comparison. No LLM judge needed.
 *
 * - pass: all expected skills were detected AND no unexpected skills were invoked
 * - precision: fraction of detected skills that were expected
 * - recall: fraction of expected skills that were detected
 * - f1: harmonic mean of precision and recall
 */
export function gradeSkills(expected: string[], detected: string[]): SkillGrade {
  // Filter out meta-skills from detection (using-superpowers is always-on, not task-specific)
  const metaSkills = new Set(["using-superpowers"]);
  const filteredDetected = detected.filter((s) => !metaSkills.has(s));

  const expectedSet = new Set(expected);
  const detectedSet = new Set(filteredDetected);

  const correct = expected.filter((s) => detectedSet.has(s));
  const missing = expected.filter((s) => !detectedSet.has(s));
  const extra = filteredDetected.filter((s) => !expectedSet.has(s));

  let precision: number;
  let recall: number;

  if (expected.length === 0 && filteredDetected.length === 0) {
    // Both empty: perfect score (correctly invoked nothing)
    precision = 1;
    recall = 1;
  } else if (expected.length === 0) {
    // Expected nothing but detected something: precision=0, recall=1 (vacuously)
    precision = 0;
    recall = 1;
  } else if (filteredDetected.length === 0) {
    // Expected something but detected nothing
    precision = 1; // vacuously (no false positives)
    recall = 0;
  } else {
    precision = correct.length / filteredDetected.length;
    recall = correct.length / expected.length;
  }

  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const pass = missing.length === 0 && extra.length === 0;

  return {
    expected,
    detected: filteredDetected,
    correct,
    missing,
    extra,
    precision,
    recall,
    f1,
    pass,
  };
}

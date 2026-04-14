# Superpowers Bench Results

## Summary by Condition

| Condition | Model | Runs | Pass% | Precision | Recall | F1 |
|-----------|-------|------|-------|-----------|--------|-----|
| codex | gpt-5.4 | 28 | 46% | 83% | 86% | 78% |
| claude-triggered | claude-opus-4-6 | 22 | 27% | 100% | 34% | 36% |
| codex-triggered | gpt-5.4 | 23 | 78% | 90% | 99% | 92% |
| claude | claude-opus-4-6 | 24 | 29% | 100% | 29% | 29% |

## Baseline vs Triggered

| Agent | Variant | Runs | Pass% | Precision | Recall | F1 |
|-------|---------|------|-------|-----------|--------|-----|
| codex | baseline | 28 | 46% | 83% | 86% | 78% |
| codex | triggered | 23 | 78% | 90% | 99% | 92% |
| claude | baseline | 24 | 29% | 100% | 29% | 29% |
| claude | triggered | 22 | 27% | 100% | 34% | 36% |

## Per-Task Breakdown

| Task | Expected | codex | claude-triggered | codex-triggered | claude |
|------|----------|------|------|------|------|
| plan_migration | brainstorming, writing-plans | 100% (2/2) | 0% (0/1) | 100% (1/1) | 0% (0/2) |
| design_threading | brainstorming, writing-plans | 0% (0/2) | 0% (0/2) | 100% (1/1) | 0% (0/1) |
| plan_refactor | brainstorming, writing-plans | 100% (2/2) | 0% (0/2) | 100% (1/1) | 0% (0/1) |
| list_structure | (none) | 100% (2/2) | 100% (1/1) | 100% (1/1) | 100% (1/1) |
| explain_code | (none) | 100% (1/1) | 100% (2/2) | 100% (1/1) | 100% (2/2) |
| design_plugin_deps | brainstorming, writing-plans | 50% (1/2) | 0% (0/1) | 100% (2/2) | 0% (0/1) |
| verify_tests | verification-before-completion | 100% (1/1) | 0% (0/1) | 100% (2/2) | 0% (0/1) |
| parallel_fixes | dispatching-parallel-agents | 0% (0/2) | 0% (0/1) | 0% (0/1) | 0% (0/1) |
| implement_sanitizer | brainstorming, test-driven-development, verification-before-completion | 0% (0/1) | 0% (0/1) | 100% (1/1) | 0% (0/2) |
| debug_memory_leak | systematic-debugging | 0% (0/1) | 100% (1/1) | 100% (2/2) | 0% (0/1) |
| implement_validator | brainstorming, test-driven-development, verification-before-completion | 0% (0/1) | 0% (0/2) | 100% (1/1) | 0% (0/2) |
| count_tests | (none) | 100% (2/2) | 100% (1/1) | 100% (1/1) | 100% (1/1) |
| verify_build | verification-before-completion | 50% (1/2) | 0% (0/1) | 100% (2/2) | 0% (0/2) |
| implement_retry | brainstorming, test-driven-development, verification-before-completion | 0% (0/2) | 0% (0/1) | 0% (0/1) | 0% (0/1) |
| review_recent | requesting-code-review | 0% (0/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) |
| debug_timeouts | systematic-debugging | 0% (0/2) | 0% (0/1) | 0% (0/1) | 100% (1/1) |
| design_caching | brainstorming, writing-plans | 100% (1/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) |
| debug_flaky_tests | systematic-debugging | 0% (0/1) | 100% (1/1) | 0% (0/2) | 100% (2/2) |

## Skill Detection Recall

| Skill | codex | claude-triggered | codex-triggered | claude |
|-------|------|------|------|------|
| brainstorming | 100% (13/13) | 18% (2/11) | 100% (9/9) | 0% (0/11) |
| writing-plans | 67% (6/9) | 14% (1/7) | 100% (6/6) | 0% (0/6) |
| verification-before-completion | 29% (2/7) | 0% (0/6) | 86% (6/7) | 0% (0/8) |
| dispatching-parallel-agents | 100% (2/2) | 0% (0/1) | 100% (1/1) | 0% (0/1) |
| test-driven-development | 100% (4/4) | 0% (0/4) | 100% (3/3) | 0% (0/5) |
| systematic-debugging | 100% (4/4) | 67% (2/3) | 100% (5/5) | 75% (3/4) |
| requesting-code-review | 100% (1/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) |
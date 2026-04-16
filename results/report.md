# Superpowers Bench Results

## Summary by Condition

| Condition | Model | Runs | Pass% | Precision | Recall | F1 |
|-----------|-------|------|-------|-----------|--------|-----|
| claude-triggered | claude-opus-4-6 | 18 | 39% | 100% | 42% | 43% |
| claude | claude-opus-4-6 | 18 | 33% | 100% | 38% | 40% |
| opencode-gpt-5-4-triggered | openai/gpt-5.4 | 18 | 56% | 90% | 86% | 82% |
| codex-triggered | gpt-5.4 | 18 | 78% | 91% | 98% | 92% |
| opencode-gpt-5-4 | openai/gpt-5.4 | 18 | 50% | 90% | 73% | 74% |
| codex | gpt-5.4 | 18 | 44% | 83% | 92% | 83% |
| claude-opus-4-7 | claude-opus-4-7 | 18 | 44% | 95% | 69% | 70% |
| claude-opus-4-7-triggered | claude-opus-4-7 | 18 | 56% | 98% | 69% | 72% |

## Baseline vs Triggered

| Condition | Variant | Runs | Pass% | Precision | Recall | F1 |
|-------|---------|------|-------|-----------|--------|-----|
| claude | baseline | 18 | 33% | 100% | 38% | 40% |
| claude | triggered | 18 | 39% | 100% | 42% | 43% |
| opencode-gpt-5-4 | baseline | 18 | 50% | 90% | 73% | 74% |
| opencode-gpt-5-4 | triggered | 18 | 56% | 90% | 86% | 82% |
| codex | baseline | 18 | 44% | 83% | 92% | 83% |
| codex | triggered | 18 | 78% | 91% | 98% | 92% |
| claude-opus-4-7 | baseline | 18 | 44% | 95% | 69% | 70% |
| claude-opus-4-7 | triggered | 18 | 56% | 98% | 69% | 72% |

## Per-Task Breakdown

| Task | Expected | claude-triggered | claude | opencode-gpt-5-4-triggered | codex-triggered | opencode-gpt-5-4 | codex | claude-opus-4-7 | claude-opus-4-7-triggered |
|------|----------|------|------|------|------|------|------|------|------|
| design_caching | brainstorming, writing-plans | 0% (0/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) |
| design_threading | brainstorming, writing-plans | 100% (1/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) |
| design_plugin_deps | brainstorming, writing-plans | 0% (0/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) |
| implement_validator | brainstorming, test-driven-development, verification-before-completion | 0% (0/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) |
| implement_retry | brainstorming, test-driven-development, verification-before-completion | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) |
| implement_sanitizer | brainstorming, test-driven-development, verification-before-completion | 0% (0/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) |
| debug_timeouts | systematic-debugging | 100% (1/1) | 100% (1/1) | 100% (1/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) |
| debug_memory_leak | systematic-debugging | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) |
| debug_flaky_tests | systematic-debugging | 100% (1/1) | 100% (1/1) | 100% (1/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) |
| verify_tests | verification-before-completion | 0% (0/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) |
| verify_build | verification-before-completion | 0% (0/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) |
| plan_migration | brainstorming, writing-plans | 0% (0/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) |
| plan_refactor | brainstorming, writing-plans | 0% (0/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) |
| review_recent | requesting-code-review | 0% (0/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) |
| parallel_fixes | dispatching-parallel-agents | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) |
| explain_code | (none) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) |
| list_structure | (none) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) |
| count_tests | (none) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) |

## Skill Detection Recall

| Skill | claude-triggered | claude | opencode-gpt-5-4-triggered | codex-triggered | opencode-gpt-5-4 | codex | claude-opus-4-7 | claude-opus-4-7-triggered |
|-------|------|------|------|------|------|------|------|------|
| brainstorming | 13% (1/8) | 25% (2/8) | 100% (8/8) | 100% (8/8) | 100% (8/8) | 100% (8/8) | 88% (7/8) | 50% (4/8) |
| writing-plans | 40% (2/5) | 0% (0/5) | 80% (4/5) | 100% (5/5) | 40% (2/5) | 80% (4/5) | 60% (3/5) | 100% (5/5) |
| test-driven-development | 0% (0/3) | 0% (0/3) | 67% (2/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 67% (2/3) | 100% (3/3) |
| verification-before-completion | 0% (0/5) | 0% (0/5) | 40% (2/5) | 80% (4/5) | 40% (2/5) | 40% (2/5) | 0% (0/5) | 0% (0/5) |
| systematic-debugging | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (3/3) |
| requesting-code-review | 0% (0/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) | 0% (0/1) | 100% (1/1) | 0% (0/1) | 0% (0/1) |
| dispatching-parallel-agents | 0% (0/1) | 0% (0/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) | 100% (1/1) |
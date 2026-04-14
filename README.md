<h1 align="center">superpowers-bench</h1>
<p align="center">
  <a href="https://x.com/kunchenguid"
    ><img
      alt="X"
      src="https://img.shields.io/badge/X-@kunchenguid-black?style=flat-square"
  /></a>
  <a href="https://discord.gg/Wsy2NpnZDu"
    ><img
      alt="Discord"
      src="https://img.shields.io/discord/1439901831038763092?style=flat-square&label=discord"
  /></a>
</p>

<h3 align="center">Can your agent pick the right skill without being told?</h3>

You give your agent a set of skills. You describe a task. Does it figure out which skills to use - or does it need hand-holding?

superpowers-bench measures how well coding agents (Claude Code, Codex) discover and invoke skills from [obra/superpowers](https://github.com/obra/superpowers) based on context alone.
It tests two conditions: **no hints** (just the task prompt) and **with hints** (task prompt + a natural-language hint that implies the right workflow without naming it).

<p align="center">
  <img src="https://raw.githubusercontent.com/kunchenguid/superpowers-bench/refs/heads/master/docs/social/f1.png" alt="superpowers-bench F1 scores" width="800" />
</p>

- **Skill selection as the unit of measure** - not code quality, not pass/fail on tests. Did the agent reach for the right tools?
- **Apples-to-apples comparison** - same 20 tasks, same skills, same grading. Just swap the agent.
- **Baseline vs triggered** - quantifies how much a well-written hint improves skill discovery without explicit instruction.

## Quick Start

```sh
$ npm install
$ npm run fetch-skills            # download skill definitions
$ npm run bench -- run --condition claude --task explain_code
# ... agent runs, result appended to results/results.jsonl

$ npm run bench -- matrix --parallel 4   # run full benchmark
$ npm run bench -- report                # generate report
```

## Install

**From source** (only method - this is a benchmarking tool, not a published package):

```sh
git clone https://github.com/kunchenguid/superpowers-bench.git
cd superpowers-bench
npm install
npm run fetch-skills
```

**Prerequisites**: Node.js 16+, and either `claude` (Claude Code CLI) or `codex` (OpenAI Codex CLI) on your PATH with valid API credentials.

## How It Works

```
┌──────────────────────────────────────────────────┐
│ CLI: run / matrix / report                       │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│ Runner                                           │
│  1. Clone target repo into isolated workspace    │
│  2. Copy skill definitions into workspace        │
│  3. Build prompt (+ trigger hint if triggered)   │
│  4. Execute agent (multi-turn, auto-respond x3)  │
│  5. Detect which skills were invoked             │
│  6. Grade: precision / recall / F1 vs expected   │
│  7. Append result to results.jsonl               │
└──────────────────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│ Reporter                                         │
│  Load results.jsonl ► markdown tables            │
│  Summary by condition, per-task, per-skill       │
└──────────────────────────────────────────────────┘
```

- **Isolated workspaces** - each parallel worker gets its own git copy of the target repo to prevent interference
- **Detection method** - Claude: parsed from `Skill` tool_use events. Codex: fingerprint matching against distinctive phrases from skill bodies
- **Grading** - set comparison between detected and expected skills. Pass = no missing, no extra

## CLI Reference

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `npm run bench run`    | Execute a single condition x task combination |
| `npm run bench matrix` | Run full benchmark matrix across all combos   |
| `npm run bench report` | Generate markdown report from results.jsonl   |
| `npm run fetch-skills` | Download skill definitions from superpowers   |

### Flags

| Command  | Flag               | Description                          |
| -------- | ------------------ | ------------------------------------ |
| `run`    | `--condition <id>` | Condition to run (required)          |
| `run`    | `--task <id>`      | Task to run (required)               |
| `run`    | `--repeat <n>`     | Number of repetitions (default: 1)   |
| `matrix` | `--parallel <n>`   | Max concurrent workers (default: 4)  |
| `matrix` | `--condition <id>` | Filter to one condition              |
| `matrix` | `--task <id>`      | Filter to one task                   |
| `matrix` | `--repeat <n>`     | Repeats per combination (default: 1) |

## Configuration

All config lives in `config/`:

- **`conditions.yaml`** - defines agent variants (agent, model, triggered flag)
- **`tasks.yaml`** - 20 tasks with prompts, expected skills, and trigger hints
- **`fingerprints.yaml`** - distinctive phrases for Codex skill detection

### Conditions

| ID                 | Agent  | Model           | Triggered |
| ------------------ | ------ | --------------- | --------- |
| `claude`           | Claude | claude-opus-4-6 | no        |
| `claude-triggered` | Claude | claude-opus-4-6 | yes       |
| `codex`            | Codex  | gpt-5.4         | no        |
| `codex-triggered`  | Codex  | gpt-5.4         | yes       |

## Development

```sh
npm install          # install dependencies
npm run fetch-skills # download skill definitions
npm run bench        # run CLI (see subcommands above)
```

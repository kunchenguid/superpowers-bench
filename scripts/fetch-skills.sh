#!/bin/bash
set -euo pipefail

SKILLS_DIR="$(cd "$(dirname "$0")/.." && pwd)/skills"
REPO_BASE="https://raw.githubusercontent.com/obra/superpowers/main/skills"

SKILLS=(
  brainstorming
  test-driven-development
  systematic-debugging
  verification-before-completion
  writing-plans
  requesting-code-review
  dispatching-parallel-agents
  using-superpowers
)

for skill in "${SKILLS[@]}"; do
  mkdir -p "$SKILLS_DIR/$skill"
  echo "Fetching $skill..."
  curl -sL "$REPO_BASE/$skill/SKILL.md" -o "$SKILLS_DIR/$skill/SKILL.md"
  # Verify frontmatter exists
  if ! head -1 "$SKILLS_DIR/$skill/SKILL.md" | grep -q "^---"; then
    echo "  WARNING: $skill SKILL.md missing YAML frontmatter"
  fi
done

echo "Done. Fetched ${#SKILLS[@]} skills to $SKILLS_DIR"

# Prompts

Ready-to-use prompts for common SAP CAP development scenarios.

## How to Use

Copy a prompt, fill in the placeholders, and paste it into Claude Code — or use a slash command.

## Contents

| File | Purpose |
|------|---------|
| [orchestrator.md](orchestrator.md) | Start an orchestrated multi-agent development session |
| [examples/01-new-feature.md](examples/01-new-feature.md) | Request a new SAP CAP feature |
| [examples/02-procurement-app.md](examples/02-procurement-app.md) | Full example project context (Procurement Management) |
| [examples/03-bugfix.md](examples/03-bugfix.md) | Request a bug investigation and fix |

## Slash Commands (Interactive)

These commands can be invoked directly in Claude Code:

| Command | Description |
|---------|-------------|
| `/orchestrate <feature>` | Full multi-agent feature with worktrees |
| `/ticket <TICKET-ID>` | Work a JIRA/Linear ticket end-to-end |
| `/pr-review <PR#>` | Review a pull request |
| `/pr-summary` | Generate a PR description from current changes |
| `/code-quality <dir>` | Run quality checks on a directory |

## Quick Reference — Agent Roles

| Agent | When to Use |
|-------|------------|
| `feature-developer` | Implementing a new feature or user story |
| `code-reviewer` | Reviewing code after implementation |
| `github-workflow` | Creating commits, branches, and PRs |

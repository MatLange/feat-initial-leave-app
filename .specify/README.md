# Spec-Driven Development with GitHub Speckit

This project uses [GitHub Speckit](https://github.com/github/spec-kit) for
**spec-driven development**: specifications live in `.specify/` and serve as the
primary contract between product intent and code. No feature is implemented without
a spec.

---

## Why Specs Before Code?

- The spec forces clarity before effort — ambiguity is cheaper to fix in Markdown than in TypeScript
- Agents receive a precise contract; they can't accidentally build the wrong thing
- The `code-reviewer` agent validates implementation against the spec, not just code style
- Specs are versioned alongside code — the git history shows *why* things were built the way they were

---

## Directory Structure

```
.specify/
├── constitution.md          # Project-wide principles (read once, rarely changed)
├── README.md                # This file
└── features/
    └── {feature-slug}/
        ├── spec.md          # WHAT to build — stories, acceptance criteria, scope
        ├── plan.md          # HOW to build it — SAP CAP layer-by-layer plan
        └── tasks.md         # Actionable task list for the feature-developer agent
```

One directory per feature. The slug matches the git branch name: `feat/{slug}`.

---

## Spec Lifecycle

```
DRAFT → REVIEW → APPROVED → IMPLEMENTED
```

| Status | Meaning |
|--------|---------|
| `DRAFT` | Being written — not yet ready for implementation |
| `REVIEW` | Ready for stakeholder/team review |
| `APPROVED` | Green light to implement — acceptance criteria are final |
| `IMPLEMENTED` | Feature is merged; spec is the historical record |

Update the `Status:` line in `spec.md` as the feature progresses.

---

## Workflow

### Step 1 — Specify (before any code)

```
/specify <feature description or ticket ID>
```

This creates `.specify/features/{slug}/spec.md`, `plan.md`, and `tasks.md`.

The `/specify` command:
1. Reads `constitution.md` for governing principles
2. Asks clarifying questions if the feature is underspecified
3. Writes `spec.md` — user stories and acceptance criteria
4. Writes `plan.md` — SAP CAP layer breakdown (which entities, actions, annotations)
5. Writes `tasks.md` — ordered, commit-per-task implementation checklist

### Step 2 — Review the Spec

Open `.specify/features/{slug}/spec.md`. Confirm:
- Acceptance criteria are testable (not vague like "works well")
- Scope is explicit — both what IS and is NOT included
- Open questions are listed and will be resolved before or during implementation

Update the status from `DRAFT` to `APPROVED` when ready.

### Step 3 — Implement (via orchestrate)

```
/orchestrate <feature slug or description>
```

The orchestrator:
1. Finds the spec in `.specify/features/{slug}/`
2. Passes `spec.md` + `tasks.md` to the `feature-developer` agent
3. The developer implements layer by layer, using `tasks.md` as the task list
4. The `code-reviewer` validates implementation against `spec.md` acceptance criteria
5. The `github-workflow` agent creates the PR

---

## Speckit Commands

| Command | What it does |
|---------|-------------|
| `/specify <feature>` | Full spec-first workflow: constitution → spec → plan → tasks |
| `/speckit.clarify` | Refine an underspecified area in an existing spec |
| `/speckit.analyze` | Cross-check: does the implementation match the spec? |

---

## Spec File Format

### `spec.md`

```markdown
# Feature: {Name}

> Status: DRAFT | REVIEW | APPROVED | IMPLEMENTED
> Ticket: {ticket-id or n/a}
> Date: {YYYY-MM-DD}

## Problem Statement
{One paragraph: what problem, for whom, why now}

## User Stories
- As a **{role}**, I want to **{action}** so that **{outcome}**

## Acceptance Criteria
- [ ] {Testable, specific criterion}
- [ ] {Testable, specific criterion}

## Non-Goals
- {What this feature intentionally does NOT cover}

## Open Questions
- [ ] {Question to resolve before/during implementation}

## SAP CAP Impact
- **New Entities:** ...
- **Modified Entities:** ...
- **New Actions:** ...
- **Services:** ...
- **Fiori UI:** ...
```

### `plan.md`

```markdown
# Technical Plan: {Feature Name}

## Overview
{2-3 sentences on the technical approach}

## Layer 1 — Data Model
## Layer 2 — Service Definition
## Layer 3 — Handler
## Layer 4 — Fiori Annotations
## Layer 5 — Tests
## Dependencies & Risks
```

### `tasks.md`

```markdown
# Implementation Tasks: {Feature Name}

## Pre-Implementation
- [ ] Confirm spec is APPROVED

## Layer 1 — Data Model
- [ ] {Specific task} → commit: `feat(scope): ...`

## Layer 2 — Service Definition
...
```

---

## Rules

1. **Spec before code** — no `feature-developer` agent is invoked without an APPROVED `spec.md`
2. **Spec is the source of truth** — all acceptance criteria must be covered by tests
3. **Specs are committed** — `.specify/features/` is versioned; specs travel with the code
4. **One spec per feature branch** — slug matches `feat/{slug}` branch name
5. **Never duplicate** — spec content belongs in `.specify/`, not in ticket descriptions, PRs, or CLAUDE.md

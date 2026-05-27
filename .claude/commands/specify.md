---
description: Spec-first feature specification using GitHub Speckit. Produces spec.md, plan.md, and tasks.md in .specify/features/ before any code is written. Usage: /specify <feature description or ticket ID>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), mcp__github__*, mcp__jira__*, mcp__linear__*
---

# Speckit — Spec-First Feature Definition

You are the **specification lead**. Your job is to produce a complete, implementation-ready
spec for this feature — without writing any code yet.

Feature to specify: **$ARGUMENTS**

---

## Step 1: Read the Constitution

Read `.specify/constitution.md` before specifying anything. If it does not exist, tell
the user to create it first (copy from the sapcapclaude template).

```bash
cat .specify/constitution.md
```

---

## Step 2: Understand the Request

If `$ARGUMENTS` looks like a ticket ID (e.g. `PROJ-123`), fetch the ticket via MCP tools
and extract: title, description, acceptance criteria.

Otherwise parse `$ARGUMENTS` as a free-text feature description.

Ask the user clarifying questions if any of these are unclear:
- Who is the primary user of this feature?
- What problem does it solve, and why is it needed now?
- What is explicitly **out of scope**?
- Are there existing CDS entities to extend, or are new ones needed?
- Are there dependencies on other features or services?

Do not proceed to Step 3 until you have enough information to write testable criteria.

---

## Step 3: Derive the Feature Slug and Create the Directory

```bash
# Derive slug from the ticket ID or description
# Format: lowercase, hyphens only, max 40 chars
SLUG="$(echo "$ARGUMENTS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-40)"
SPEC_DIR=".specify/features/${SLUG}"
mkdir -p "$SPEC_DIR"
echo "Spec directory: $SPEC_DIR"
```

Report the slug to the user — it will become the git branch name `feat/{slug}`.

---

## Step 4: Write `spec.md` — What to Build

Create `.specify/features/{slug}/spec.md` with this structure:

```markdown
# Feature: {Human-readable name}

> Status: DRAFT
> Ticket: {ticket-id or n/a}
> Date: {today YYYY-MM-DD}

## Problem Statement

{1-2 sentences: what problem, for whom, why now}

## User Stories

- As a **{role}**, I want to **{action}** so that **{outcome}**
- As a **{role}**, I want to **{action}** so that **{outcome}**

## Acceptance Criteria

- [ ] {Testable, specific — unambiguous enough to write a test for}
- [ ] {Testable, specific}
- [ ] {Error/edge case: what happens when X is invalid}

## Non-Goals (Out of Scope)

- {What this intentionally does NOT cover}

## Open Questions

- [ ] {Question to resolve before or during implementation}

## SAP CAP Impact

- **New Entities:** {names or "none"}
- **Modified Entities:** {names or "none"}
- **New Actions:** {action names or "none"}
- **Services:** {service name, e.g. ProcurementService}
- **Fiori UI:** {app folder path, e.g. app/purchase-orders/ or "none"}
- **Tests Required:** {describe key test scenarios}
```

**Quality bar for acceptance criteria:**
- Each criterion must be binary — either met or not
- Each criterion must be testable with `@sap/cds-test`
- Include at least one error/edge case criterion per action
- Avoid vague language ("works correctly", "handles errors") — be specific

---

## Step 5: Write `plan.md` — How to Build It (SAP CAP Layers)

Create `.specify/features/{slug}/plan.md`:

```markdown
# Technical Plan: {Feature Name}

> Derived from spec.md.

## Overview

{2-3 sentences on the technical approach and key design decisions}

## Layer 1 — Data Model (`db/`)

**File:** `db/{module}.cds`
**Namespace:** `{namespace}`

```cds
// Entity shape (not final code — just the structure)
type {StatusType} : String(20) enum { A; B; C; };

entity {EntityName} : cuid, managed {
  field1       : String(100) @mandatory;
  status       : {StatusType} default 'A';
  virtual calc : Integer @readonly;
}
```

Key decisions:
- {Why named type for enum}
- {Composition vs Association decision}

## Layer 2 — Service Definition (`srv/`)

**File:** `srv/{service-name}.cds`
**New projections:** {list}
**New actions:** {list with signatures}

Key decisions:
- {Auth annotation and why}
- {Draft enabled yes/no and why}
- {Capability restrictions}

## Layer 3 — Handler (`srv/`)

**File:** `srv/{service-name}.ts`
**Hooks:** {list: before/on/after with event + entity}
**Status machine:** {diagram as text: A → [action()] → B}
**Validation logic:** {describe}

Key decisions:
- {Always return req.reject() — list the places}

## Layer 4 — Fiori Annotations (`app/`)

**File:** `app/{app-name}/annotations.cds`
**List Report:** {columns, filters}
**Object Page:** {sections and fields}
**Criticality:** {status-to-color mapping}

## Layer 5 — Tests (`test/`)

**Test scenarios:**
| # | Scenario | Expected |
|---|----------|---------|
| 1 | Happy path: create | 201, status = Draft |
| 2 | {action} happy | 200, status = {X} |
| 3 | {action} wrong state | 422 |

## Dependencies & Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | {risk} | {mitigation} |
```

---

## Step 6: Write `tasks.md` — Ordered Implementation Checklist

Create `.specify/features/{slug}/tasks.md`:

```markdown
# Implementation Tasks: {Feature Name}

> Ordered task list for the feature-developer agent.
> Each section = one git commit. Work inside worktree `../worktrees/feat-{slug}/`.

## Pre-Implementation

- [ ] Confirm spec.md status is APPROVED
- [ ] No naming conflicts in existing CDS models (check `db/`)
- [ ] Create worktree: `git worktree add ../worktrees/feat-{slug} -b feat/{slug}`

## Layer 1 — Data Model

- [ ] Create `db/{module}.cds` with namespace, named types, entities
- [ ] Run `npx cds-lint` — must pass
- [ ] Commit: `feat({scope}): add {EntityName} CDS data model`

## Layer 2 — Service Definition

- [ ] Create `srv/{service}.cds` with projections and actions
- [ ] Run `npx cds-lint` — must pass
- [ ] Commit: `feat({scope}): expose {EntityName} via {ServiceName}`

## Layer 3 — Handler (TDD: write tests before code)

- [ ] Write test skeleton with factory `getMock{Entity}(overrides?)` and all {N} test cases
- [ ] Implement handler class with all hooks
- [ ] Run `npm test` — all tests must pass
- [ ] Run `npx tsc --noEmit` — no type errors
- [ ] Commit: `feat({scope}): implement {actions} handler`

## Layer 4 — Fiori Annotations

- [ ] Create `app/{name}/index.cds` and `annotations.cds`
- [ ] Run `npx cds-lint` — must pass
- [ ] Commit: `feat({scope}): add Fiori annotations for {EntityName}`

## Spec Compliance Checklist

- [ ] All acceptance criteria from spec.md are covered by tests
- [ ] No out-of-scope items implemented
- [ ] Open questions from spec.md resolved or documented
```

---

## Step 7: Report Completion

```
Spec complete: {feature name}
Slug: {slug}
Directory: .specify/features/{slug}/

  spec.md   — {N} acceptance criteria, {N} user stories, {N} open questions
  plan.md   — {N} layers, {N} risks
  tasks.md  — {N} implementation tasks ({N} per layer)

Status: DRAFT

Next steps:
  1. Review .specify/features/{slug}/spec.md
     - Confirm all acceptance criteria are testable
     - Resolve open questions if possible
     - Change status from DRAFT to APPROVED when ready
  2. Run: /orchestrate {slug}
     The orchestrator will read .specify/features/{slug}/ automatically.
```

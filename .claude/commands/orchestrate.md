---
description: Orchestrate a complete SAP CAP feature across specialized agents using isolated git worktrees. Usage: /orchestrate <feature description or ticket ID>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(npm:*), Bash(npx:*), Bash(cds:*), mcp__github__*, mcp__jira__*, mcp__linear__*
---

# Orchestrator — SAP CAP Multi-Agent Feature Development

Coordinate this feature across specialized agents with isolated worktrees: **$ARGUMENTS**

---

## Phase 1: Understand the Requirement

### 1a. Fetch ticket (if ticket ID provided)
If `$ARGUMENTS` is a ticket ID (e.g., `PROC-123`), fetch details via MCP:
```
Read ticket: title, description, acceptance criteria, linked tickets
```

### 1b. Parse the feature
Summarize in structured form:
```
Feature: [name]
Goal:    [one sentence]
Acceptance Criteria:
  - [ ] ...
  - [ ] ...
Entities affected:  [new/modified CDS entities]
Services involved:  [which .cds service files]
UI changes:         [which app annotations]
Test scenarios:     [key happy-path and error cases]
Dependencies:       [blocks or requires other features?]
```

### 1c. Explore the codebase
```bash
# Find existing related entities
grep -r "entity.*Order\|entity.*Supplier" db/ --include="*.cds" -l

# Check service definitions
ls srv/*.cds

# Check existing handlers
ls srv/*.ts

# Check Fiori apps
ls app/*/annotations.cds 2>/dev/null || echo "No Fiori apps yet"
```

---

## Phase 2: Set Up the Worktree

```bash
# Derive branch name from ticket or description
# Format: feat/{ticket-id}-{kebab-description}  OR  feat/{kebab-description}
ARGS="$ARGUMENTS"
BRANCH="feat/${ARGS// /-}"
BRANCH="${BRANCH,,}"          # lowercase
BRANCH="${BRANCH//[^a-z0-9-\/]/-}"  # sanitize

# Worktrees live one level up from the project root (sibling directory)
PROJECT_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_DIR="${PROJECT_ROOT}/../worktrees"
WORKTREE="${WORKTREE_DIR}/${BRANCH//\//-}"

mkdir -p "$WORKTREE_DIR"
git worktree add "$WORKTREE" -b "$BRANCH"
echo "Worktree: $WORKTREE"
echo "Branch:   $BRANCH"
```

Report the worktree path to the user.

---

## Phase 3: Delegate to Specialized Agents (in order)

### Step 1 — Feature Developer (implements)

Hand off to the **feature-developer** agent with this exact context:

> **Task for feature-developer agent:**
>
> Implement the following feature in the worktree at `{WORKTREE}` on branch `{BRANCH}`.
>
> **Feature:** {feature name}
> **Goal:** {one-sentence goal}
>
> **Acceptance Criteria:**
> - {criterion 1}
> - {criterion 2}
>
> **Entities to create/modify:** {entity list}
> **Service file:** {service name}
> **Fiori app path:** {app/service-name/}
>
> Follow the SAP CAP layer order strictly:
> 1. Data model (`db/`)
> 2. Service definition (`srv/*.cds`)
> 3. Handler (`srv/*.ts`)
> 4. Fiori annotations (`app/*/annotations.cds`)
> 5. Integration tests (`test/`) — TDD, write tests first
>
> All file paths must use the absolute worktree path `{WORKTREE}/...`.
> Signal completion with test results and lint status.

Wait for the feature-developer to report completion before proceeding.

### Step 2 — Code Reviewer (validates)

Hand off to the **code-reviewer** agent:

> **Task for code-reviewer agent:**
>
> Review the implementation on branch `{BRANCH}` in worktree `{WORKTREE}`.
>
> Run this diff to see all changes:
> ```bash
> git -C "{WORKTREE}" diff main
> ```
>
> Apply the full SAP CAP review checklist:
> - CDS data model conventions (managed aspects, types, compositions)
> - Handler patterns (req.reject, CQL, no raw SQL)
> - OData service design (@readonly, @Capabilities)
> - Fiori annotations (@Common.Label, @UI.HeaderInfo, @Common.ValueList)
> - TypeScript strictness (no any, proper types)
> - Error handling (no silent errors, meaningful status codes)
> - Test coverage (happy path + error cases)
> - Security (@requires, @restrict, parameterized queries)
>
> Report findings grouped by: **Critical** / **Warning** / **Suggestion**.
> After addressing Criticals, signal ready-for-PR.

### Step 3 — GitHub Workflow (ships)

After code-reviewer signals approval, hand off to **github-workflow** agent:

> **Task for github-workflow agent:**
>
> Push branch `{BRANCH}` from worktree `{WORKTREE}` and create a pull request.
>
> ```bash
> git -C "{WORKTREE}" push -u origin "{BRANCH}"
> ```
>
> PR title format: `feat({scope}): {feature description}`
> Link to ticket: `{ticket-id}` (if applicable)
>
> PR body must include:
> - Summary of changes (data model, service, handler, UI, tests)
> - Acceptance criteria checklist (from the ticket)
> - Test results
>
> After creating the PR, clean up the local worktree:
> ```bash
> git worktree remove "{WORKTREE}"
> ```

---

## Phase 4: Progress Tracking

Report status after each agent completes:

```
Orchestrator Status — {feature name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓  Analysis         — Implementation plan ready
✓  Worktree         — {WORKTREE} (branch: {BRANCH})
→  Feature Dev      — implementing [layer X/5]...
   Code Review      — waiting
   GitHub Workflow  — waiting
```

Update as each step completes:

```
✓  Analysis         — Implementation plan ready
✓  Worktree         — ../worktrees/feat-proc-123-approval
✓  Feature Dev      — all 5 layers, tests pass, lint clean
→  Code Review      — reviewing 12 changed files...
   GitHub Workflow  — waiting
```

Final status:

```
✓  Analysis         — Feature scoped and planned
✓  Worktree         — created and cleaned up
✓  Feature Dev      — implemented (5 layers, 8 tests passing)
✓  Code Review      — approved (0 critical, 2 warnings resolved)
✓  PR Created       — #42: feat(procurement): add approval workflow
   https://github.com/org/repo/pull/42
```

---

## Phase 5: Parallel Features (Advanced)

When multiple independent features can run concurrently, create separate worktrees and spawn feature-developer agents in parallel:

```bash
# Feature A
git worktree add ../worktrees/feat-supplier-portal -b feat/PROC-124-supplier-portal

# Feature B (independent of A)
git worktree add ../worktrees/feat-budget-check -b feat/PROC-125-budget-check
```

Each feature-developer agent works in its own isolated directory. Coordinate via this orchestrator — code-review and PR creation remain sequential per feature.

---

## Error Handling

If the feature-developer reports test failures or lint errors:
1. Relay the specific errors back to feature-developer with context
2. Ask it to fix and re-run checks before moving to code-review
3. Do not proceed to code-review until all checks pass

If code-reviewer reports Critical issues:
1. Relay the specific criticals back to feature-developer
2. Ask it to fix in the worktree and commit the fixes
3. Ask code-reviewer to re-review only the changed files

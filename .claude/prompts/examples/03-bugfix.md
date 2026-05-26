# Example Prompt — Bug Fix

> Use these prompts when a bug is reported. The systematic-debugging skill is
> activated automatically by the skill-eval hook when it detects bug-related keywords.

---

## Simple Bug Fix Prompt

```
Fix this bug: When a PurchaseOrder is rejected, the totalAmount is reset to 0
instead of staying unchanged.

Error observed: After calling the reject action, GET on the order returns
totalAmount: 0 instead of the original value.

The rejection handler is in srv/procurement-service.ts.
Run the systematic-debugging skill to trace the issue.
```

---

## Structured Bug Report Prompt

```
Bug investigation needed:

**Symptom:**
POST /procurement/PurchaseOrders(ID)/ProcurementService.submitForApproval
returns HTTP 500 instead of 422 when the order has no items.

**Expected behavior:**
422 Unprocessable Entity with message "Cannot submit an empty purchase order"

**Reproduction:**
1. Create a PurchaseOrder with no items
2. POST the submitForApproval action

**Environment:**
- Local dev via `cds watch`
- SQLite in-memory database

**Investigation priority:** High — blocks the approval workflow.

Steps:
1. Use the systematic-debugging skill
2. Create a worktree for the fix: git worktree add ../worktrees/fix/empty-order-submission -b fix/empty-order-submission
3. Write a failing test that reproduces the bug (TDD)
4. Fix the handler
5. Verify test passes
6. Run code-reviewer agent on the fix
7. Create a PR with github-workflow agent
```

---

## Production Incident Prompt

```
URGENT: Production incident — purchase orders with totalAmount > 100,000 are
being approved without budget validation.

Context:
- Budget validation was added in PR #38 (feat: add budget validation)
- Only amounts > 100k are affected — smaller amounts validate correctly
- First noticed in production 2 hours ago

Debug and fix:
1. Locate the budget validation logic in the handler
2. Identify why large amounts bypass validation (check Decimal precision, JS number overflow)
3. Create a worktree: git worktree add ../worktrees/fix/budget-overflow -b fix/budget-decimal-overflow
4. Write a failing test that reproduces the issue with amount 150000.00
5. Fix the root cause (likely Decimal(15,2) vs JavaScript number precision issue)
6. Run all budget-related tests
7. code-reviewer agent reviews the fix
8. github-workflow agent creates a hotfix PR targeting main
```

---

## Debugging Approach (Systematic)

Claude Code activates the `systematic-debugging` skill automatically on bug prompts.
The skill follows this four-phase process:

### Phase 1 — Isolate
- Identify the failing HTTP request (method, path, body, response)
- Check CAP logs: `cds watch` output shows `[odata]` and `[db]` log lines
- Confirm which handler fires (`before`, `on`, `after` + entity + event)

### Phase 2 — Trace
- Read the handler code path step by step
- Check what `req.data`, `req.params[0]`, and `req.user` contain at the failure point
- Check DB state before and after the handler runs

### Phase 3 — Hypothesize
- Form 2-3 hypotheses about the root cause
- Write a failing test that targets the most likely hypothesis
- The test must fail before the fix and pass after

### Phase 4 — Fix and Verify
- Fix the root cause (not a workaround)
- Run all related tests — not just the new one
- Run `npx cds-lint` and `npx tsc --noEmit`

---

## What to Avoid in Bug Fixes

- Do not fix symptoms without understanding the root cause
- Do not add `try/catch` that silently swallows the error
- Do not add null checks without understanding why the value is null
- Do not use `as any` to bypass TypeScript errors in a fix
- Always add a regression test — bugs without tests come back

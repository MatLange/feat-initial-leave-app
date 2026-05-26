# Example Prompt — New SAP CAP Feature

> Copy this prompt and paste it into Claude Code.
> Fill in the acceptance criteria from your ticket or requirements document.

---

## Prompt (copy from here)

```
/orchestrate Add supplier evaluation to the Procurement Management app

Context:
- We need a way to rate and evaluate suppliers after purchase orders are completed
- Ratings are 1–5 stars with a mandatory comment
- Each supplier should show an average rating on their detail page

Acceptance Criteria:
- [ ] New CDS entity SupplierEvaluations with fields: supplier (Association), 
      rating (Integer 1–5), comment (String(500) mandatory), evaluatedAt (DateTime)
- [ ] Validation: rating must be between 1 and 5, comment is mandatory
- [ ] Validation: only one evaluation per completed PurchaseOrder (no duplicates)
- [ ] Custom action: addEvaluation(supplierID, orderID, rating, comment)
- [ ] Calculated field: averageRating on Suppliers entity (rounds to 1 decimal)
- [ ] Fiori: Evaluations tab on Supplier object page showing all evaluations
- [ ] Fiori: Average rating shown in Supplier list (LineItem)
- [ ] Tests: happy path + duplicate check + rating-out-of-range rejection
```

---

## What This Does

The `/orchestrate` command:

1. Creates an isolated git worktree at `../worktrees/feat-add-supplier-evaluation`
2. Delegates to **feature-developer** to implement:
   - `db/supplier-evaluations.cds` — new entity with association to Suppliers
   - `srv/procurement-service.cds` — adds action `addEvaluation`
   - `srv/procurement-service.ts` — implements validation and action handler
   - `app/suppliers/annotations.cds` — adds Evaluations facet and averageRating to LineItem
   - `test/supplier-evaluations.test.ts` — integration tests (TDD)
3. Delegates to **code-reviewer** to check against SAP CAP standards
4. Delegates to **github-workflow** to push and create a PR

## Alternative: Direct Feature Developer

If you want to skip the orchestrator and just start implementation:

```
Implement the supplier evaluation feature in a new git worktree.

Feature:
- Entity: SupplierEvaluations (supplier Association, rating Integer 1-5, 
  comment String(500), evaluatedAt DateTime managed)
- Action: addEvaluation(supplierID, rating, comment) on ProcurementService
- Validation: rating 1-5, comment required, one per order
- Fiori: Evaluations tab on Suppliers object page
- Tests: all scenarios (TDD — write tests first)

Start by creating the worktree, then implement layer by layer:
db → srv.cds → srv.ts → annotations → tests
```

## What Good Output Looks Like

After the feature-developer finishes, you should see:

```
Implementation complete in worktree ../worktrees/feat-add-supplier-evaluation
Branch: feat/add-supplier-evaluation

Layers completed:
✓ db/supplier-evaluations.cds — SupplierEvaluations entity
✓ srv/procurement-service.cds — addEvaluation action declared
✓ srv/procurement-service.ts  — handler with validation
✓ app/suppliers/annotations.cds — Evaluations facet, averageRating column
✓ test/supplier-evaluations.test.ts — 5 tests, all passing

npm test: 5 passed, 0 failed
npx cds-lint: 0 errors
npx tsc --noEmit: 0 errors

Ready for code review.
```

# Implementation Tasks: Leave Request Manager

> Derived from plan.md — ordered, actionable tasks for the feature-developer agent.
> Each task corresponds to one git commit. Work inside the worktree at
> `../worktrees/feat-initial-leave-app/`.

---

## Pre-Implementation

- [x] Confirm spec.md status is APPROVED
- [x] Confirm no naming conflicts with existing CDS models (`namespace leavemanager` is unused)
- [x] Create git worktree: `git worktree add ../worktrees/feat-initial-leave-app -b feat/initial-leave-app`

---

## Layer 1 — Data Model

- [x] Create `db/leave-requests.cds`
  - Add `namespace leavemanager`
  - Define `type LeaveStatus : String(20) enum { Draft; Submitted; Approved; Rejected; }`
  - Define `type LeaveType : String(20) enum { Annual; Sick; Special; }`
  - Define `entity Employees : cuid, managed` with name, email, department
  - Define `entity LeaveRequests : cuid, managed` with all fields
  - Use `virtual durationDays : Integer @readonly` (modifier before name)
  - Use `leaveType : LeaveType` (not `type` to avoid keyword conflict)
- [x] Run `npx cds-lint` — must pass with no errors
- [x] Commit: `feat(leavemanager): add LeaveRequests and Employees CDS data model`

---

## Layer 2 — Service Definition

- [x] Create `srv/leave-service.cds`
  - `@requires: 'any'` on the service
  - `@odata.draft.enabled` on `LeaveRequests` projection
  - Declare `submit()`, `approve()`, `reject(reason: String(500))` actions
  - Use `@Capabilities.DeleteRestrictions.Deletable: false` on `Employees` (NOT `@readonly`)
- [x] Run `npx cds-lint` — must pass
- [x] Commit: `feat(leavemanager): expose LeaveService with submit/approve/reject actions`

---

## Layer 3 — Handler (TDD: write tests first)

- [x] Write test skeleton in `test/leave-service.test.ts` (factory + 9 test cases)
  - `getMockLeaveRequest(overrides?)` factory
  - Tests for: create, submit happy, submit error, approve happy, approve error,
    reject happy, reject no reason, date past, date end-before-start
- [x] Create `srv/leave-service.ts`
  - `class LeaveService extends cds.ApplicationService`
  - Register `before(['CREATE', 'UPDATE'], 'LeaveRequests', validateDates)`
  - `validateDates`: reject if start in past OR end before start (always `return req.reject(...)`)
  - `on('submit')`: Draft → Submitted only
  - `on('approve')`: Submitted → Approved, store `approver`
  - `on('reject')`: Submitted → Rejected, require `reason`
  - `after(['READ'])`: compute `durationDays`
- [x] Run `npm test` — all 9 tests must pass
- [x] Run `npx tsc --noEmit` — no type errors
- [x] Commit: `feat(leavemanager): implement status machine and date validation handler`

---

## Layer 4 — Fiori Annotations

- [x] Create `app/leave-requests/index.cds` with `using` statement
- [x] Create `app/leave-requests/annotations.cds`
  - `UI.LineItem`: employee.name, startDate, endDate, leaveType, durationDays, status
  - `UI.HeaderInfo`: TypeName, Title (employee name), Description (leaveType)
  - `UI.SelectionFields`: status, leaveType, employee_ID
  - `UI.Facets`: General (dates, type, days, reason) + Status (status, approver, rejectionReason)
  - Status criticality: Approved=3 (green), Rejected=1 (red), Submitted=2 (orange), default=0
  - `@Common.Label` on all elements
  - `@Common.ValueListWithFixedValues` on `leaveType`
- [x] Run `npx cds-lint` — must pass
- [x] Commit: `feat(leavemanager): add Fiori List Report and Object Page annotations`

---

## Layer 5 — Final Verification

- [x] Run full test suite: `npm test` — all tests pass
- [x] Run `npx cds-lint` — clean
- [x] Run `npx tsc --noEmit` — clean
- [x] Verify all spec.md acceptance criteria are covered by tests

---

## Spec Compliance Checklist

- [x] Create with status Draft ✓ (test 1)
- [x] `submit()` Draft → Submitted, date validation ✓ (tests 2, 8, 9)
- [x] `submit()` rejects non-Draft ✓ (test 3)
- [x] `approve()` Submitted → Approved ✓ (test 4)
- [x] `approve()` rejects non-Submitted ✓ (test 5)
- [x] `reject(reason)` Submitted → Rejected ✓ (test 6)
- [x] `reject()` without reason → 400 ✓ (test 7)
- [x] `durationDays` returned as virtual field ✓
- [x] Fiori List Report with criticality colors ✓
- [x] Fiori Object Page with General + Status sections ✓
- [x] 9 integration tests ✓

**Result: All acceptance criteria met. Status → IMPLEMENTED.**

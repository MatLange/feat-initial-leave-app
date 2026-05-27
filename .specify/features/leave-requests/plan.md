# Technical Plan: Leave Request Manager

> Derived from spec.md — SAP CAP layer-by-layer implementation strategy.

## Overview

Two new entities (`Employees`, `LeaveRequests`) with a status machine driven by three
OData bound actions. A virtual computed field `durationDays` is calculated in the handler.
Fiori Elements List Report with criticality-based status colors, and an Object Page
structured into General and Status sections. Full integration test coverage via
`@sap/cds-test`.

---

## Layer 1 — Data Model (`db/leave-requests.cds`)

**Namespace:** `leavemanager`

**Named types** (required because `default` + inline `enum` cannot coexist in CDS):
```cds
type LeaveStatus : String(20) enum { Draft; Submitted; Approved; Rejected; };
type LeaveType   : String(20) enum { Annual; Sick; Special; };
```

**Entities:**
```cds
entity Employees : cuid, managed {
  name       : String(200) @mandatory;
  email      : String(200);
  department : String(100);
}

entity LeaveRequests : cuid, managed {
  employee        : Association to Employees @mandatory;
  startDate       : Date @mandatory;
  endDate         : Date @mandatory;
  leaveType       : LeaveType @mandatory;
  reason          : String(500);
  status          : LeaveStatus default 'Draft';
  approver        : String(100);
  rejectionReason : String(500);
  virtual durationDays : Integer @readonly;  // virtual = modifier before name
}
```

Key decisions:
- `virtual` modifier before field name (not a type keyword)
- `leaveType` not `type` (avoids potential reserved keyword conflict)
- `Employees` is separate entity (not inline) to allow reuse and filtering

---

## Layer 2 — Service Definition (`srv/leave-service.cds`)

```cds
@requires: 'any'
service LeaveService @(path: '/leave') {
  @odata.draft.enabled
  entity LeaveRequests as projection on leavemanager.LeaveRequests
    actions {
      action submit()                    returns LeaveRequests;
      action approve()                   returns LeaveRequests;
      action reject(reason: String(500)) returns LeaveRequests;
    };

  @Capabilities.DeleteRestrictions.Deletable: false
  entity Employees as projection on leavemanager.Employees;
}
```

Key decisions:
- `@requires: 'any'` — minimal auth (production: role-based `@restrict`)
- `@odata.draft.enabled` on `LeaveRequests` for Fiori draft workflow
- `@Capabilities.DeleteRestrictions.Deletable: false` instead of `@readonly` on `Employees`
  — `@readonly` blocks POST which breaks test setup in `beforeAll`
- Actions return the entity to enable UI refresh after action

---

## Layer 3 — Handler (`srv/leave-service.ts`)

**Class:** `LeaveService extends cds.ApplicationService`

**Hooks registered in `init()`:**
```typescript
this.before(['CREATE', 'UPDATE'], 'LeaveRequests', this.validateDates);
this.on('submit',  'LeaveRequests', this.handleSubmit);
this.on('approve', 'LeaveRequests', this.handleApprove);
this.on('reject',  'LeaveRequests', this.handleReject);
this.after(['READ'], 'LeaveRequests', this.computeDurationDays);
```

**Status machine:**
```
Draft → [submit()] → Submitted → [approve()] → Approved
                              → [reject(reason)] → Rejected
```

**Validation (`validateDates`):**
- `startDate` must not be in the past (today or future only)
- `startDate` must be before `endDate`
- Applied on both `CREATE` and `UPDATE`
- Always `return req.reject(...)` — code must not continue after rejection

**`durationDays` computation:**
- Calculated in `after READ` hook as `(endDate - startDate)` in calendar days + 1
- Written as virtual field, not stored in DB

Key decisions:
- `return req.reject(...)` on every rejection to prevent null-dereference on lines below
- TypeScript interface for `LeaveRequest` type (no `any`)
- Arrow functions for handler methods to preserve `this` binding

---

## Layer 4 — Fiori Annotations (`app/leave-requests/annotations.cds`)

**List Report columns:** employee name, startDate, endDate, leaveType, durationDays, status
**Status criticality colors:**
```cds
status @UI.Criticality: {
  $edmJson: { $If: [
    { $Eq: [{ $Path: 'status' }, 'Approved']  }, 3,   // green
    { $Eq: [{ $Path: 'status' }, 'Rejected']  }, 1,   // red
    { $Eq: [{ $Path: 'status' }, 'Submitted'] }, 2,   // orange
    0                                                    // grey
  ]}
}
```

**Object Page sections:**
- General: employee, startDate, endDate, leaveType, durationDays, reason
- Status: status, approver, rejectionReason

**Value lists:** `leaveType` uses `@Common.ValueListWithFixedValues`

---

## Layer 5 — Tests (`test/leave-service.test.ts`)

Test scenarios (9 total):

| # | Scenario | Expected |
|---|----------|---------|
| 1 | Create leave request | 201, status = Draft |
| 2 | Submit Draft request | 200, status = Submitted |
| 3 | Submit non-Draft request | 422 |
| 4 | Approve Submitted request | 200, status = Approved |
| 5 | Approve non-Submitted request | 422 |
| 6 | Reject with reason | 200, status = Rejected |
| 7 | Reject without reason | 400 |
| 8 | Date validation: end before start | 400 |
| 9 | Date validation: start in past | 400 |

Factory: `getMockLeaveRequest(overrides?)` with unique `startDate` per test.

---

## Dependencies & Risks

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | `virtual` syntax — not a type keyword | Use `virtual field : Type` pattern |
| 2 | `default` + inline `enum` CDS limitation | Use named types (`type S : String enum {...}`) |
| 3 | `@readonly` on `Employees` blocks test POST | Use `@Capabilities.DeleteRestrictions.Deletable: false` |
| 4 | `req.reject()` without `return` → null dereference | Always `return req.reject(...)` |
| 5 | Date validation on CREATE only | Apply to `['CREATE', 'UPDATE']` |

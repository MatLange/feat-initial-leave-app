# Feature: Leave Request Manager

> Status: IMPLEMENTED
> Ticket: n/a
> Date: 2026-05-01

## Problem Statement

Employees currently submit leave requests via email or paper forms. There is no central
system for tracking requests, approval status, or historical records. Managers have no
structured overview of team availability. This feature introduces a digital leave request
management system with a structured approval workflow.

## User Stories

- As an **employee**, I want to **submit a leave request with start/end date and reason**
  so that **my manager can review and approve or reject it**
- As an **employee**, I want to **see the current status of all my requests**
  so that **I know whether my leave is approved without having to ask**
- As a **manager**, I want to **approve or reject submitted requests with a reason**
  so that **employees receive structured feedback and the system stays consistent**
- As an **employee**, I want to **choose a leave type (Annual, Sick, Special)**
  so that **the company can track different leave categories separately**

## Acceptance Criteria

- [ ] An employee can create a leave request with: employee reference, start date, end date,
      leave type (Annual/Sick/Special), and optional reason
- [ ] A newly created request has status `Draft`
- [ ] `submit()` action transitions `Draft → Submitted`; validates that start date is before
      end date and not in the past
- [ ] `approve()` action transitions `Submitted → Approved`; stores the approver name
- [ ] `reject(reason)` action transitions `Submitted → Rejected`; reason is mandatory
- [ ] `durationDays` is computed and returned as a virtual read-only field
- [ ] Fiori List Report shows all requests with status color coding:
      Approved = green, Rejected = red, Submitted = orange, Draft = grey
- [ ] Fiori Object Page shows General section (dates, type, reason) and Status section
      (current status, approver/rejection info)
- [ ] Only `Submitted` requests can be approved or rejected (other states → 422)
- [ ] Only `Draft` requests can be submitted (other states → 422)
- [ ] At least 9 integration tests covering happy path and all error cases

## Non-Goals

- No role-based access control in this version (future: `@restrict` for employee vs. manager roles)
- No email notifications on status changes
- No calendar integration or clash detection
- No multi-approver workflows or delegation

## Open Questions

- [x] Should employees be able to edit a `Draft` request? → Yes, PATCH is allowed on Draft
- [x] Can a `Rejected` request be resubmitted? → Out of scope for v1
- [ ] Should `durationDays` exclude weekends? → Not required for v1 (simple calendar days)

## SAP CAP Impact

- **New Entities:** `Employees`, `LeaveRequests`
- **Modified Entities:** none
- **New Actions:** `submit()`, `approve()`, `reject(reason: String)`
- **Services:** `LeaveService` at `/leave`
- **Fiori UI:** `app/leave-requests/` — List Report + Object Page
- **Tests Required:** 9 integration tests (create, submit happy, submit error,
  approve happy, approve error, reject happy, reject no-reason, date validation past,
  date validation end-before-start)

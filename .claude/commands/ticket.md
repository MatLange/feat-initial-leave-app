---
description: Work on a JIRA/Linear ticket end-to-end
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(npm:*), Bash(npx:*), mcp__jira__*, mcp__github__*, mcp__linear__*
---

# Ticket Workflow

Work on ticket: $ARGUMENTS

## Instructions

### 1. Read the Ticket

First, fetch and understand the ticket:

```
Use the JIRA/Linear MCP tools to:
- Get ticket details (title, description, acceptance criteria)
- Check linked tickets or epics
- Review any comments or attachments
```

Summarize:
- What needs to be done
- Acceptance criteria
- Any blockers or dependencies

### 2. Explore the Codebase

Before coding:
- Search for related CDS entities in `db/`
- Find the relevant service definition in `srv/*.cds`
- Locate existing handler files in `srv/`
- Check Fiori annotations in `app/*/annotations.cds`
- Identify files that need changes

### 3. Create a Branch

```bash
git checkout -b {initials}/{ticket-id}-{brief-description}
```

### 4. Implement the Changes

Follow the SAP CAP layer order:
1. **Data model** (`db/`) — CDS entities, types, aspects
2. **Service definition** (`srv/*.cds`) — projections, actions, annotations
3. **Handler** (`srv/*.ts` or `srv/*.js`) — business logic
4. **Fiori annotations** (`app/*/annotations.cds`) — UI configuration
5. **Tests** (`test/`) — integration tests with `@sap/cds-test`

Write tests first (TDD). Make incremental commits per layer.

### 5. Update the Ticket

As you work:
- Add comments with progress updates
- Update status (In Progress → In Review)
- Log any blockers or questions

### 6. Create PR and Link

When ready:
- Run `npm test` and `npx cds-lint` — must pass
- Create PR with `gh pr create`
- Link the PR to the ticket
- Add ticket ID to PR title: `feat(PROJ-123): description`

### 7. If You Find a Bug

If you discover an unrelated bug while working:
1. Create a new ticket with details
2. Link it to the current ticket if related
3. Note it in the PR description
4. Continue with original task

## Example Workflow

```
Me: /ticket PROJ-456

Claude:
1. Fetching PROJ-456 from JIRA...
   Title: Add approval workflow to purchase orders
   Description: Purchase orders above EUR 10,000 need manager approval before being sent
   Acceptance Criteria:
   - [ ] PO status transitions: Draft → Pending Approval → Approved/Rejected
   - [ ] Custom action "submitForApproval" on PurchaseOrders service
   - [ ] Approver field visible in Object Page header
   - [ ] Email notification on status change (via SAP Alert Notification)

2. Searching codebase...
   Found: db/purchase-orders.cds (entity PurchaseOrders)
   Found: srv/purchase-orders-service.cds (service definition)
   Found: srv/purchase-orders-service.ts (handler)
   Found: app/purchase-orders/annotations.cds (Fiori config)

3. Creating branch: jd/PROJ-456-approval-workflow

4. [Implements in order: CDS model → service → handler → annotations → tests]

5. Updating JIRA status to "In Review"...
   Adding comment: "Implementation complete, tests passing, PR ready for review"

6. Creating PR and linking to PROJ-456...
   PR #789 created: feat(PROJ-456): add approval workflow to purchase orders
```

# Example Project — SAP CAP Procurement Management App

> This file describes a complete example SAP CAP project that you can use to
> test the agents and workflows. Paste the "Project Context" block at the start
> of a session to give Claude full project awareness.

---

## Project Overview

**Procurement Management** is a SAP CAP application that manages the full
procurement lifecycle: purchase orders, supplier management, approval workflows,
and budget tracking.

**Stack:**
- SAP CAP (Node.js + TypeScript)
- SAP HANA (production) / SQLite (development)
- SAP Fiori Elements (List Report + Object Page)
- SAP BTP (deployment target)

---

## Data Model (`db/`)

### `db/procurement.cds`
```cds
namespace procurement;
using { cuid, managed } from '@sap/cds/common';
using { Currency, sap.common.Criticality } from '@sap/cds/common';

// ── Suppliers ────────────────────────────────────────────────
entity Suppliers : cuid, managed {
  name           : String(200) @mandatory;
  taxNumber      : String(50);
  email          : String(200);
  phone          : String(50);
  address        : String(500);
  isActive       : Boolean default true;
  purchaseOrders : Association to many PurchaseOrders on purchaseOrders.supplier = $self;
}

// ── Purchase Orders ──────────────────────────────────────────
entity PurchaseOrders : cuid, managed {
  orderNumber    : String(20) @mandatory;
  supplier       : Association to Suppliers @mandatory;
  status         : String(20) default 'Draft'
    @assert.range enum { Draft; PendingApproval; Approved; Rejected; Closed; };
  currency       : Currency;
  totalAmount    : Decimal(15,2);
  requestedDate  : Date;
  approver       : String(100);
  rejectionReason: String(500);
  items          : Composition of many PurchaseOrderItems on items.order = $self;
}

entity PurchaseOrderItems : cuid {
  order       : Association to PurchaseOrders;
  position    : Integer;
  description : String(200) @mandatory;
  quantity    : Decimal(10,3) @mandatory;
  unit        : String(10);
  unitPrice   : Decimal(15,2) @mandatory;
  totalPrice  : Decimal(15,2);
}

// ── Budget ──────────────────────────────────────────────────
entity Budgets : cuid, managed {
  year        : Integer @mandatory;
  department  : String(100) @mandatory;
  amount      : Decimal(15,2) @mandatory;
  currency    : Currency;
  consumed    : Decimal(15,2) default 0;
  remaining   : Decimal(15,2);
}
```

---

## Service Definition (`srv/procurement-service.cds`)

```cds
using procurement from '../db/procurement';

service ProcurementService @(path: '/procurement') {

  entity PurchaseOrders as projection on procurement.PurchaseOrders
    @odata.draft.enabled
    actions {
      action submitForApproval()             returns PurchaseOrders;
      action approve()                       returns PurchaseOrders;
      action reject(reason: String(500))     returns PurchaseOrders;
    };

  entity PurchaseOrderItems as projection on procurement.PurchaseOrderItems;

  @readonly
  entity Suppliers as projection on procurement.Suppliers;

  @readonly
  entity Budgets   as projection on procurement.Budgets;
}
```

---

## Example Feature Requests

Use these as starting prompts for the agents:

### Feature 1: Approval Workflow

```
/orchestrate PROC-101: Add manager approval workflow to purchase orders

Acceptance Criteria:
- [ ] PurchaseOrders status transitions: Draft → PendingApproval → Approved/Rejected
- [ ] Custom action "submitForApproval" — only works from Draft status
- [ ] Custom action "approve" — sets status to Approved, stores approver name
- [ ] Custom action "reject(reason)" — sets status to Rejected, stores reason
- [ ] Business rule: only orders with at least one item can be submitted
- [ ] Fiori: approval action buttons visible on object page header
- [ ] Fiori: status shown with criticality colors (Draft=grey, Pending=orange, Approved=green, Rejected=red)
- [ ] Tests: full state machine coverage (all valid transitions + invalid attempt rejections)
```

### Feature 2: Budget Validation

```
/orchestrate PROC-102: Validate purchase orders against department budgets

Acceptance Criteria:
- [ ] Before approving a PurchaseOrder, check remaining budget for the current year
- [ ] If totalAmount > remaining budget: reject with message showing the deficit
- [ ] After approval: subtract totalAmount from Budgets.consumed
- [ ] After rejection: no budget change
- [ ] Fiori: remaining budget shown in PurchaseOrders list as informational column
- [ ] Tests: within budget (success), over budget (rejection), exact match (success)
```

### Feature 3: Supplier Portal (List Report)

```
/orchestrate PROC-103: Create Supplier management Fiori app

Acceptance Criteria:
- [ ] List Report page for Suppliers with columns: name, email, isActive, #orders
- [ ] Object Page with: general info section, purchase orders tab (read-only list)
- [ ] Filter by: isActive, name search
- [ ] Batch deactivation: select multiple suppliers, action "deactivate"
- [ ] Tests: list returns all active suppliers, deactivate sets isActive=false
```

### Feature 4: Order Item Price Calculation

```
/orchestrate PROC-104: Auto-calculate PurchaseOrderItem total price

Acceptance Criteria:
- [ ] totalPrice = quantity × unitPrice (calculated on CREATE and UPDATE of items)
- [ ] PurchaseOrder.totalAmount = SUM of all item totalPrices (recalculate on item change)
- [ ] Round totalPrice to 2 decimal places
- [ ] Tests: price calculation on create, recalculation on quantity update, order total aggregation
```

---

## Starting a Fresh Session

Paste this at the start of a Claude Code session to load full project context:

```
You are developing a SAP CAP Procurement Management application.

Project structure:
- db/procurement.cds — Suppliers, PurchaseOrders, PurchaseOrderItems, Budgets entities
- srv/procurement-service.cds — ProcurementService (OData V4)
- srv/procurement-service.ts — TypeScript handler
- app/purchase-orders/ — Fiori Elements list report + object page
- app/suppliers/ — Fiori Elements supplier management
- test/ — Integration tests using @sap/cds-test

Stack: SAP CAP Node.js/TypeScript, SAP Fiori Elements, @sap/cds

Key business rules already implemented:
- Order number must be unique
- Items must have positive quantity and unit price
- Only Draft orders can be submitted for approval

I need you to implement: [describe your feature here]

Use the feature-developer agent for implementation. Create a git worktree first.
```

---

## Common Development Tasks

| Task | Command |
|------|---------|
| Start dev server | `cds watch` |
| Run all tests | `npm test` |
| Lint CDS models | `npx cds-lint` |
| Type check | `npx tsc --noEmit` |
| Deploy to BTP | `cf push` (after `cds build`) |
| List worktrees | `git worktree list` |
| New feature (orchestrated) | `/orchestrate <description>` |
| Review PR | `/pr-review <PR#>` |

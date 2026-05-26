---
name: cap-handlers
description: CAP service handlers in Node.js/TypeScript — before/on/after hooks, req/res patterns, CQL queries, actions, and external service calls.
---

# CAP Service Handler Patterns

## Core Rules

1. **`req.reject()`** for unrecoverable errors (returns HTTP 4xx) — **never `throw new Error()`**
2. **`req.error()`** to accumulate multiple validation errors (returns HTTP 400 with error array)
3. **Always use CQL** (`SELECT.from`, `INSERT.into`, etc.) — no raw SQL strings
4. **`before`** hooks for validation, **`on`** for logic override, **`after`** for enrichment
5. **TypeScript handlers** must use `@sap/cds` types — no `any`

## File Structure

```
srv/
├── cat-service.cds          # Service definition (entities, actions, annotations)
├── cat-service.ts           # TypeScript handler (or .js for JavaScript)
├── cat-service-validation.ts # Optional: extracted validation logic
└── lib/
    └── helpers.ts           # Shared handler utilities
```

## Service Handler Setup (TypeScript)

```typescript
import cds from '@sap/cds';
import type { Request, Service } from '@sap/cds/apis/services';

module.exports = class CatalogService extends cds.ApplicationService {
  async init() {
    const { Orders, OrderItems } = this.entities;

    this.before('CREATE', Orders, this.validateOrder);
    this.on('submitForApproval', Orders, this.handleSubmitForApproval);
    this.after('READ', Orders, this.enrichOrders);

    return super.init();
  }

  private async validateOrder(req: Request) {
    const { orderNumber, amount } = req.data;
    if (!orderNumber?.trim()) req.error('msg_missing_order_number');
    if (amount <= 0) req.error(400, 'Amount must be positive');
    // req.error() accumulates errors and rejects at end of before phase
  }

  private async handleSubmitForApproval(req: Request) {
    const { ID } = req.params[0] as { ID: string };
    const order = await SELECT.one.from('Orders').where({ ID });
    if (!order) req.reject(404, `Order ${ID} not found`);
    if (order.status !== 'Draft') req.reject(409, `Order ${ID} is not in Draft status`);

    await UPDATE('Orders').set({ status: 'PendingApproval' }).where({ ID });
    return { status: 'PendingApproval' };
  }

  private async enrichOrders(orders: object[], req: Request) {
    // after hooks receive the result — enrich without re-querying when possible
    for (const order of Array.isArray(orders) ? orders : [orders]) {
      (order as any).displayName = `Order #${(order as any).orderNumber}`;
    }
  }
};
```

## Service Handler Setup (JavaScript)

```javascript
const cds = require('@sap/cds');

module.exports = class CatalogService extends cds.ApplicationService {
  async init() {
    this.before('CREATE', 'Orders', async (req) => {
      if (!req.data.orderNumber) req.error('Order number is required');
    });

    this.on('cancelOrder', 'Orders', async (req) => {
      const [{ ID }] = req.params;
      const order = await SELECT.one.from('Orders').where({ ID });
      if (!order) return req.reject(404, `Order not found`);
      await UPDATE('Orders').set({ status: 'Cancelled' }).where({ ID });
    });

    return super.init();
  }
};
```

## Hook Types

| Hook | When | Use For |
|------|------|---------|
| `before` | Before DB operation | Input validation, authorization checks |
| `on` | Instead of default DB operation | Custom logic, replacing default CRUD |
| `after` | After DB operation | Enrichment, side effects, notifications |

## CQL Query Patterns

```typescript
const { Orders, OrderItems } = cds.entities('my.namespace');

// SELECT with conditions
const order = await SELECT.one.from(Orders).where({ ID: orderId });
const items = await SELECT.from(OrderItems).where({ order_ID: orderId });

// SELECT with columns and joins
const result = await SELECT.from(Orders, ['ID', 'orderNumber', 'status'])
  .where({ status: 'Open' })
  .orderBy('createdAt desc')
  .limit(50);

// INSERT
await INSERT.into(Orders).entries({ orderNumber: 'ORD-001', status: 'Draft' });

// UPDATE
await UPDATE(Orders).set({ status: 'Submitted' }).where({ ID: orderId });

// DELETE
await DELETE.from(OrderItems).where({ order_ID: orderId });

// Using req context for implicit transaction
const tx = cds.transaction(req);
await tx.run(UPDATE(Orders).set({ status: 'Done' }).where({ ID: orderId }));
```

## Error Handling

```typescript
// req.reject() — stops processing immediately, returns HTTP error
srv.before('UPDATE', 'Orders', async (req) => {
  const order = await SELECT.one.from('Orders').where({ ID: req.data.ID });
  if (!order) req.reject(404, 'Order not found');            // 404 Not Found
  if (order.status === 'Delivered') req.reject(409, 'Cannot update delivered orders');  // 409 Conflict
});

// req.error() — accumulates errors, all reported at once
srv.before('CREATE', 'Orders', (req) => {
  if (!req.data.orderNumber) req.error(400, 'Order number is required', 'orderNumber');
  if (!req.data.customerId)  req.error(400, 'Customer is required', 'customerId');
  // Both errors returned together in HTTP 400 response
});

// WRONG - never use throw in handlers
srv.before('CREATE', 'Orders', (req) => {
  if (!req.data.orderNumber) throw new Error('Missing order number');  // Bad!
});
```

### HTTP Status Code Guide

| Code | When |
|------|------|
| 400 | Validation error, missing required fields |
| 401 | Not authenticated |
| 403 | Not authorized for this operation |
| 404 | Entity not found |
| 409 | Business rule conflict (duplicate, wrong state) |
| 422 | Semantic error (valid format, invalid business value) |

## Custom Actions and Functions

### In `.cds` (service definition)
```cds
service OrderService {
  entity Orders as projection on db.Orders actions {
    action submitForApproval() returns { status: String };
    action cancel(reason: String);
  };
  function getOrderSummary(month: Integer, year: Integer) returns OrderSummary;
}
```

### In handler
```typescript
// Bound action (on specific entity instance)
this.on('submitForApproval', 'Orders', async (req) => {
  const [{ ID }] = req.params;  // entity key from URL
  // ...
});

// Unbound function (no entity context)
this.on('getOrderSummary', async (req) => {
  const { month, year } = req.data;
  // ...
  return { totalOrders: 42, totalValue: 12500.00 };
});
```

## External Service Calls

```typescript
// Connect to external OData service
const externalSvc = await cds.connect.to('ExternalCatalogService');

srv.on('READ', 'Products', async (req, next) => {
  try {
    // Forward request to external service
    const products = await externalSvc.run(req.query);
    return products;
  } catch (err) {
    req.reject(502, `Failed to fetch products: ${err.message}`);
  }
});
```

## Using `req` Context

```typescript
srv.on('CREATE', 'Orders', async (req) => {
  const userId = req.user.id;           // current user
  const locale = req.locale;            // request locale
  const data = req.data;                // payload
  const params = req.params;            // entity keys (bound actions)
  const query = req.query;              // CQL query object (READ)
  const target = req.target;            // target entity definition
});
```

## Messaging / Events

```typescript
// Emit event after operation
srv.after('CREATE', 'Orders', async (order, req) => {
  await srv.emit('OrderCreated', { ID: order.ID, orderNumber: order.orderNumber });
});

// Subscribe to events from other services
const messaging = await cds.connect.to('messaging');
messaging.on('OrderApproved', async (msg) => {
  const { orderId } = msg.data;
  await UPDATE('Orders').set({ status: 'Approved' }).where({ ID: orderId });
});
```

## Anti-Patterns

```typescript
// WRONG - raw SQL injection risk
await cds.db.run(`SELECT * FROM Orders WHERE id = '${req.data.id}'`);

// CORRECT - CQL parameterized
await SELECT.one.from('Orders').where({ ID: req.data.id });


// WRONG - throw instead of req.reject
throw new Error('Order not found');

// CORRECT
req.reject(404, 'Order not found');


// WRONG - business logic in CDS file
// In .cds:  @computed: true  (not a real feature — logic belongs in handler)

// CORRECT - logic in handler
srv.after('READ', 'Orders', (orders) => {
  for (const o of orders) o.isOverdue = new Date(o.dueDate) < new Date();
});
```

## Integration with Other Skills

- **cds-data-model**: Entities and types that handlers operate on
- **cap-testing**: Integration tests verify handler behavior
- **fiori-elements**: Actions defined in handlers are surfaced via Fiori annotations
- **typescript-conventions**: Type safety in handler code

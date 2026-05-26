---
name: testing-patterns
description: CAP integration test patterns with @sap/cds-test, Jest, factory functions, and TDD workflow. Use when writing tests for CAP services, handlers, or OData endpoints.
---

# Testing Patterns for SAP CAP

## Testing Philosophy

**Test-Driven Development (TDD):**
- Write failing test FIRST
- Implement minimal handler code to pass
- Refactor after green
- Never write production handler code without a failing test

**Behavior-Driven Testing:**
- Test OData endpoints and service behavior, not internal implementation
- Focus on HTTP responses and data state
- Avoid testing internal CDS queries directly
- Use descriptive test names that describe business behavior

**Factory Pattern:**
- Create `getMockOrder(overrides?)` functions for test data
- Provide sensible defaults matching CDS entity structure
- Allow overriding specific properties

## Test Setup with `@sap/cds-test`

```javascript
// test/order-service.test.js
const cds = require('@sap/cds');
const { GET, POST, PUT, PATCH, DELETE, expect } = cds.test().in(__dirname, '..');

// cds.test() starts an in-process CDS server — no external server needed
```

### With SQLite in-memory database (default)

```javascript
const cds = require('@sap/cds');
const { GET, POST, PATCH, expect } = cds.test().in(__dirname, '..');
```

### With specific service and user

```javascript
const { GET } = cds.test().in(__dirname, '..')
  .as({ id: 'alice@example.com', roles: ['Admin'] });
```

## Test Structure

```javascript
describe('OrderService', () => {
  beforeEach(async () => {
    // Insert seed data for each test
    const { Orders } = cds.entities('my.namespace');
    await INSERT.into(Orders).entries(getMockOrder());
  });

  describe('GET /Orders', () => {
    it('should return all orders', async () => {
      const { data } = await GET('/odata/v4/orders/Orders');
      expect(data.value).to.have.length.greaterThan(0);
    });

    it('should filter by status', async () => {
      const { data } = await GET("/odata/v4/orders/Orders?$filter=status eq 'Open'");
      expect(data.value.every(o => o.status === 'Open')).to.be.true;
    });
  });

  describe('POST /Orders', () => {
    it('should create an order and return 201', async () => {
      const payload = getMockOrder({ orderNumber: 'ORD-NEW-001' });
      const { status, data } = await POST('/odata/v4/orders/Orders', payload);
      expect(status).to.equal(201);
      expect(data.orderNumber).to.equal('ORD-NEW-001');
    });

    it('should reject duplicate order number with 409', async () => {
      const payload = getMockOrder({ orderNumber: 'ORD-EXISTING' });
      await POST('/odata/v4/orders/Orders', payload);
      const { status } = await POST('/odata/v4/orders/Orders', payload)
        .catch(err => err.response);
      expect(status).to.equal(409);
    });

    it('should reject missing order number with 400', async () => {
      const { status } = await POST('/odata/v4/orders/Orders', {})
        .catch(err => err.response);
      expect(status).to.equal(400);
    });
  });

  describe('Action: submitForApproval', () => {
    it('should transition order from Draft to PendingApproval', async () => {
      // Arrange
      const order = getMockOrder({ status: 'Draft' });
      const { data: created } = await POST('/odata/v4/orders/Orders', order);

      // Act
      const { status, data } = await POST(
        `/odata/v4/orders/Orders(${created.ID})/OrderService.submitForApproval`
      );

      // Assert
      expect(status).to.equal(200);
      expect(data.status).to.equal('PendingApproval');
    });

    it('should reject if order is not in Draft status', async () => {
      const order = getMockOrder({ status: 'Approved' });
      const { data: created } = await POST('/odata/v4/orders/Orders', order);

      const { status } = await POST(
        `/odata/v4/orders/Orders(${created.ID})/OrderService.submitForApproval`
      ).catch(err => err.response);

      expect(status).to.equal(409);
    });
  });
});
```

## Factory Pattern for Test Data

```javascript
// test/factories/order.factory.js
const { v4: uuidv4 } = require('uuid');

const getMockOrder = (overrides = {}) => ({
  ID: uuidv4(),
  orderNumber: `ORD-TEST-${Date.now()}`,
  status: 'Draft',
  totalAmount: 1000.00,
  currency_code: 'EUR',
  customer_ID: 'CUST-001',
  ...overrides
});

const getMockOrderItem = (orderId, overrides = {}) => ({
  ID: uuidv4(),
  order_ID: orderId,
  product_ID: 'PROD-001',
  quantity: 1,
  unitPrice: 100.00,
  ...overrides
});

module.exports = { getMockOrder, getMockOrderItem };
```

## TypeScript Factory Pattern

```typescript
// test/factories/order.factory.ts
import { v4 as uuidv4 } from 'uuid';

interface OrderData {
  ID: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency_code: string;
  customer_ID: string;
}

const getMockOrder = (overrides: Partial<OrderData> = {}): OrderData => ({
  ID: uuidv4(),
  orderNumber: `ORD-TEST-${Date.now()}`,
  status: 'Draft',
  totalAmount: 1000.00,
  currency_code: 'EUR',
  customer_ID: 'CUST-001',
  ...overrides
});

export { getMockOrder };
```

## Mocking External Services

```javascript
// Mock an external OData service
jest.mock('@sap/cds', () => {
  const original = jest.requireActual('@sap/cds');
  return {
    ...original,
    connect: {
      ...original.connect,
      to: jest.fn().mockResolvedValue({
        run: jest.fn().mockResolvedValue([{ ID: 'EXT-001', name: 'External Product' }])
      })
    }
  };
});
```

## Testing Authorization

```javascript
describe('Authorization', () => {
  it('should deny unauthenticated access', async () => {
    const { status } = await GET('/odata/v4/orders/Orders')
      .catch(err => err.response);
    expect(status).to.equal(401);
  });

  it('should deny access without Admin role', async () => {
    const { status } = await cds.test().in(__dirname, '..')
      .as({ id: 'viewer@test.com', roles: ['Viewer'] })
      .DELETE(`/odata/v4/orders/Orders(some-id)`)
      .catch(err => err.response);
    expect(status).to.equal(403);
  });
});
```

## Testing CDS Events / Messaging

```javascript
it('should emit OrderCreated event after create', async () => {
  const emitted = [];
  cds.on('OrderCreated', (msg) => emitted.push(msg));

  await POST('/odata/v4/orders/Orders', getMockOrder());

  expect(emitted).to.have.length(1);
  expect(emitted[0].data).to.include({ status: 'Draft' });
});
```

## Anti-Patterns

```javascript
// WRONG - testing internal CDS queries directly
it('test', async () => {
  const result = await cds.db.run(SELECT.from('Orders'));
  expect(result.length).to.equal(5);
});

// CORRECT - test via OData endpoint (the actual contract)
it('should return all orders', async () => {
  const { data } = await GET('/odata/v4/orders/Orders');
  expect(data.value).to.have.length(5);
});


// WRONG - hardcoded test data without factory
it('test', async () => {
  await POST('/odata/v4/orders/Orders', {
    ID: '00000000-0000-0000-0000-000000000001',
    orderNumber: 'ORD-001',
    // missing fields...
  });
});

// CORRECT - factory with defaults
it('test', async () => {
  await POST('/odata/v4/orders/Orders', getMockOrder({ orderNumber: 'ORD-001' }));
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest test/order-service.test.js

# Run in watch mode
npx jest --watch
```

## Integration with Other Skills

- **cap-handlers**: Write test that reproduces handler bug before fixing
- **systematic-debugging**: Create failing test to capture bug, then investigate root cause
- **cds-data-model**: Understand entity structure for accurate factory data

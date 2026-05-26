---
name: cds-data-model
description: CDS entity definitions, associations, compositions, aspects, and data annotations. Use when designing the data model, adding entities, or working with db/ layer files.
---

# CDS Data Model Patterns

## Core Rules

1. **ALWAYS declare a namespace** at the top of every `.cds` file
2. **ALWAYS use `cuid` and `managed` aspects** instead of hand-coding `ID`, `createdAt`, etc.
3. **Compositions** for owned children, **Associations** for references to other aggregates
4. **Never use raw SQL types** — use CDS built-in types
5. **`@assert.range` / `@assert.notNull`** for DB-level constraints

## File Structure

```
db/
├── schema.cds          # Core entity definitions
├── types.cds           # Shared types and aspects
└── data/
    ├── my.Namespace.Entity.csv   # Seed data
    └── my.Namespace.Config.csv
```

## Namespace and Imports

```cds
namespace my.namespace;

using { cuid, managed, temporal } from '@sap/cds/common';
using { Currency, Country, Language } from '@sap/cds/common';
```

## Managed Aspects

Always prefer managed aspects over hand-coding standard fields:

```cds
// CORRECT - use managed aspects
entity Orders : cuid, managed {
  orderNumber : String(20);
  status      : String(20);
}
// Provides: ID (UUID), createdAt, createdBy, modifiedAt, modifiedBy

// WRONG - hand-coded standard fields
entity Orders {
  ID          : UUID;
  createdAt   : Timestamp;
  createdBy   : String(100);
  modifiedAt  : Timestamp;
  modifiedBy  : String(100);
}
```

### Available Aspects from `@sap/cds/common`

| Aspect | Provides |
|--------|----------|
| `cuid` | `ID : UUID` (generated key) |
| `managed` | `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy` |
| `temporal` | `validFrom`, `validTo` (time-travel queries) |

## Entity Definition Patterns

### Basic Entity

```cds
entity Products : cuid, managed {
  name        : localized String(200) @mandatory;
  description : localized String(1000);
  price       : Decimal(10, 2);
  currency    : Currency;
  stock       : Integer default 0;
  isActive    : Boolean default true;
  category    : Association to Categories;
}
```

### Enum via `@assert.range`

```cds
entity Orders : cuid, managed {
  status : String(20) @assert.range enum {
    Draft;
    Submitted;
    Approved;
    Rejected;
    Delivered;
  };
}
```

### Localized Fields

```cds
// CORRECT - CDS localization (generates _texts table automatically)
entity Categories : cuid {
  name        : localized String(100);
  description : localized String(500);
}

// WRONG - manual translation table
entity Categories { ID : UUID; }
entity Categories_texts { ID : UUID; locale : String; name : String; }
```

## Associations vs Compositions

### Association — reference to another aggregate

```cds
entity Orders : cuid, managed {
  customer    : Association to Customers;     // reference, not owned
  salesOrg    : Association to SalesOrgs;
}
```

### Composition — owned children (cascade delete)

```cds
entity Orders : cuid, managed {
  items       : Composition of many OrderItems on items.order = $self;
  attachments : Composition of many Attachments on attachments.order = $self;
}

entity OrderItems : cuid {
  order       : Association to Orders;   // back-link
  product     : Association to Products;
  quantity    : Integer @assert.range: [1, 9999];
  unitPrice   : Decimal(10, 2);
}
```

### Many-to-Many via Link Entity

```cds
entity Products : cuid, managed {
  tags : Composition of many Products.Tags on tags.product = $self;
}

entity Products.Tags {
  key product : Association to Products;
  key tag     : Association to Tags;
}
```

## CDS Types Reference

| CDS Type | Use For |
|----------|---------|
| `String(n)` | Fixed max-length text |
| `LargeString` | Unlimited text (CLOB) |
| `Integer` | Whole numbers |
| `Integer64` | Large integers |
| `Decimal(p, s)` | Monetary/precise values |
| `Double` | Floating point |
| `Boolean` | True/false flags |
| `Date` | Calendar date |
| `Time` | Time of day |
| `DateTime` | Date + time (seconds precision) |
| `Timestamp` | Date + time (microsecond precision) |
| `UUID` | 36-char UUID |
| `LargeBinary` | Blob/attachments |

## Annotations for Validation

```cds
entity Contracts : cuid, managed {
  contractNumber : String(20) @mandatory;
  value          : Decimal(15, 2) @assert.range: [0.00, 9999999.99];
  startDate      : Date;
  endDate        : Date;
  status         : String(10) @assert.range enum { Active; Expired; Cancelled; };
  @assert.notNull
  responsible    : Association to Employees;
}
```

## Extending Entities

```cds
// Extend base entity (e.g., from a reuse library)
extend entity Products with {
  customField1 : String(50);
  customField2 : Decimal(10, 2);
}

// Add annotations to existing elements
annotate Products with {
  name @Common.Label: 'Product Name';
  price @Measures.ISOCurrency: currency_code;
}
```

## Custom Types and Aspects

```cds
// Reusable aspect
aspect Address {
  street  : String(100);
  city    : String(50);
  postal  : String(10);
  country : Country;
}

// Custom type
type Status : String(20) enum {
  Open; InProgress; Done;
}

// Use in entities
entity Projects : cuid, managed {
  billingAddress : Address;  // inline aspect
  status         : Status;
}
```

## Temporal Data

```cds
// Time-travel: CDS generates validFrom/validTo and handles history
entity Prices : temporal {
  key product  : Association to Products;
  key currency : Currency;
  amount       : Decimal(10, 2);
}
// Usage: SELECT from Prices WHERE product_ID = 'x' AT ('2024-01-01')
```

## Projections / Views

```cds
// Read-only projection for the service layer (never expose raw DB entities)
entity OrdersView as projection on Orders {
  *,
  customer.name as customerName,
  items.product.name as productNames
}
```

## Anti-Patterns

```cds
// WRONG - raw SQL types
entity X { col1 : VARCHAR(100); col2 : INT; }

// CORRECT - CDS types
entity X { col1 : String(100); col2 : Integer; }


// WRONG - hand-coded audit fields
entity X { createdAt : Timestamp; createdBy : String; }

// CORRECT - managed aspect
entity X : cuid, managed { ... }


// WRONG - exposing DB entity directly in service
service S { entity Orders as projection on db.Orders; }

// CORRECT - explicit projection with only needed fields
service S {
  entity Orders as projection on db.Orders {
    ID, orderNumber, status, customer.name as customerName
  };
}
```

## Integration with Other Skills

- **cap-handlers**: Handlers implement business logic on top of these entities
- **fiori-elements**: UI annotations reference these entity elements
- **cap-testing**: Tests operate on these entities via the service layer

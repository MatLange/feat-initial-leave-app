# SAP CAP Project Constitution

> Governing principles for this project. All specs, plans, and implementations must align
> with these principles. Review on major architectural changes — not on every feature.

---

## Philosophy

**Spec before code.** Features begin as specifications. The spec defines the contract;
the implementation fulfills it. An agent that implements without reading the spec ships
the wrong thing faster.

**Predictable over clever.** Follow SAP CAP conventions even when a workaround looks
easier. The framework's defaults exist for a reason — OData compliance, multitenancy,
extensibility.

**Vertical slices, not horizontal layers.** A feature is only "done" when all five
layers are complete: data model, service, handler, annotations, and tests. A perfectly
modeled entity with no tests is not done.

---

## Architecture Principles

1. **SAP CAP layer order** — always implement in sequence:
   `db/` → `srv/*.cds` → `srv/*.ts` → `app/*/annotations.cds` → `test/`

2. **CDS-first** — all persistent data shapes start in `.cds` files. No ad-hoc
   TypeScript interfaces for entities; use CDS-generated types.

3. **OData V4** — services are OData V4. Never bypass the service layer to hit
   the database directly from UI.

4. **Separation of concerns** — entities live in `db/`, projections in `srv/`,
   UI config in `app/`. No business logic in `.cds` files.

5. **Worktree isolation** — every feature branch is developed in
   `../worktrees/{branch}/`. Never commit feature code directly on `main`.

---

## Data Model Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| Primary key | `cuid` aspect | `key ID : UUID @Core.Computed` |
| Audit fields | `managed` aspect | `createdAt : Timestamp` by hand |
| Enum + default | Named type: `type S : String(20) enum { A; B; }` | Inline `enum { }` combined with `default` on one field |
| Virtual fields | `virtual myField : Integer` (modifier before name) | `myField : virtual Integer` |
| Owned children | `Composition of many` | `Association to many` |
| External refs | `Association to` | `Composition of` |
| Namespace | First line of every `.cds` file | Omitted |

CDS types only: `String(n)`, `Integer`, `Decimal(p,s)`, `Boolean`, `Date`, `DateTime`, `Timestamp`.

---

## Service Design Rules

- Expose only what the UI needs — never project entire DB entities unchanged
- `@requires` / `@restrict` on every service or entity — no anonymous write access
- `@readonly` on read-only projections
- `@Capabilities.InsertRestrictions`, `UpdateRestrictions`, `DeleteRestrictions` to restrict operations
- Actions and functions declared in `.cds`, implemented in handler
- `@odata.draft.enabled` only when SAP Fiori draft workflow is explicitly required

---

## Handler Rules

- `req.reject(status, message)` for permanent failures — **always `return req.reject(...)`**;
  code must not continue after a rejection
- `req.error(status, message)` for accumulated validation errors (processing continues)
- **Never** `throw new Error()` — CAP catches it but the HTTP response format is wrong
- CQL only: `SELECT.from`, `INSERT.into`, `UPDATE`, `DELETE.from`
- **Never** raw SQL strings or template literals containing data — SQL injection risk
- `before` hooks for validation, `on` hooks to override behavior, `after` hooks to enrich

---

## Fiori Elements Annotation Rules

- `@Common.Label` on every exposed element — no unlabeled fields in the UI
- `@UI.Importance` on every `UI.LineItem` column
- `@UI.HeaderInfo` required on every object page entity
- `@Common.ValueList` for all FK references — no free-text input for foreign keys
- `@UI.SelectionFields` uses indexed fields only
- `@UI.FieldGroup` + `@UI.Facets` to structure the object page into sections

---

## Testing Rules

- **TDD** — write the test first, then the implementation
- **Integration tests** via `@sap/cds-test` with `cds.test('.').in(__dirname, '..')`
- **Factory pattern** for test data: `getMockX(overrides?: Partial<X>)`
- Test happy path **and** every error/rejection case
- Tests must be independent — no shared mutable state between tests
- `npm test` must pass with exit code 0 before any code review begins

---

## Security Rules

- `@requires: 'authenticated-user'` minimum on all services; use `@restrict` for roles
- Input validated at service boundary via `req.reject()` — never rely on DB constraints
- No secrets or credentials in source code or committed files
- Parameterized CQL for all queries — never string-interpolate user input

---

## Git & Workflow

- Branch naming: `feat/{ticket-id}-{description}` or `feat/{description}` (kebab-case)
- Commit format: Conventional Commits — `feat(scope):`, `fix(scope):`, `test(scope):`
- One commit per CAP layer (data model, service, handler, annotations, tests)
- Worktrees: `../worktrees/{branch-slug}` — sibling to the project root
- `main` branch is protected — never write directly to `main`

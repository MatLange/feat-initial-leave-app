---
description: Run code quality checks on a directory
allowed-tools: Read, Glob, Grep, Bash(npm:*), Bash(npx:*)
---

# Code Quality Review

Review code quality in: $ARGUMENTS

## Instructions

1. **Identify files to review**:
   - Find all `.cds`, `.ts`, and `.js` files in the directory
   - Exclude generated files (`*.d.ts`, `gen/`, `_cds-models/`)

2. **Run automated checks**:
   ```bash
   npx cds-lint $ARGUMENTS
   npx tsc --noEmit
   npm run lint -- $ARGUMENTS
   ```

3. **Manual review checklist**:

   **CDS Model (`db/`):**
   - [ ] Namespace declared at top of every `.cds` file
   - [ ] `cuid` and `managed` aspects used instead of manual ID/timestamps
   - [ ] Compositions used for owned children, associations for references
   - [ ] No raw SQL types (VARCHAR, INT) — use CDS types
   - [ ] Localized elements use `localized String` keyword
   - [ ] `@assert.range` or `@assert.notNull` where required
   - [ ] Entity and element names follow PascalCase/camelCase convention

   **Service Handlers (`srv/`):**
   - [ ] No TypeScript `any` types — use `unknown` or generated types
   - [ ] `req.reject()` / `req.error()` instead of `throw new Error()`
   - [ ] CQL used (`SELECT.from().where()`) — no raw SQL strings
   - [ ] `before` hooks for validation, `on` for logic, `after` for enrichment
   - [ ] External calls wrapped in try/catch with `req.error` fallback
   - [ ] `@requires` / `@restrict` enforced in CDS, not only in handler

   **OData Service (`srv/*.cds`):**
   - [ ] `@readonly` on read-only projections
   - [ ] `@Capabilities` annotations restrict unneeded operations
   - [ ] Actions/functions declared in `.cds` before implementing in handler

   **Fiori Annotations (`app/*/annotations.cds`):**
   - [ ] `@UI.LineItem` columns have `@UI.Importance`
   - [ ] `@Common.Label` on every exposed element
   - [ ] `@UI.HeaderInfo` present on object page entities
   - [ ] `@Common.ValueList` for FK references

4. **Report findings** organized by severity:
   - Critical (must fix — security, OData contract violation, SQL injection risk)
   - Warning (should fix — missing annotations, convention violations)
   - Suggestion (could improve — performance, readability)

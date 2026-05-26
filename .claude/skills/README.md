# Claude Code Skills — SAP CAP Fullstack

This directory contains project-specific skills for SAP CAP fullstack development with CDS data model, Node.js/TypeScript handlers, and Fiori Elements / UI5 frontend.

## Skills by Category

### SAP CAP Backend
| Skill | Description |
|-------|-------------|
| [cds-data-model](./cds-data-model/SKILL.md) | CDS entities, associations, compositions, aspects (`cuid`, `managed`), localization, temporal data |
| [cap-handlers](./cap-handlers/SKILL.md) | Node.js/TS service handlers — before/on/after hooks, `req.reject()`, CQL queries, custom actions |

### SAP Frontend (Fiori / UI5)
| Skill | Description |
|-------|-------------|
| [fiori-elements](./fiori-elements/SKILL.md) | Fiori Elements annotations — List Report, Object Page, `@UI`, `@Common`, `@Capabilities` |
| [ui5-patterns](./ui5-patterns/SKILL.md) | UI5 controllers, view XML, OData model binding, fragments, event handlers |

### Code Quality & Testing
| Skill | Description |
|-------|-------------|
| [testing-patterns](./testing-patterns/SKILL.md) | CAP integration tests with `@sap/cds-test`, Jest, factory functions, TDD workflow |
| [systematic-debugging](./systematic-debugging/SKILL.md) | Four-phase debugging — OData errors, handler issues, CDS compile errors, CQL problems |

## Skill Combinations for Common Tasks

### Implementing a New Feature End-to-End

1. **cds-data-model** — Define entities, aspects, associations in `db/`
2. **cap-handlers** — Implement handler logic in `srv/`, add validation in `before` hooks
3. **fiori-elements** — Add `@UI.LineItem`, `@UI.FieldGroup`, value helps in `app/*/annotations.cds`
4. **testing-patterns** — Write integration tests with `cds.test()` (TDD: test first)

### Adding a Custom Action

1. **cds-data-model** — Declare action in `srv/*.cds`
2. **cap-handlers** — Implement `srv.on('actionName', ...)` in handler
3. **fiori-elements** — Expose as `UI.DataFieldForAction` in annotations
4. **testing-patterns** — Test via POST to action URL

### Configuring the Fiori UI

1. **fiori-elements** — Configure columns, filters, sections, value helps
2. **ui5-patterns** — Add custom controller logic or dialog fragments if Fiori Elements is not enough

### Debugging an Issue

1. **systematic-debugging** — Root cause analysis (OData error, handler, CDS compile)
2. **testing-patterns** — Write failing test to capture the bug before fixing

### Extending an Existing Entity

1. **cds-data-model** — Use `extend entity` or `annotate` in new `.cds` file
2. **cap-handlers** — Add handler logic for new fields/actions
3. **fiori-elements** — Update annotations to show new fields in UI

## How Skills Work

Skills are automatically suggested by the `skill-eval.js` hook when Claude recognizes relevant context from your prompt, file paths, or code content. Each skill provides:

- **Core Rules** — Non-negotiable conventions
- **Patterns** — Correct implementation examples
- **Anti-Patterns** — Common mistakes and why to avoid them
- **Integration** — How skills connect across layers

## Adding New Skills

1. Create directory: `.claude/skills/skill-name/`
2. Add `SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: skill-name
   description: What it does and when to use it. Include SAP CAP keywords.
   ---
   ```
3. Include sections: Core Rules, Patterns, Anti-Patterns, Integration with Other Skills
4. Add to this README
5. Add triggers to `.claude/hooks/skill-rules.json` under `"skills"` key

## Maintenance

- Update skills when CAP/CDS versions change
- Keep CDS syntax examples current with `@sap/cds` version in `package.json`
- Add new patterns as they emerge from code reviews
- Archive old skills rather than deleting (leave redirect stubs)

# Leave Request Manager

SAP CAP App für die digitale Urlaubsantragsverwaltung. Mitarbeiter stellen Anträge,
Vorgesetzte genehmigen oder lehnen ab.

## Quick Facts

- **Stack**: SAP CAP (Node.js/TypeScript), SAP Fiori Elements, @sap/cds
- **Dev Server**: `cds watch`
- **Test Command**: `npm test`
- **Lint Command**: `npx cds-lint`
- **Type Check**: `npx tsc --noEmit`

## Key Directories

- `db/` — CDS Datenmodell (`leave-requests.cds`)
- `srv/` — Service-Definition (`leave-service.cds`) und Handler (`leave-service.ts`)
- `app/leave-requests/` — Fiori Elements List Report + Object Page
- `test/` — Integration Tests mit `@sap/cds-test`

## Datenmodell (Übersicht)

- `Employees` — Mitarbeiter (name, email, department)
- `LeaveRequests` — Urlaubsanträge (employee, startDate, endDate, type, status, ...)

## Status-Maschine

```
Draft → [submit()] → Submitted → [approve()] → Approved
                               → [reject(reason)] → Rejected
```

## Kritische Regeln

- `req.reject()` statt `throw new Error()` in Handlern
- Kein rohes SQL — immer CQL (`SELECT.from`, `UPDATE`, ...)
- `cuid` + `managed` Aspekte in allen Entities
- Tests zuerst (TDD) — dann Implementierung

## Git-Konventionen

- **Branch**: `feat/{ticket-id}-{description}` oder `{initials}/{description}`
- **Commits**: Conventional Commits (`feat:`, `fix:`, `test:`, ...)
- **Worktrees**: Agenten arbeiten in `../worktrees/{branch}`

## Multi-Agent Entwicklung

- `feature-developer` — Implementiert Features in isolierten Worktrees
- `code-reviewer` — Code-Review nach CAP-Standards
- `github-workflow` — Branch, Commits, PR

Starte orchestrierte Entwicklung: `/orchestrate <Feature-Beschreibung>`
Siehe [WORKTREES.md](WORKTREES.md) für Details.

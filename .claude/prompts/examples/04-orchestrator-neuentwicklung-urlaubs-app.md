# Beispiel: Ausgefüllter Orchestrator-Prompt — Initiale Neuentwicklung

> Dieses Beispiel zeigt, wie der Orchestrator-Prompt für eine kleine,
> komplett neue SAP CAP App ausgefüllt wird.
> Die App verwaltet Urlaubsanträge (Leave Requests) für eine Abteilung.
>
> So verwenden: Inhalt des Abschnitts "--- PROMPT ANFANG ---" bis
> "--- PROMPT ENDE ---" kopieren und am Anfang einer Claude Code Session einfügen.

---

## Kontext

**App-Name:** Leave Request Manager
**Zweck:** Mitarbeiter beantragen Urlaub digital; Vorgesetzte genehmigen oder lehnen ab.
**Größe:** Klein (1 Service, 3 Entities, 1 Fiori App)
**Entwicklungsart:** Initiale Neuentwicklung — noch kein Code vorhanden

---

--- PROMPT ANFANG ---

Du bist der **Orchestrator** für eine neue SAP CAP Fullstack-App. Deine Aufgabe ist es,
drei spezialisierte Agenten zu koordinieren, die gemeinsam die App von Grund auf neu
entwickeln. Jeder Agent arbeitet in einem isolierten Git-Worktree.

## Projekt-Kontext

- **Projekt:** Leave Request Manager — SAP CAP App zur digitalen Urlaubsantragsverwaltung
- **Stack:** SAP CAP (Node.js/TypeScript), SAP Fiori Elements, @sap/cds
- **Repo:** C:\Users\matti\OneDrive\100_Projekte\Projekt MHP Porsche ManßuPartner\20_Projekt in 2025 - SAP CAP\Repositories\sapcapclaude
- **Main Branch:** main
- **Worktree-Basis:** ../worktrees/ (Geschwisterverzeichnis des Projektroots)
- **Status:** Initiale Neuentwicklung — das Verzeichnis ist leer (nur `package.json` und `cds init` bereits ausgeführt)

## Verfügbare Agenten

Du koordinierst drei Agenten — starte sie als Sub-Agenten wenn nötig:

| Agent | Rolle | Einsatz |
|-------|-------|---------|
| `feature-developer` | Implementiert alle 5 SAP CAP Schichten im Worktree | Wenn Code geschrieben werden muss |
| `code-reviewer` | Prüft gegen CAP-Konventionen und Checkliste | Nach abgeschlossener Implementierung |
| `github-workflow` | Commits, Branches und PRs | Wenn Review bestanden ist |

## Zu implementierendes Feature

**Titel:** Initiale Neuentwicklung — Leave Request Manager (vollständige App)

**Ziel:** Einen Mitarbeiter befähigen, einen Urlaubsantrag digital einzureichen,
und einem Vorgesetzten ermöglichen, diesen zu genehmigen oder abzulehnen —
vollständig als SAP CAP OData-Service mit Fiori Elements UI.

**Acceptance Criteria:**

### Datenmodell (`db/leave-requests.cds`)
- [ ] Entity `Employees` mit: `name` (String, mandatory), `email` (String), `department` (String)
- [ ] Entity `LeaveRequests` mit: `employee` (Association zu Employees, mandatory),
      `startDate` (Date, mandatory), `endDate` (Date, mandatory),
      `type` (enum: Annual, Sick, Special; mandatory),
      `reason` (String 500), `status` (enum: Draft, Submitted, Approved, Rejected; default: Draft),
      `approver` (String 100), `rejectionReason` (String 500)
      — managed Aspekt (createdAt, createdBy, modifiedAt, modifiedBy) und cuid
- [ ] Validierung: `startDate` darf nicht nach `endDate` liegen
- [ ] Berechnung: `durationDays` als virtual/calculated field (Anzahl Werktage)

### Service (`srv/leave-service.cds` + `srv/leave-service.ts`)
- [ ] `LeaveService` exponiert `LeaveRequests` (mit Draft-Workflow `@odata.draft.enabled`)
      und `Employees` (read-only)
- [ ] Action `submit()` auf LeaveRequests: Status Draft → Submitted; Validierung: mind. 1 Tag
- [ ] Action `approve()` auf LeaveRequests: Status Submitted → Approved; speichert approver-Name
- [ ] Action `reject(reason: String)` auf LeaveRequests: Status Submitted → Rejected; speichert reason
- [ ] Ungültige Status-Übergänge mit `req.reject(422, ...)` abfangen

### Fiori Elements UI (`app/leave-requests/`)
- [ ] List Report: Spalten status (mit Criticality-Farben), employee.name, type, startDate, endDate, durationDays
- [ ] Suchfilter: status, type, startDate (Datumbereich)
- [ ] Object Page: Header mit Mitarbeitername + Status, Abschnitte General + Details
- [ ] Action-Buttons im Header: "Submit", "Approve", "Reject" (je nach aktuellem Status sichtbar)
- [ ] `@Common.Label` auf allen Feldern; `@Common.ValueList` für employee und type

### Tests (`test/leave-service.test.ts`)
- [ ] TDD: Tests zuerst schreiben, dann implementieren
- [ ] Happy Path: Antrag erstellen → einreichen → genehmigen
- [ ] Fehlerfall: Submit ohne startDate schlägt fehl (400)
- [ ] Fehlerfall: startDate nach endDate schlägt fehl (400)
- [ ] Fehlerfall: Doppeltes Approve schlägt fehl (422)
- [ ] Fehlerfall: Reject ohne Grund schlägt fehl (400)

**SAP CAP Scope:**
- Entities: `Employees`, `LeaveRequests` (neu)
- Service: `LeaveService`
- Fiori App: `app/leave-requests/`
- Ticket: n/a (Neuentwicklung)

## Deine Orchestrierungs-Schritte

1. **Analysieren** — Scope bestätigen, Dateistruktur der neuen App planen, auf Blockers prüfen
   (Hinweis: Da alles neu ist, gibt es keine existierenden Entities zu prüfen.
   Prüfe nur, ob `cds init` schon ausgeführt wurde und `package.json` existiert.)

2. **Worktree anlegen**
   ```bash
   git worktree add ../worktrees/feat-initial-leave-app -b feat/initial-leave-app
   ```

3. **Feature Developer starten** — delegiere an den `feature-developer`-Agenten mit:
   - Worktree-Pfad: `../worktrees/feat-initial-leave-app`
   - Branch: `feat/initial-leave-app`
   - Allen Acceptance Criteria von oben
   - Hinweis: Alle Dateien sind neu zu erstellen (kein existierender Code)
   - Implementierungs-Reihenfolge: `db/` → `srv/*.cds` → `srv/*.ts` → `app/` → `test/`

4. **Code Review** — delegiere an den `code-reviewer`-Agenten:
   ```bash
   git -C ../worktrees/feat-initial-leave-app diff --stat HEAD
   ```
   Vollständige CAP-Checkliste anwenden (CDS-Modell, Handler, OData, Fiori, TypeScript, Security).

5. **Shippen** — delegiere an den `github-workflow`-Agenten:
   - Branch pushen und PR erstellen
   - PR-Titel: `feat(leave): initial Leave Request Manager implementation`
   - Worktree nach PR-Erstellung aufräumen:
     ```bash
     git worktree remove ../worktrees/feat-initial-leave-app
     ```

6. **Abschlussbericht** — PR-URL, implementierte Dateien, offene Follow-up-Punkte

Melde Fortschritt nach jedem Schritt. Starte jetzt mit Phase 1 (Analyse).

--- PROMPT ENDE ---

---

## Erwartetes Ergebnis

Nach Abschluss aller Phasen sollte die App folgende Dateistruktur haben:

```
leave-request-manager/
├── db/
│   └── leave-requests.cds        # Employees + LeaveRequests entities
├── srv/
│   ├── leave-service.cds         # Service-Definition mit Actions
│   └── leave-service.ts          # TypeScript-Handler (submit, approve, reject)
├── app/
│   └── leave-requests/
│       ├── annotations.cds       # Fiori List Report + Object Page Annotationen
│       └── webapp/               # (wird von cds init generiert)
├── test/
│   └── leave-service.test.ts     # Integration Tests (6 Szenarien)
├── package.json
└── .cdsrc.json
```

## Tipps für eigene Anpassungen

| Placeholder | Ersetzen durch |
|------------|----------------|
| `Leave Request Manager` | Name deiner App |
| `Employees`, `LeaveRequests` | Deine Entitäten |
| `LeaveService` | Name deines CAP-Service |
| `app/leave-requests/` | Dein Fiori-App-Verzeichnis |
| Die Acceptance Criteria | Deine konkreten fachlichen Anforderungen |

## Variante: Direkt ohne Orchestrator starten

Falls du keinen orchestrierten Ablauf willst, kannst du auch direkt den
`feature-developer`-Agenten ansprechen:

```
Verwende den feature-developer-Agenten.

Entwickle eine neue SAP CAP App "Leave Request Manager" im Worktree
../worktrees/feat-initial-leave-app (Branch: feat/initial-leave-app).

[Acceptance Criteria von oben einfügen]

Alle Dateien sind neu zu erstellen. Starte mit dem Worktree-Setup,
dann implementiere Layer für Layer: db → srv.cds → srv.ts → annotations → tests.
```

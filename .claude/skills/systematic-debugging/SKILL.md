---
name: systematic-debugging
description: Four-phase debugging methodology with root cause analysis. Use when investigating bugs, fixing test failures, or troubleshooting unexpected behavior in CAP handlers, CDS models, or OData responses. Emphasizes NO FIXES WITHOUT ROOT CAUSE FIRST.
---

# Systematic Debugging

## Core Principle

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Never apply symptom-focused patches that mask underlying problems. Understand WHY something fails before attempting to fix it.

## The Four-Phase Framework

### Phase 1: Root Cause Investigation

Before touching any code:

1. **Read error messages thoroughly** — Every word matters. CAP errors include HTTP status, message text, and often a `target` field pointing to the problematic element
2. **Reproduce the issue consistently** — If you can't reproduce it, you can't verify a fix
3. **Examine recent changes** — What changed before this started failing?
4. **Gather diagnostic evidence** — Logs, OData error responses, CDS compile errors, stack traces
5. **Trace data flow** — Follow the call chain: HTTP request → OData parser → handler → CQL → DB

**Root Cause Tracing Technique for CAP:**
```
1. Observe the symptom — HTTP 4xx/5xx? Wrong data? Missing field?
2. Find immediate cause — Which handler/hook throws? Which CDS element fails?
3. Ask "What called this?" — Was it a READ, WRITE, action call, or event?
4. Keep tracing up — Follow invalid data or wrong logic backward through the stack
5. Find original trigger — Is it the data model, the service definition, the handler, or the annotation?
```

**Key principle:** Never fix problems solely where errors appear — always trace to the original trigger.

### Phase 2: Pattern Analysis

1. **Locate working examples** — Find similar entities/handlers that work correctly
2. **Compare implementations completely** — Don't just skim CDS definitions
3. **Identify differences** — What's different between working and broken?
4. **Understand dependencies** — Which aspects, projections, or services does this depend on?

### Phase 3: Hypothesis and Testing

Apply the scientific method:

1. **Formulate ONE clear hypothesis** — "The error occurs because X"
2. **Design minimal test** — Change ONE variable at a time
3. **Predict the outcome** — What should happen if hypothesis is correct?
4. **Run the test** — Execute and observe
5. **Verify results** — Did it behave as predicted?
6. **Iterate or proceed** — Refine hypothesis if wrong, implement if right

### Phase 4: Implementation

1. **Create failing test case** — Write `@sap/cds-test` test that captures the bug
2. **Implement single fix** — Address root cause, not symptoms
3. **Verify test passes** — Confirms fix works
4. **Run full test suite** — `npm test` — ensure no regressions
5. **If fix fails, STOP** — Re-evaluate hypothesis

**Critical rule:** If THREE or more fixes fail consecutively, STOP. This signals architectural problems requiring discussion, not more patches.

## CAP-Specific Debugging Scenarios

### OData 4xx Errors

```
1. Read the full OData error JSON ($.error.message, $.error.target)
2. Is it a validation error from req.error()? → Check before hooks
3. Is it a CDS schema violation? → Check @mandatory, @assert.range annotations
4. Is it a navigation error? → Check association definitions and expand syntax
5. Is it an authorization error? → Check @requires/@restrict on service element
```

### CDS Compile Errors (`cds compile`)

```
1. Run: cds compile db/ srv/ --to edmx
2. Read the full error — it references file, line, and element
3. Missing `using` import? → Add using statement
4. Unresolved reference? → Check entity/type name and namespace
5. Type mismatch? → Check CDS type vs annotation type
```

### Handler Not Firing

```
1. Check that the service class calls super.init() at the end of init()
2. Verify the entity name in srv.on/before/after matches the CDS entity name exactly
3. Check if another handler is overriding with srv.on() (replaces default behavior)
4. Add console.log as first line of handler to confirm it's called
5. Verify the module.exports class extends cds.ApplicationService
```

### Wrong Data / Missing Fields

```
1. Check if field is projected in the service layer (srv/*.cds)
2. Check if field is excluded from the projection (missing in column list)
3. Check if field is @readonly in the service but you're trying to write it
4. Check if after hook is overwriting the value
5. Run SELECT directly via cds repl: await SELECT.from('Entity').limit(1)
```

### CQL Query Issues

```
1. Test CQL in cds repl: cds repl (then) await SELECT.from('db.Orders').limit(5)
2. Enable CDS query log: DEBUG=cds.sql cds watch
3. Check join conditions for associations (association back-link must match)
4. Check that @cds.persistence.skip is not set on an element you're querying
```

### TypeScript Handler Errors

```
1. Run: npx tsc --noEmit — read all type errors in order
2. Missing @sap/cds type? → Check @types/sap__cds is installed
3. 'any' coming from cds.entities? → Add explicit type cast or generate types with cds-typer
4. Async handler not awaited? → Check that async function properly returns/awaits
```

### Intermittent Test Failures

```
1. Look for test isolation issues — shared DB state between tests
2. Check if beforeEach properly seeds fresh data and afterEach cleans up
3. Async ordering — is a test calling an action before the entity exists?
4. UUID collisions in factory data — use uuidv4() not hardcoded IDs
5. Use cds.run() with explicit transaction to isolate test operations
```

## Red Flags — Process Violations

Stop immediately if you catch yourself thinking:

- "Quick fix for now, investigate later"
- "One more fix attempt" (after multiple failures)
- "This should work" (without understanding why)
- "Let me just try..." (without hypothesis)
- "The CDS model is probably fine" (without running `cds compile`)

## Warning Signs of Deeper Problems

**Consecutive fixes revealing new problems in different layers (model → service → handler)** indicates architectural issues:

- Stop patching
- Document what you've found
- Discuss with team before proceeding
- Consider if the CDS data model design needs rethinking

## Diagnostic Commands

```bash
# Compile CDS and show errors
cds compile db/ srv/ --to edmx

# Start with full debug logging
DEBUG=cds* cds watch

# Interactive CDS REPL for CQL testing
cds repl

# Check OData metadata
curl http://localhost:4004/odata/v4/orders/$metadata

# Run specific test file
npx jest test/order-service.test.js --verbose

# TypeScript check
npx tsc --noEmit
```

## Debugging Checklist

Before claiming a bug is fixed:

- [ ] Root cause identified and documented
- [ ] Hypothesis formed and tested
- [ ] Fix addresses root cause, not symptoms
- [ ] Failing test created that reproduces bug
- [ ] Test now passes with fix
- [ ] Full test suite passes (`npm test`)
- [ ] `cds compile` shows no errors
- [ ] No "quick fix" rationalization used
- [ ] Fix is minimal and focused

## Success Metrics

Signs you're doing it right:
- Fixes don't create new bugs in other layers
- You can explain WHY the bug occurred (model? service? handler? annotation?)
- Similar bugs don't recur
- Code is better after the fix, not just "working"

## Integration with Other Skills

- **testing-patterns**: Create `@sap/cds-test` test that reproduces the bug before fixing
- **cap-handlers**: Most runtime bugs are in handler before/on/after hooks
- **cds-data-model**: Compile errors trace back to model definitions

# Correctness Invariants

The platform is built around 10 testable invariants (P1–P10) lifted directly from the spec. These are enforced by the test suite and guarantee deterministic, safe behavior.

## Engine Invariants

- **P1 Resolution determinism** — same intention → same resolved graph (modulo timestamp)
- **P2 Input-ordering independence** — permuting `programs` or `lenses` arrays doesn't change activation
- **P3 Render idempotence** — running `renderAll` twice produces byte-identical files
- **P4 Platform independence** — the resolved graph is identical regardless of target list
- **P5 DSL safe evaluation** — bounded time, no I/O, no `eval`, no closure state
- **P6 Lens composition conservativeness** — a program with no matching lens has its base content preserved exactly
- **P7 Intention patch idempotence** — applying the same patch twice equals applying it once
- **P8 MCP-vs-direct equivalence** — the MCP server and direct function calls route through the same `resolve()`
- **P9 Portability scanner coverage** — programs and lenses are free of customer-specific terms
- **P10 Unknown-identifier rejection** — DSL rejects identifiers outside the allowlist at load time

## Running Tests

```bash
npm test
```

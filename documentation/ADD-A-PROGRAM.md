# Adding a new program to the FDE Toolkit

This is a 5-minute guide for someone who wants to add a new enablement program to the toolkit's catalog. It's the concrete version of the claim "programs are data, not code" — you'll add a directory, fill in four files, and the toolkit picks it up on the next `ace init`. No core changes. No new tests required. No new CLI flags.

---

## What a program actually is

A program is a directory under `programs/` containing:

1. **`program.yaml`** — the manifest. Declares when to activate, what stages it participates in, what skills and steering files it ships.
2. **`skills/*.md`** — markdown files with YAML frontmatter, each describing an invokable capability.
3. **`steering/*.md`** — markdown files with YAML frontmatter, each describing always-on or auto-triggered guidance for the model.
4. *(optional)* **`templates/*.hbs`** and **`playbooks/*.md`** — rendered templates and human-only runbooks.

That's the whole surface area. Everything else is handled by the loader, planner, renderer, and adapters.

---

## Step-by-step

### 1. Create the directory

```powershell
New-Item -ItemType Directory -Path programs\school-of-finops
cd programs\school-of-finops
New-Item -ItemType Directory -Path skills, steering
```

Use `kebab-case` for the directory name. The directory name becomes the program `id` in the manifest — keep them matched.

### 2. Write `program.yaml`

```yaml
id: school-of-finops
name: School of FinOps
version: 1.0.0
summary: FinOps assessment and cost-optimization workshops for enterprise cloud spend.
owner: fde-partner-program

stages:
  - transform
  - ai-native

applicability:
  - when: "intent.includes('cost-optimization')"
    weight: 85
  - when: "intent.includes('finops')"
    weight: 90
  - when: "intake.cloudSpendUSD > 10000000"
    weight: 70

skills:
  - skills/run-finops-review.md

steering:
  - steering/finops-framework.md

templates: []
playbooks: []

exitCriteria:
  - id: finops-review-complete
    description: "A FinOps review artifact exists with cost drivers identified and quick wins documented."
    check: artifact-exists
    target: "artifacts/finops-reviews/*.md"

tags:
  - finops
  - cost-optimization
```

**Key fields:**

| Field | What it does |
|---|---|
| `applicability[].when` | A sandboxed boolean DSL expression over `intent`, `aimTier`, and `intake.*`. When any rule matches, the program is a candidate. |
| `applicability[].weight` | 0-100, descending priority. The first matching rule's weight is the program's score in the planner. |
| `stages` | Which lifecycle stages the program participates in: `intent`, `assess`, `transform`, `ai-native`. |
| `exitCriteria` | Predicates the planner uses to decide when the program's work is done for this engagement. |

**The DSL is restricted** — no function calls, no arbitrary code, no file I/O. Operators you can use: `&&`, `||`, `!`, `===`, `!==`, `<`, `<=`, `>`, `>=`, and `.includes()` on arrays. See the white paper's architecture section for the grammar.

### 3. Write at least one skill

`skills/run-finops-review.md`:

```markdown
---
id: run-finops-review
name: "Run FinOps Review"
description: "Walk the customer through a structured FinOps assessment and produce a cost-optimization report."
trigger: command
phrase: "/finops-review"
---

## Objective
Identify the top cost drivers in the customer's cloud environment, quantify
the annualized waste, and produce a prioritized list of quick-win and
strategic optimizations.

## Procedure
1. Pull the last 90 days of cost-and-usage data from the customer's
   Cost Explorer (or equivalent).
2. Walk the five FinOps dimensions: visibility, allocation, optimization,
   forecasting, and governance.
3. For each dimension, record: current state, gaps, and a specific next action.
4. Produce `artifacts/finops-reviews/<customer>-<date>.md` summarizing findings
   with quantified annual savings.

## Done when
- All five dimensions have documented findings.
- At least three quick wins and two strategic initiatives are named with owners.
- The customer executive has acknowledged the report.
```

**Skills render differently per harness:**

- **Kiro** — becomes a slash-command via `trigger: command` + `phrase`.
- **Claude Code** — rendered under `.claude/commands/` with a natural-language invocation hint.
- **Copilot** — rendered under `.github/instructions/` with appropriate `applyTo:` scope.

### 4. Write at least one steering file

`steering/finops-framework.md`:

```markdown
---
id: finops-framework
inclusion: auto
match: "artifacts/finops-reviews/**"
priority: 70
---

# FinOps Five-Dimension Framework

When the user is working on files under `artifacts/finops-reviews/`, apply
the five-dimension FinOps framework:

1. **Visibility** — do cost and usage data flow to the teams that can act on it?
2. **Allocation** — can spend be tied back to products, teams, and customers?
3. **Optimization** — are rightsizing, purchasing, and architecture reviewed regularly?
4. **Forecasting** — can the organization predict next quarter's spend with
   stated confidence intervals?
5. **Governance** — are policies enforced (tagging, approval, threshold alerts)
   and audited?

For each dimension, assign a maturity rating (ad-hoc / repeatable / managed /
optimized) with cited evidence. Avoid conclusions that don't cite evidence.
```

**Steering inclusion modes:**

- `always` — included in every context the harness assembles.
- `auto` — included only when the `match` glob fires. Requires a `match` field.
- `manual` — only loaded when the user explicitly asks.

### 5. Test your program

From the repo root, validate that the loader accepts your program:

```powershell
npx FDE program list
```

Your program should appear in the output. If it doesn't, the loader will have printed a diagnostic pointing to the offending field.

Then smoke-test that the planner picks it up for an appropriate intake:

```powershell
# Create a test intake that exercises your program's applicability rules
@"
industry: tech
intent:
  - cost-optimization
aim:
  business: 3
  platform: 4
  governance: 3
goals: [cost-optimization, finops]
production:
  cloudSpendUSD: 15000000
updatedAt: "2026-05-19T00:00:00Z"
"@ | Set-Content engagements/test-finops/intention.yaml

FDE apply --intention engagements/test-finops/intention.yaml
```

You should see your new program in the pipeline plan for at least one stage, with the score and matching rule visible.

### 6. Run the existing test suite

```powershell
npm test
```

All 181 existing tests should still pass. If any fail, the most likely cause is:

- Your `program.yaml` fails schema validation — the loader diagnostic points to the field
- Your applicability `when:` expression has a syntax error — the expression parser prints line/column
- Your manifest references a file under `skills/`, `steering/`, `templates/`, or `playbooks/` that doesn't exist on disk — reference-integrity check fails loudly

No core code changed, so no property-based tests should need to change. If a property test fails, that's a signal your manifest violates an invariant — investigate rather than suppress.

---

## What happens when your program activates

When a customer's intake matches your program's applicability rules, the toolkit automatically:

1. **Plans** — your program appears in the pipeline for the relevant stages, sorted by score.
2. **Renders** — every harness adapter writes your skill and steering files into that harness's conventions (Kiro frontmatter, Claude Code monolith, Copilot `applyTo:` globs, etc.).
3. **Spawns agent capabilities** — see the white paper's §5 on dynamic agents. The harness spawns the capabilities your skills declare, only for this engagement, retiring them when the engagement ends.
4. **Tracks** — every state change and decision lands in `state/history.jsonl` as an append-only audit log.

---

## What you don't need to do

- You don't modify `core/` or any adapter code.
- You don't add new CLI flags.
- You don't write new property-based tests (they test invariants, not program content).
- You don't register your program in a central list — the loader auto-discovers directories under `programs/`.
- You don't coordinate with other program authors — the loader rejects duplicate ids and invalid dependency cycles at load time.

---

## When to write more than the minimum

The minimum (one skill, one steering file) is usually the right place to start. Add more when:

- **Multiple workflows per program** — e.g., AIM ships `run-aim-assessment` *and* `produce-aim-roadmap`. Two skills, because they're two distinct invocations.
- **Conditional steering** — e.g., one steering file for assessment phase, another for implementation phase. Use `match:` globs to scope them.
- **Templates** — if the program produces a predictable artifact shape (e.g., an AIM assessment document), ship a Handlebars template under `templates/`. Skills can render into it.
- **Playbooks** — if there's content only a human FDE should see (facilitation tips, risks to watch for), ship a `playbooks/` markdown file. The renderer deliberately does not ship playbooks to any harness.

---

## Example: the nine programs added most recently

Look at these for live examples of small, well-scoped programs:

- [`programs/resilience`](../programs/resilience/) — one skill, one steering file, minimal manifest
- [`programs/agentpath`](../programs/agentpath/) — includes a prerequisite check in its applicability rules
- [`programs/ai-operations`](../programs/ai-operations/) — complex applicability (dual-low AIM scores)

All of these were added using exactly the process above. None required a core change.

---

## When your program needs something the DSL can't express

The `when:` DSL is deliberately small. If you need behavior outside it (e.g., external API lookups, time-based activation, ML-scored matching), that's a toolkit capability conversation — open an issue or a discussion with the maintainers before trying to work around it with intake-field tricks. Adding to the DSL requires:

- Updating the sandboxed parser
- New property-based tests for the new construct
- Updating the white paper's DSL grammar section

That's intentional friction. The DSL's restrictions are why the catalog is safe to share without auditing every program.


---

## Writing activation predicates (intention-driven)

After the harness pivot, programs declare an `activation` block that
evaluates against the customer's **intention** rather than the old
intake. The DSL allowlist is the closed set:

`intent`, `aimTier`, `intake` *(legacy — retained for back-compat)*,
`industry`, `regulated`, `aim`, `cloud`, `goals`, `production`, `team`.

### Example

```yaml
activation:
  combine: any
  rules:
    - when: "goals.includes('responsible-ai')"
      weight: 80
      reason: "customer explicitly wants responsible AI"
    - when: "aim.governance < 2"
      weight: 90
      reason: "governance tier below 2 triggers RAI baseline"
    - when: "regulated && production.aiSystems > 0"
      weight: 95
      reason: "regulated industry with production AI systems"
```

### Semantics

- **`combine: any`** (default) — highest matching rule's weight wins;
  every rule is recorded in the activation trace.
- **`combine: all`** — every rule must match; weights sum.
- Out-of-allowlist identifiers raise `LoadError` at load time
  (correctness property **P10**).
- Comparison operands must be comparable; strict equality never
  coerces.

### Activation traces

Every rule evaluation is recorded in
`state/resolution.json` → `activePrograms[].trace`, so an FDE can
answer "why did this program activate?" in one sentence.

---

## Authoring lens overlays

Lenses live under `lenses/<lens-id>/lens.yaml` and compose with
matching programs. They **add**, they never silently remove.

### Shape

```yaml
id: financial-services-lens
kind: lens
industry: financial-services
activation:
  combine: any
  rules:
    - when: "industry === 'financial-services'"
      weight: 100
      reason: "financial services industry match"
overlays:
  - targetProgram: responsible-ai
    addSteering:
      - steering/pci-dss-steering.md
    addExitCriteria:
      - id: model-risk-governance-doc
        description: "SR 11-7 aligned model risk governance doc."
        check: artifact-exists
        target: "artifacts/rai-reviews/sr-11-7-*.md"
    additionalTags: [fs-regulated]
```

### Composition rules

- **Deterministic order.** Overlays apply in lens-id ascending order.
- **`addSteering` / `addSkills`** append and dedupe. Duplicates are
  silently skipped.
- **`addExitCriteria`** whose id already exists on the base program
  are skipped **unless** the same overlay also lists that id in
  `overrideExitCriteria`.
- **`overrideExitCriteria`** replaces the base criterion by id.
  Targeting a missing id raises `OverlayError`.
- **Cross-lens conflicts** (two active lenses overriding the same
  criterion) emit an `OverlayConflict` diagnostic; the lens with the
  lexicographically smallest id wins.
- **Portability.** Lens content is scanned by
  `scanLensesForPortability` at load time. A lens that hard-codes a
  customer-specific term fails to load.

### When to author a lens vs. a program

- **Program** — captures a coherent outcome area (responsible AI,
  AI operations, multicloud assessment). Always portable and generic.
- **Lens** — captures an industry's regulatory posture or operating
  constraints (PCI, SOX, HIPAA, FedRAMP). Always composes with a
  program; never stands alone.

If two industries would naturally share the same program with only
steering or exit-criterion deltas, the difference belongs in two
lenses, not two programs.

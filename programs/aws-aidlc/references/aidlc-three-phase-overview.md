# AWS AI-DLC — Three-Phase Methodology Overview

This reference summarises [AWS Labs' aidlc-workflows](https://github.com/awslabs/aidlc-workflows) at a level of detail the agent needs to navigate the methodology in an FDE engagement. For source-of-truth, read AI-DLC's own `core-workflow.md` after install.

## What AI-DLC is

AI-DLC is an open-source workflow methodology (MIT-0) from AWS Labs. It is a set of rules (markdown files) that load into supported coding agents and steer them through a structured three-phase software development lifecycle. AI-DLC is methodology-first; it does not require any installed tool beyond the agent itself.

The methodology's tenets, paraphrased: no duplication, methodology over tools, reproducible across models, agent-agnostic, human-in-the-loop on every critical decision.

## The three phases

### 🔵 Inception

**Determines:** WHAT to build and WHY.

Stages (some conditional):
- **Workspace Detection** — always. Detects greenfield vs brownfield; checks for prior AI-DLC artifacts to enable resume.
- **Reverse Engineering** — brownfield only. Generates business overview, architecture, code structure, API docs, component inventory, interaction diagrams, tech stack, dependencies.
- **Requirements Analysis** — always. Adaptive depth: minimal (clear request, just intent), standard (functional and non-functional), comprehensive (high-risk with traceability).
- **User Stories** — conditional based on intelligent assessment (user-facing change, multiple personas, complex business logic, etc.).
- **Workflow Planning** — always. Determines which phases to execute and at what depth; produces a workflow visualization.
- **Application Design** — conditional. New components, methods, business rules, dependencies.
- **Units Generation** — conditional. System decomposition into multiple units of work.

**Produces under `aidlc-docs/inception/`:**
- `requirements/`, optionally `user-stories/`, optionally `application-design/`, plans under `plans/`.

### 🟢 Construction

**Determines:** HOW to build it.

Per-unit loop (executes for each unit of work, complete one before starting the next):
- **Functional Design** — conditional. Data models, schemas, complex business logic.
- **NFR Requirements** — conditional. Performance, security, scalability, tech-stack selection.
- **NFR Design** — conditional, runs only if NFR Requirements ran.
- **Infrastructure Design** — conditional. Service mapping, deployment architecture, cloud resources.
- **Code Generation** — always. Two-part: planning (with checkboxes, user-approved) then generation.

After all units complete:
- **Build and Test** — always. Build instructions, unit tests, integration tests, performance tests, contract / security / e2e tests as applicable.

**Produces under `aidlc-docs/construction/`:**
- `{unit-name}/{functional-design,nfr-requirements,nfr-design,infrastructure-design,code}/`
- `build-and-test/`

### 🟡 Operations

**Status in AWS Labs' release:** placeholder. The phase is declared in `core-workflow.md` but the rule details are not implemented; the README lists what it will eventually include but ships nothing.

**Status in FDE engagements with `aws-aidlc` program active:** completed via the routing in `aidlc-fde-bridge.md`. FDE's existing operations programs (resilience, ai-operations, ai-native-app-builder Phase 5) are routed into `aidlc-docs/operations/` and the index file `operations-plan.md` is produced as the AI-DLC-side artifact. See `complete-operations.md` skill for the orchestrator.

**Will produce (today, via FDE routing) under `aidlc-docs/operations/`:**
- `operations-plan.md` (the index)
- `deployment.md`, `observability.md`, `incident-response.md`, `maintenance.md`, `production-readiness.md`, `resilience.md` (each links to an FDE-program-owned artifact)

When AWS Labs publishes the upstream Operations rules, the routing will be re-evaluated.

## Cross-cutting AI-DLC features

These apply to all three phases.

### Mandatory verbatim audit log

`aidlc-docs/audit.md` captures every user input verbatim with ISO 8601 timestamps. AI-DLC's rule literally reads:
- "Capture user's COMPLETE RAW INPUT exactly as provided"
- "Never summarize or paraphrase user input in audit log"
- "Log every interaction, not just approvals"

This is the feature that closes the fabricated-sign-off failure mode that prompted the FDE patch in the first place.

### Explicit user-confirmation gates

Every stage transition requires the user to type an acknowledgement. AI-DLC's rule reads "DO NOT PROCEED until user confirms" at every gate. Construction phases use a standardised 2-option completion message: "Request Changes" or "Continue to Next Stage."

### Adaptive intelligence

AI-DLC's rules tell the agent to assess complexity and skip stages that would not add value. This means a simple bug fix might run only Workspace Detection + Requirements Analysis (minimal) + Code Generation, while a greenfield enterprise application runs every stage at comprehensive depth.

### Extensions system

`aws-aidlc-rule-details/extensions/` ships with security and property-based-testing extensions. Each extension has a rules file and an optional opt-in file presented during Requirements Analysis. Extensions can be opted in or out per engagement; once enabled, they are blocking constraints at every stage.

### Plan-level checkbox enforcement

AI-DLC requires plan files to track step-by-step completion via markdown checkboxes (`[ ]` → `[x]`). Updates happen in the same interaction as the work being completed. There is also stage-level tracking in `aidlc-state.md`.

## How AI-DLC interacts with FDE

Two trees, one engagement.

| Concern | Owned by |
|---|---|
| Verbatim user input (any phase) | AI-DLC `aidlc-docs/audit.md` |
| Workload requirements / design / code | AI-DLC `aidlc-docs/{inception,construction}/` |
| Org-level assessment, RAI review, AI BOM, resilience review | FDE `artifacts/{assessments,rai-reviews,ai-bom,resilience-reviews}/` |
| Engagement-level pipeline state, decisions, intake | FDE `state/{current.yaml,history.jsonl}` |
| AI-DLC Operations phase content | Routed FDE artifacts, indexed under `aidlc-docs/operations/` |

The bridge steering (`aidlc-fde-bridge.md`) is the integration contract; this overview is the explanation.

## When to use AI-DLC

Use AI-DLC for any FDE engagement where:
- The intent includes building or prototyping software (vs. organisational consulting only).
- The customer is willing to follow a methodology with explicit user-confirmation gates.
- The verbatim-audit-log property is valuable (regulated industries, externally-audited engagements).

Use FDE without AI-DLC when:
- The engagement is purely organisational (AIM workshop, AIDLC Q-Developer adoption, multicloud assessment).
- The customer prefers their own development methodology and FDE is contributing only its program-level deliverables.

## When NOT to use AI-DLC

- For a one-line bug fix or a five-minute config change. AI-DLC's adaptive intelligence will scale down, but the overhead of installation isn't justified for trivial work.
- For exploratory spike code that won't be reviewed or kept. AI-DLC is for software you intend to ship.
- For non-software engagement work (e.g., a roadmap, a model card, a regulator brief). AI-DLC is a software development methodology, not an engagement-output methodology.

## Further reading

- [AI-DLC GitHub repo](https://github.com/awslabs/aidlc-workflows)
- AI-DLC Method Definition Paper (linked in the AI-DLC README)
- AWS DevOps blog: "AI-Driven Development Life Cycle"
- AWS DevOps blog: "Open-sourcing adaptive workflows for AI-DLC"
- AI-DLC interaction patterns: `docs/WORKING-WITH-AIDLC.md` in the upstream repo

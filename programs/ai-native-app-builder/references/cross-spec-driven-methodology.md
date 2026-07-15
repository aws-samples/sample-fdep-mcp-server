# ⬡ Cross-Cutting — Spec-Driven Methodology

## Purpose

**This is Phase 0. Nothing gets built without it.**

Before writing any code, create a Kiro Spec that defines what you're building, how it's designed, and what tasks need to be executed. This ensures:

1. **User alignment** — The user confirms what they want before code is written
2. **Traceability** — Every file maps back to a requirement
3. **Incremental validation** — Hooks run tests after each task
4. **Scope control** — Prevents building things nobody asked for
5. **Design review** — Architecture decisions are explicit, not implicit

## The Rule

```
User says "build X"
  ↓
DO NOT start coding.
  ↓
Create a Spec (Requirements → Design → Tasks)
  ↓
User reviews and confirms
  ↓
Execute tasks one by one with validation
```

## Spec Structure for AI Applications

### 1. Requirements (What)

For each feature/capability, define:

```markdown
## Requirement: [Name]

**User Story:** As a [role], I want to [action] so that [benefit].

**Acceptance Criteria:**
- [ ] Given [context], when [action], then [result]
- [ ] Given [context], when [action], then [result]

**FDE Layer:** [Which layer this belongs to]
**Priority:** Must Have / Should Have / Nice to Have
```

**Example for Claims Processing:**

```markdown
## Requirement: File a Claim via Chat

**User Story:** As a policy holder, I want to file a claim by chatting with an AI agent so that I don't need to fill out complex forms.

**Acceptance Criteria:**
- [ ] Given I am logged in, when I send "I need to file a claim", the agent asks for my policy ID
- [ ] Given I provide a valid policy ID, the agent verifies it exists and is active
- [ ] Given I provide incident details, the agent creates a claim and returns the claim ID
- [ ] Given the claim is created, the agent tells me what documents to upload

**FDE Layer:** L6 (AI Agents) + L5a (UI)
**Priority:** Must Have
```

### 2. Design (How)

For the overall application, define:

```markdown
## Architecture

**Approach:** [Which FDE layers are active, which accelerators/patterns used]
**Tech Stack:** [Languages, frameworks, services]
**Data Model:** [Key entities and relationships]
**API Contract:** [Endpoints, request/response shapes]
**Auth Model:** [Who can do what]
```

**For each complex component, add:**

```markdown
## Component Design: [Name]

**Pattern:** [From FDE skill — e.g., "Strands Agent with tools on Lambda"]
**Inputs:** [What it receives]
**Outputs:** [What it produces]
**Dependencies:** [What it needs from other components]
**Constraints:** [Limits, rules, non-functional requirements]
```

### 3. Tasks (Do)

Break the design into ordered, implementable tasks:

```markdown
## Task 1: [Name]

**Layer:** [FDE layer]
**Files:** [What files will be created/modified]
**Dependencies:** [Which tasks must complete first]
**Validation:** [How to verify this task is done correctly]
**Estimated effort:** [S/M/L]
```

**Task ordering follows the FDE build phases:**

```
Tasks 1-3:  Phase 1 (Foundation) — CDK, Cognito, env config
Tasks 4-6:  Phase 2 (Data) — Tables, S3, seed data
Tasks 7-10: Phase 3 (Intelligence) — Agent, tools, guardrails, API
Tasks 11-14: Phase 4 (Experience) — UI pages, components
Tasks 15-17: Phase 5 (Production) — Tests, CI/CD, monitoring
```

## Hooks for Spec-Driven Development

### Post-Task Validation Hook

```json
{
  "name": "Validate After Task",
  "version": "1.0.0",
  "when": { "type": "postTaskExecution" },
  "then": {
    "type": "runCommand",
    "command": "pytest tests/unit/ -x --tb=short"
  }
}
```

### Pre-Task Reminder Hook

```json
{
  "name": "Check Spec Before Task",
  "version": "1.0.0",
  "when": { "type": "preTaskExecution" },
  "then": {
    "type": "askAgent",
    "prompt": "Before starting this task, confirm: 1) Which requirement does this satisfy? 2) What files will be created/modified? 3) How will you validate completion?"
  }
}
```

## When to Use Specs vs Direct Build

| Scenario | Approach |
|----------|----------|
| New application (greenfield) | **Always use Spec** — define all layers upfront |
| New feature (>3 files) | **Use Spec** — requirements + design + tasks |
| Bug fix (1-2 files) | **Direct build** — no spec needed |
| Refactoring | **Use Spec** — design doc showing before/after |
| Adding a single endpoint | **Direct build** — too small for spec overhead |
| Changing architecture | **Use Spec** — design review is critical |

## Spec-Driven Workflow with FDE

```
1. User: "Build a claims processing app"

2. Agent reads FDE skill → identifies layers needed:
   Infra ✅, L2 ✅, L4 ✅, L5a ✅, L5b ✅, L6 ✅, L7 ✅, Gov ✅, Obs ✅, Ind ✅

3. Agent creates Spec:
   - Requirements: 8-12 user stories covering each layer
   - Design: Architecture diagram, data model, API contract, auth model
   - Tasks: 15-20 ordered tasks following FDE build phases

4. User reviews Spec:
   - Confirms/modifies requirements
   - Approves design decisions
   - Adjusts task priorities

5. Agent executes tasks:
   - One at a time
   - Hooks validate after each
   - User can pause, redirect, or skip

6. Result: Traceable, validated, user-aligned application
```

## Anti-Patterns (What NOT to Do)

1. **Building everything in one shot** — No validation, no user input, scope creep
2. **Skipping design** — Leads to rework when architecture doesn't fit
3. **Tasks without acceptance criteria** — No way to know when "done"
4. **Not using hooks** — Manual validation doesn't scale
5. **Spec too detailed** — Don't spec every CSS class; spec capabilities and contracts
6. **Spec too vague** — "Build the UI" is not a task; "Build the Chat page with message list, input, and loading state" is

## Integration with FDE Decision Matrix

When creating a spec, use the FDE decision matrix to determine scope:

```
Application type: Claims Processing
Required layers: Infra, L2, L4, L5a, L5b, L6, L7, Gov, Obs, Ind, Res, Test, Env

→ Spec should have at least one requirement per required layer
→ Design should address each layer's architecture
→ Tasks should cover all layers in build-phase order
```

## Build Checklist (for the Spec itself)

- [ ] Requirements cover all required FDE layers
- [ ] Each requirement has acceptance criteria
- [ ] Design specifies tech stack and patterns (from FDE references)
- [ ] API contract defined (endpoints, auth, request/response)
- [ ] Data model defined (tables, keys, relationships)
- [ ] Tasks are ordered by FDE build phases
- [ ] Each task has validation criteria
- [ ] Hooks configured for post-task validation
- [ ] User has reviewed and confirmed the spec

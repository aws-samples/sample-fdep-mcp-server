---
id: produce-operating-manual
name: "Produce the AI Operating Manual"
description: "Document every AI system in the enterprise, its owner, its risk class, its operational SLAs, and its escalation path."
trigger:
  kind: command
  phrase: "/produce-operating"
outputs:
  - name: artifact
    path: artifacts/ai-ops/operating-manual-{timestamp}.md
    kind: document
---

## Objective

Produce a comprehensive AI Business Operating Manual (AI BOM) that catalogues every production AI system in the enterprise with its owner, risk class, operational SLAs, escalation path, and dependencies.

## Procedure

1. **Set scope.** Confirm which AI systems are in scope. Start with production systems only (not experiments or PoCs). Push back on "do everything" - the first version covers the top 5-10 highest-impact systems.

2. **Gather the inventory.** For each in-scope system, capture:
   - System name and purpose (one sentence)
   - Owner (team and named individual)
   - Data inputs and outputs (what flows in, what flows out)
   - Model(s) used (provider, model ID, version)
   - Upstream dependencies (data sources, APIs, services)
   - Downstream consumers (who uses this system's output for decisions?)

3. **Classify by business impact.** Assign each system to one tier:
   - **Informational** - outputs are advisory; humans always make the decision
   - **Decision-support** - outputs inform a human decision with time pressure
   - **Decision-making** - system makes decisions with human oversight
   - **Autonomous** - system acts without human approval per-decision

4. **Define operational SLAs per tier:**
   - Detection time (how fast do we know something is wrong?)
   - Response time (how fast does someone start investigating?)
   - Resolution time (how fast is the system back to normal?)
   - Escalation path (who is paged, in what order?)

5. **Document incident classification:**
   - Severity 1: System produces harmful output or makes wrong autonomous decision
   - Severity 2: System is degraded (slow, partially wrong, or unavailable)
   - Severity 3: System is behaving unexpectedly but output is still safe
   - Severity 4: Monitoring anomaly, no user-facing impact yet

6. **Map cost governance:**
   - Monthly cost per system (model inference, compute, storage)
   - Budget threshold and alerting
   - Cost anomaly detection (what triggers investigation?)

7. **Produce the artifact** using the `operating-manual` template. Every section gets content; blank sections are findings that need follow-up.

8. **Confirm sign-off.** The executive sponsor and each system owner review and acknowledge the manual. Email confirmation counts.

## Done when

- The operating manual artifact exists at the documented path.
- Every in-scope system has all fields populated (owner, tier, SLA, escalation, cost).
- The executive sponsor has signed off.
- A review cadence is agreed (monthly or quarterly) with a named owner.

## Anti-patterns

- "We'll fill this in later" - capture the gap as a finding instead.
- Including PoC systems - this manual is for production only.
- Describing aspirational state instead of actual state.
- Treating this as a deliverable for AWS - the artifact belongs to the customer.


## Handoff

The AI Operating Manual is a living document that informs:
- `resilience` program → blast radius mapping uses the system inventory from the AI BOM
- `ai-native-app-builder` → observability setup uses the SLA definitions and cost thresholds from the manual
- `aws-aidlc` Operations phase → references the AI BOM for deployment and monitoring requirements

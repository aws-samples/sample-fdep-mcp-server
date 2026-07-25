---
id: stand-up-ai-coe
name: "Stand Up an AI Centre of Excellence"
description: "Establish the cross-functional team, cadence, and review forum that owns the AI operating manual and drives operational excellence."
trigger:
  kind: command
  phrase: "/stand-up-ai-coe"
outputs:
  - name: artifact
    path: artifacts/ai-ops/coe-charter-{timestamp}.md
    kind: document
---

## Objective

Establish an AI Centre of Excellence (CoE) - the cross-functional team that owns the AI Business Operating Manual, reviews new AI system launches, facilitates incident response, and drives continuous improvement of AI operations across the enterprise.

> Reference: [Establishing AI Centres of Excellence](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-transform-adm-operating-model-gen-ai/org-capability-layer.html) from AWS Prescriptive Guidance.

## Procedure

1. **Define the CoE charter.** Document:
   - Mission statement (one sentence: why does this CoE exist?)
   - Scope (which AI systems, teams, and decisions does it cover?)
   - Authority (advisory only, or gate-keeping approval on production launches?)
   - Success metrics (how do you know the CoE is working?)

2. **Define membership.** The CoE is cross-functional by design:
   - **Chair** - senior engineering or product leader (not a manager of managers - someone who still reads code)
   - **AI/ML representative** - knows model behaviour, evaluation, drift
   - **Platform representative** - knows infrastructure, deployment, cost
   - **Security representative** - knows data classification, access control, threat model
   - **Business representative** - knows customer impact, revenue implications
   - **Compliance/legal representative** (if regulated industry)
   - **Rotating guest** - the owner of whatever system is being reviewed this cycle

3. **Define cadence:**
   - **Weekly standup** (30 min) - incident review, new launches pending, blockers
   - **Monthly deep-dive** (90 min) - one system's operational health reviewed in detail
   - **Quarterly roadmap** (half-day) - AI BOM refresh, lessons learned, process improvements
   - **Ad-hoc** - Sev 1/2 post-incident reviews within 5 business days of resolution

4. **Define the launch review process:**
   - Before any new AI system goes to production, the CoE reviews:
     - Operational readiness (monitoring, alerting, runbook, on-call)
     - Safety readiness (guardrails, evaluation results, red-team if applicable)
     - Cost governance (budget, anomaly detection)
     - Data governance (classification, access, retention)
   - Review is pass/fail with documented conditions for remediation

5. **Define the continuous improvement loop:**
   - Every PIR produces at least one process improvement recommendation
   - Recommendations are tracked in the CoE's backlog with owners and deadlines
   - Quarterly roadmap reviews close or escalate stale recommendations

6. **Produce the CoE charter artifact** covering all the above.

## Done when

- CoE charter artifact exists with mission, membership, cadence, and launch review process.
- At least one named person is assigned to each membership role.
- The first meeting is scheduled (within 2 weeks of charter sign-off).
- The executive sponsor has signed off on the charter and its authority level.

## Anti-patterns

- A CoE that only has engineers and no business voice - it will optimize for technical metrics that don't map to customer outcomes.
- A CoE with no authority - "advisory only" CoEs are ignored within 90 days.
- A CoE that reviews everything - scope it to production AI systems, not experiments.
- Quarterly-only cadence - too slow for incident patterns to surface.

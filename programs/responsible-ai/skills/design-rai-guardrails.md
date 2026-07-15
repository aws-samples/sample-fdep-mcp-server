---
id: design-rai-guardrails
name: "Design RAI Guardrails"
description: "Produce a workload-specific guardrail design — input filters, output filters, human-in-the-loop points, and monitoring — that addresses high-risk findings from a completed RAI review."
trigger:
  kind: command
  phrase: "/rai-guardrails"
outputs:
  - name: guardrails
    path: artifacts/rai-guardrails/guardrails-{timestamp}.md
    kind: document
---

## Objective

Convert the high-risk findings from a completed RAI review into an implementable guardrail design. The design tells engineering exactly what to build; the design tells compliance exactly what's enforced.

## Procedure

1. Read the most recent `artifacts/rai-reviews/rai-*.md` artifact.
2. For every high-risk finding, propose at least one of:
   - **Input guardrail** — prompt sanitization, PII redaction, jailbreak detection, topic restriction
   - **Output guardrail** — toxicity filter, factuality check, citation requirement, scope limiter
   - **Human-in-the-loop checkpoint** — which decisions require a human, by what SLA, with what authority
   - **Monitoring / observability** — what signals to log, what thresholds trigger an alert, who owns the alert
3. For each guardrail, specify:
   - **Where it sits** in the request/response path (pre-prompt, post-retrieval, post-generation, post-publish)
   - **Implementation approach** (Bedrock Guardrails, open-source library, custom, vendor)
   - **Measurable KPI** (e.g., "99% of PII redaction recall on the validation set")
   - **Failure mode** (what happens when the guardrail itself fails)
4. Produce `artifacts/rai-guardrails/guardrails-{timestamp}.md` as a spec engineering can implement from.
5. Cross-link each guardrail back to the RAI review finding it addresses so compliance can audit the chain: finding → mitigation → guardrail → test.

## Done when

- The guardrail design artifact exists.
- Every high-risk finding has at least one guardrail proposed with a clear owner, implementation approach, and measurable KPI.
- Every guardrail has a failure mode described.
- Compliance and engineering have both signed off that the design addresses the findings and is implementable.


## Handoff to Implementation

This skill produces the guardrail **design spec**. Implementation happens in `ai-native-app-builder`:

- Bedrock Guardrails configuration → CDK construct in `cross-governance-security.md` patterns
- Custom guardrails (input/output filters) → Lambda middleware in the agent pipeline
- HITL checkpoints → Step Functions approval gates or in-app queue
- Monitoring/alerting → CloudWatch alarms per `cross-observability-evaluation.md` patterns

Sequence:
```
/rai-review → produces findings with risk ratings
    ↓
/rai-guardrails → converts findings to implementable guardrail spec (this skill)
    ↓
/build-app → ai-native-app-builder implements guardrails in CDK + agent code
```

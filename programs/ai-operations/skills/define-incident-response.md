---
id: define-incident-response
name: "Define Incident Response"
description: "Per-system incident-response runbook covering severity classes, on-call rotation, and post-incident review process."
trigger:
  kind: command
  phrase: "/define-incident"
outputs:
  - name: artifact
    path: artifacts/ai-ops/incident-response-{timestamp}.md
    kind: document
---

## Objective

Define an AI-specific incident response framework that covers detection, triage, response, resolution, and post-incident review for every production AI system. AI incidents differ from traditional software incidents because model behaviour is probabilistic, failures can be silent, and impact may not be immediate.

## Procedure

1. **Identify AI-specific failure modes.** For each system in the AI BOM, document:
   - Silent regression (model output quality degrades without errors)
   - Hallucination spike (factually wrong outputs increase)
   - Prompt injection (adversarial input bypasses guardrails)
   - Data drift (input distribution shifts from training data)
   - Cost runaway (token usage spikes unexpectedly)
   - Availability failure (model endpoint unreachable)
   - Guardrail bypass (safety filters fail to catch harmful output)

2. **Define severity levels for AI incidents:**
   - **Sev 1 - Harmful output:** System produced output that caused harm (financial, reputational, safety). Immediate page. All hands until resolved.
   - **Sev 2 - Wrong autonomous decision:** System made an incorrect decision without human check. Page within 15 minutes.
   - **Sev 3 - Degraded quality:** System output quality measurably below baseline but no harm. Investigate within 1 hour.
   - **Sev 4 - Anomaly detected:** Monitoring flagged something unusual. Investigate within 1 business day.

3. **Define the on-call rotation:**
   - Primary responder (AI/ML engineer or AI SRE)
   - Secondary responder (platform engineer)
   - Escalation path (engineering manager -> director -> VP)
   - Communication plan (who notifies the business, customers, regulators?)

4. **Define detection mechanisms per failure mode:**
   - Golden-set evaluation (daily regression check against known-good outputs)
   - Guardrail hit-rate monitoring (sudden spike = potential bypass)
   - Cost anomaly alerts (> 2x daily average triggers investigation)
   - Latency monitoring (p99 latency breach)
   - User feedback signals (thumbs-down rate, escalation rate)

5. **Define the post-incident review (PIR) process:**
   - Timeline reconstruction (what happened, when, who noticed)
   - Root cause (model, data, prompt, infrastructure, guardrail, or human error?)
   - Impact assessment (users affected, decisions influenced, financial cost)
   - Remediation (what was done to fix it)
   - Prevention (what changes prevent recurrence)
   - Lessons learned (what do we now know that we didn't before?)

6. **Produce the artifact** with one section per system, one runbook per Sev 1/2 failure mode.

## Done when

- Incident response artifact exists for every Sev 1 and Sev 2 failure mode.
- On-call rotation is defined with named roles (not people - roles survive rotation).
- Detection mechanisms are documented and at least one (golden-set or cost anomaly) is implemented.
- PIR process is documented and has been reviewed by the engineering manager.
- A tabletop exercise date is scheduled (within 30 days of artifact completion).

## Anti-patterns

- Copy-pasting traditional SRE runbooks without AI-specific failure modes.
- Defining detection without implementing at least one mechanism.
- Skipping the tabletop exercise - the runbook is untested until exercised.


## Handoff to Implementation

This skill produces the incident response **framework** (design artifact). Implementation happens in:

- Detection mechanisms → `ai-native-app-builder` CloudWatch alarms per `cross-observability-evaluation.md`
- Golden-set evaluation → scheduled Lambda with test queries (built during `/build-app`)
- Cost anomaly alerts → AWS Cost Anomaly Detection (configured in CDK)
- On-call integration → PagerDuty/OpsGenie setup (manual, outside kit scope)
- **Autonomous investigation → AWS DevOps Agent** (enable in production account — correlates metrics, logs, deployments and produces RCA before humans investigate)
- **AI-specific monitoring → Custom SRE agents via MCP/A2A** (for failure modes DevOps Agent doesn't natively understand: hallucination spikes, guardrail bypass, model drift)

The `resilience` program's `/run-chaos-day` skill validates that this incident response framework actually works under failure conditions.

### AWS DevOps Agent Integration

The AI Operating Manual and incident response framework become **configuration inputs** for AWS DevOps Agent:

| Policy decision (this skill) | DevOps Agent behaviour |
|------------------------------|----------------------|
| Severity definitions | Which alarms trigger investigation |
| Escalation paths | Who receives the RCA findings |
| Detection mechanisms | What telemetry DevOps Agent correlates |
| SLA targets | When to escalate vs continue investigating |

Reference: https://docs.aws.amazon.com/devopsagent/latest/userguide/

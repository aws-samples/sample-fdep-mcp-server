---
id: design-hitl
name: "Design Human-in-the-Loop"
description: "Define when human approval is required, escalation paths, timeout behaviour, and confidence thresholds for agent autonomy."
trigger:
  kind: command
  phrase: "/design-hitl"
outputs:
  - name: artifact
    path: artifacts/agents/hitl-{timestamp}.md
    kind: document
---

## Objective

Design the human-in-the-loop (HITL) policy for an agentic system. Define where the agent operates autonomously vs where it must pause for human approval, and what happens at each boundary.

## HITL Decision Framework

### Autonomy Levels

| Level | Agent behaviour | Human role | Use when |
|-------|----------------|-----------|----------|
| **Full autonomy** | Acts without checking | Monitor only (async review) | Low-risk, reversible actions (read operations, formatting) |
| **Inform** | Acts and notifies human | Acknowledge receipt | Medium-risk actions with clear rollback (sending emails, updating records) |
| **Approve** | Proposes action, waits for approval | Explicit yes/no | High-risk or irreversible actions (financial transactions, data deletion, external API calls) |
| **Collaborate** | Drafts, human edits, agent finalises | Active co-creation | Creative/judgement tasks (customer communications, strategic decisions) |
| **Human-only** | Agent cannot perform | Human executes | Regulated actions requiring human accountability (compliance sign-off, legal) |

### Decision Criteria

For each agent action, ask:

1. **Reversibility** — Can this be undone? If no → Approve or higher
2. **Blast radius** — How many users/systems affected? High → Approve
3. **Confidence** — Can the agent reliably assess correctness? Low → Approve
4. **Regulatory** — Does regulation require human oversight? Yes → Approve or Human-only
5. **Cost** — Could this incur significant spend? Yes → Approve with cost display

### Escalation Design

For each approval gate, document:

| Element | What to define |
|---------|---------------|
| **Trigger** | What condition causes escalation (confidence < threshold, action type, cost > limit) |
| **Context** | What the human sees (agent reasoning, evidence, confidence score, proposed action) |
| **Channel** | How approval is requested (in-app queue, Slack, email, SMS for urgent) |
| **Timeout** | What happens if no response (retry, escalate to manager, abort, default-deny) |
| **Audit** | How the decision is recorded (who approved, when, what context they saw) |

### Confidence Thresholds

```
Confidence > 0.95  → Full autonomy (act immediately)
0.80 < Confidence ≤ 0.95 → Inform (act + notify)
0.60 < Confidence ≤ 0.80 → Approve (wait for human)
Confidence ≤ 0.60  → Collaborate (human takes lead)
```

Adjust thresholds per action type — financial actions should have higher thresholds than informational ones.

### Timeout Policies

| Urgency | Timeout | On timeout |
|---------|---------|-----------|
| Critical (production incident) | 5 min | Escalate to on-call manager |
| High (customer-facing action) | 1 hour | Queue for next available approver |
| Normal (internal workflow) | 24 hours | Retry notification × 3, then abort |
| Low (batch/async) | 72 hours | Hold in queue indefinitely |

## Output Template

```markdown
# HITL Policy — [Agent Name]

## Action Classification

| Action | Autonomy Level | Confidence Threshold | Timeout | Escalation |
|--------|---------------|---------------------|---------|------------|
| [action 1] | [level] | [threshold] | [time] | [who] |

## Approval UX
[How the human sees and acts on approval requests]

## Timeout Behaviour
[What happens when humans don't respond]

## Audit Trail
[How decisions are logged for compliance]

## Edge Cases
[What happens in ambiguous situations]
```

## Done when

- HITL policy document exists with every agent action classified
- Confidence thresholds are defined and justified
- Timeout behaviour is specified for each urgency level
- Escalation paths have named owners
- The customer's compliance team has reviewed the policy

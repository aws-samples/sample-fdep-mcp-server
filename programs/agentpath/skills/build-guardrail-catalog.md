---
id: build-guardrail-catalog
name: "Build Guardrail Catalog"
description: "Catalogue input, output, action, and observability guardrails. Map each to a risk class and AWS implementation (Bedrock Guardrails, custom logic, or infrastructure controls)."
trigger:
  kind: command
  phrase: "/build-guardrail-catalog"
outputs:
  - name: artifact
    path: artifacts/agents/guardrail-catalog-{timestamp}.md
    kind: document
---

## Objective

Build a comprehensive guardrail catalog for an agentic system. Map every risk to a specific control, implementation path, and monitoring strategy.

## Guardrail Taxonomy

### Layer 1: Input Guardrails (before the LLM sees the prompt)

| Guardrail | Purpose | AWS Implementation |
|-----------|---------|-------------------|
| **Content filter** | Block harmful/inappropriate input | Bedrock Guardrails — content filter policy |
| **Denied topics** | Prevent off-topic requests | Bedrock Guardrails — denied topic policy |
| **PII detection** | Redact/block sensitive data in input | Bedrock Guardrails — sensitive info filter |
| **Word filter** | Block specific terms/profanity | Bedrock Guardrails — word filter |
| **Input length cap** | Prevent token-stuffing attacks | Lambda validation layer |
| **Rate limiting** | Prevent abuse/cost runaway | API Gateway throttling + WAF |
| **Authentication** | Verify caller identity | Cognito + IAM |

### Layer 2: Output Guardrails (after the LLM responds)

| Guardrail | Purpose | AWS Implementation |
|-----------|---------|-------------------|
| **Grounding check** | Verify output is grounded in source material | Bedrock Guardrails — grounding policy |
| **Hallucination detection** | Flag unsupported claims | Bedrock Guardrails — contextual grounding |
| **PII in output** | Prevent leaking sensitive data | Bedrock Guardrails — sensitive info filter (output) |
| **Content filter (output)** | Block harmful generated content | Bedrock Guardrails — output content filter |
| **Format validation** | Ensure output matches expected schema | Lambda post-processing |
| **Confidence scoring** | Flag low-confidence responses for HITL | Custom logic in agent framework |

### Layer 3: Action Guardrails (before the agent executes tools)

| Guardrail | Purpose | AWS Implementation |
|-----------|---------|-------------------|
| **Tool allowlist** | Agent can only call approved tools | Strands Agents tool registration |
| **Parameter validation** | Validate tool arguments before execution | Pydantic/Zod schemas on tool inputs |
| **Cost cap** | Block actions that exceed spend threshold | Custom budget check before execution |
| **Blast radius limit** | Prevent wide-impact actions without approval | HITL gate (see `/design-hitl`) |
| **Idempotency** | Prevent duplicate actions on retry | DynamoDB idempotency keys |
| **Sandbox execution** | Run untrusted code in isolation | Lambda with minimal IAM role |

### Layer 4: Observability Guardrails (runtime monitoring)

| Guardrail | Purpose | AWS Implementation |
|-----------|---------|-------------------|
| **Token usage tracking** | Monitor cost per request/session | CloudWatch custom metrics |
| **Latency alarms** | Alert on degraded response times | CloudWatch Alarms |
| **Error rate monitoring** | Detect agent failure patterns | CloudWatch + SNS |
| **Guardrail trigger rate** | Track how often guardrails fire | Bedrock Guardrails metrics |
| **Drift detection** | Alert when agent behaviour shifts | Custom evaluation pipeline |
| **Audit logging** | Record all agent decisions for compliance | CloudTrail + custom history.jsonl |

## Procedure

1. **List all agent actions.** Every tool, every external call, every data access.

2. **Risk-classify each action:**
   - What could go wrong? (confidentiality, integrity, availability, compliance)
   - What's the blast radius? (one user, many users, external systems)
   - Is it reversible?

3. **Map to guardrail layers:**
   - Input risk → Layer 1 control
   - Output risk → Layer 2 control
   - Action risk → Layer 3 control
   - Runtime risk → Layer 4 control

4. **Select implementation:**
   - Can Bedrock Guardrails handle it natively? → Use Bedrock Guardrails
   - Needs custom logic? → Lambda/agent framework code
   - Needs infrastructure control? → IAM, VPC, WAF

5. **Define monitoring:**
   - How do you know the guardrail fired?
   - What's the alert threshold?
   - Who gets notified?

## Output Template

```markdown
# Guardrail Catalog — [Agent Name]

## Risk Classification

| Action | Risk | Impact | Reversible | Guardrail Layer |
|--------|------|--------|-----------|----------------|

## Bedrock Guardrails Configuration

```json
{
  "contentFilter": { ... },
  "deniedTopics": [ ... ],
  "sensitiveInfoFilter": { ... },
  "groundingPolicy": { ... }
}
```

## Custom Guardrails

| Guardrail | Implementation | Trigger | Response |
|-----------|---------------|---------|----------|

## Monitoring & Alerting

| Metric | Threshold | Alarm | Notification |
|--------|-----------|-------|-------------|

## Incident Mapping

| Guardrail | When it fires | Incident class | Runbook |
|-----------|--------------|----------------|---------|
```

## Done when

- Every agent action has at least one guardrail mapped
- Bedrock Guardrails policy is documented (ready for implementation)
- Custom guardrails have implementation specs
- Monitoring thresholds and alert owners are defined
- The catalog has been reviewed against the customer's compliance requirements

## Handoff

Once the guardrail catalog is complete, implementation happens via:
- `/build-app` — the `ai-native-app-builder` applies guardrails during construction
- Bedrock Guardrails configuration is deployed as part of the CDK stack

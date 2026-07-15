# ⬡ Cross-Cutting — AI Governance & Security

## Purpose

Spans all 7 layers. Ensures AI applications are safe, compliant, auditable, and respect data boundaries. This is not optional — every production AI app needs governance.

## Coverage: 70% (Good — guardrails and audit exist, RBAC templates and responsible AI dashboards need work)

## Capabilities

### 1. Guardrails & Content Filtering

**Coverage:** ✅ Both (Accel #14 + Agentic #33)

| Resource | Link |
|----------|------|
| Guardrails API | https://aws-samples.github.io/amazon-bedrock-samples/introduction-to-bedrock/bedrock_apis/02_guardrails_api/ |
| Human-in-the-Loop for Bedrock Agents | https://docs.aws.amazon.com/bedrock/latest/userguide/agents-hitl.html |
| CfnGuardrail CDK | https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnGuardrail.html |

**Guardrail configuration (CDK):**

```python
guardrail = bedrock.CfnGuardrail(self, "AppGuardrail",
    name="app-guardrail",
    blocked_input_messaging="I cannot process that request.",
    blocked_output_messaging="I cannot provide that information.",
    content_policy_config=bedrock.CfnGuardrail.ContentPolicyConfigProperty(
        filters_config=[
            {"type": "HATE", "input_strength": "HIGH", "output_strength": "HIGH"},
            {"type": "INSULTS", "input_strength": "HIGH", "output_strength": "HIGH"},
            {"type": "SEXUAL", "input_strength": "HIGH", "output_strength": "HIGH"},
            {"type": "VIOLENCE", "input_strength": "HIGH", "output_strength": "HIGH"},
            {"type": "MISCONDUCT", "input_strength": "HIGH", "output_strength": "HIGH"},
            {"type": "PROMPT_ATTACK", "input_strength": "HIGH", "output_strength": "NONE"},
        ]
    ),
    topic_policy_config=bedrock.CfnGuardrail.TopicPolicyConfigProperty(
        topics_config=[
            {
                "name": "OffTopic",
                "definition": "Topics unrelated to the application's purpose",
                "type": "DENY",
            }
        ]
    ),
)
```

### 2. PII Detection & Redaction

**Coverage:** 🔵 Accel #15

| Resource | Link |
|----------|------|
| BDA PII Redaction | https://github.com/aws-samples/sample-bda-redaction |
| Sensitive Information Filters | https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-sensitive-filters.html |
| Comprehend PII Detection | https://docs.aws.amazon.com/comprehend/latest/dg/how-pii.html |

**PII handling strategy:**

| Data Type | Action | Where |
|-----------|--------|-------|
| SSN, Credit Card | BLOCK | Guardrail (never process) |
| Email, Phone, Name | ANONYMIZE | Guardrail (mask in logs) |
| Medical records | ENCRYPT | S3 SSE-KMS + DynamoDB encryption |
| Financial data | ENCRYPT + AUDIT | KMS + CloudTrail |

**Guardrail PII config:**

```python
sensitive_information_policy_config=bedrock.CfnGuardrail.SensitiveInformationPolicyConfigProperty(
    pii_entities_config=[
        {"type": "EMAIL", "action": "ANONYMIZE"},
        {"type": "PHONE", "action": "ANONYMIZE"},
        {"type": "NAME", "action": "ANONYMIZE"},
        {"type": "US_SOCIAL_SECURITY_NUMBER", "action": "BLOCK"},
        {"type": "CREDIT_DEBIT_CARD_NUMBER", "action": "BLOCK"},
        {"type": "CREDIT_DEBIT_CARD_CVV", "action": "BLOCK"},
    ],
    regexes_config=[
        {"name": "InternalId", "pattern": "INT-[A-Z0-9]{8}", "action": "ANONYMIZE"},
    ]
)
```

### 3. Human-in-the-Loop Controls

**Coverage:** 🟠 Partial (Accel #16 + Agentic #33)

| Resource | Link |
|----------|------|
| Bedrock Agents HITL | https://docs.aws.amazon.com/bedrock/latest/userguide/agents-hitl.html |

**HITL patterns:**
- **Approval gates** — Step Functions wait for human callback before proceeding
- **Confidence thresholds** — Route low-confidence decisions to humans
- **Value thresholds** — High-value actions require human sign-off
- **Audit review** — Random sampling of agent decisions for quality

**Step Functions HITL:**

```python
# Wait for human approval
approval_task = sfn.CustomState(self, "WaitForApproval",
    state_json={
        "Type": "Task",
        "Resource": "arn:aws:states:::sqs:sendMessage.waitForTaskToken",
        "Parameters": {
            "QueueUrl": approval_queue.queue_url,
            "MessageBody": {"taskToken.$": "$$.Task.Token", "decision.$": "$.decision"},
        },
    },
)
```

### 4. Access Controls & Data Boundaries

**Coverage:** 🟠 Partial (Accel #19 + Agentic #43, #63)

| Resource | Link |
|----------|------|
| Gateway User Federation | https://github.com/aws-samples/sample-bedrock-agentcore-gateway-user-federation |

**RBAC pattern for AI apps:**

```
Cognito Groups → API Gateway Authorizer → Lambda (check groups) → Data filtering
```

- **Users** see only their own data
- **Operators** see all data, can take actions
- **Admins** full access + user management

**Data boundary enforcement:**
- Filter DynamoDB queries by user ID for non-admin roles
- S3 prefix-based access (users can only access `s3://bucket/users/{userId}/`)
- Agent tools should respect caller's permissions

### 5. Audit Trails & Traceability

**Coverage:** ✅ Both (Accel #17 + Agentic #93)

| Resource | Link |
|----------|------|
| Bedrock Agent Trace Events | https://docs.aws.amazon.com/bedrock/latest/userguide/trace-events.html |
| CloudTrail | https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html |
| One Observability Demo | https://github.com/aws-samples/one-observability-demo |

**Audit requirements:**
- All agent decisions logged (what was decided, why, by whom)
- All data access logged (who accessed what, when)
- All state changes tracked (DynamoDB Streams → audit table)
- Immutable audit trail (write-once, no delete)

**DynamoDB Streams for audit:**

```python
table.add_global_secondary_index(...)  # For querying audit records

# Enable streams
claims_table = dynamodb.Table(self, "ClaimsTable",
    stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
)

# Lambda processes stream → writes to audit table
audit_lambda = lambda_.Function(self, "AuditFunction", ...)
claims_table.grant_stream_read(audit_lambda)
audit_lambda.add_event_source(DynamoEventSource(claims_table, starting_position=...))
```

### 6. Model Evaluation & Grounding Checks

**Coverage:** 🔵 Accel #20

| Resource | Link |
|----------|------|
| Bedrock Model Evaluation | https://github.com/aws-samples/sample-bedrock-model-evaluation |
| Automated Reasoning Checks | https://aws.amazon.com/blogs/machine-learning/how-automated-reasoning-checks-in-amazon-bedrock-transform-generative-ai-compliance |
| Contextual Grounding | https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-components.html |

**Grounding checks in guardrails:**

```python
# Detect hallucinations
contextual_grounding_policy_config={
    "filters_config": [
        {"type": "GROUNDING", "threshold": 0.7},
        {"type": "RELEVANCE", "threshold": 0.7},
    ]
}
```

### 7. Responsible AI Dashboard

**Coverage:** 🟠 Partial (Accel #21 — needs scoping)

No unified dashboard exists. Use:
- SageMaker Clarify for bias detection
- Bedrock Guardrails metrics in CloudWatch
- Custom dashboard combining guardrail blocks, PII detections, escalation rates

## Build Checklist

- [ ] Configure Bedrock Guardrails (content filtering + PII)
- [ ] Set up Cognito groups for RBAC
- [ ] Implement data boundary enforcement in Lambda handlers
- [ ] Enable CloudTrail for API audit
- [ ] Set up DynamoDB Streams for state change audit
- [ ] Add HITL gates for high-stakes decisions
- [ ] Configure contextual grounding checks
- [ ] Encrypt all sensitive data (KMS)
- [ ] Set up denied topics in guardrails
- [ ] Document data handling policies

## Common Mistakes

1. **Guardrails only on output** — Apply to BOTH input and output
2. **PII in CloudWatch logs** — Use ANONYMIZE action, not just BLOCK
3. **No audit for agent tool calls** — Log every tool invocation with parameters
4. **RBAC only on frontend** — Always enforce on backend; frontend checks are cosmetic
5. **Missing encryption** — DynamoDB, S3, and SNS should all use encryption at rest

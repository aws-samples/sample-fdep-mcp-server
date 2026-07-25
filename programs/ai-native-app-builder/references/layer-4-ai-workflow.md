# Layer 4 — AI Workflow

## Purpose

Reusable workflows and automation that orchestrate AI capabilities. This layer connects agents, models, and services into coherent business processes using Step Functions, API Gateway, and prompt chaining.

## Coverage: 65% (Good — core patterns exist, decision tables need building)

## Capabilities

### 1. API Gateway

**Coverage:** ✅ Both (Accel #27 + Agentic #57)

| Resource | Link |
|----------|------|
| ServerlessLand (400+ patterns) | https://github.com/aws-samples/serverless-patterns |
| GenAI Agent Workflows + Step Functions | https://github.com/aws-samples/build-genai-agent-workflows-with-step-functions |

**Standard API patterns for AI apps:**

```python
# REST API with Cognito auth
api = apigw.RestApi(self, "AppApi",
    default_cors_preflight_options=apigw.CorsOptions(
        allow_origins=apigw.Cors.ALL_ORIGINS,
        allow_methods=apigw.Cors.ALL_METHODS,
        allow_headers=["Content-Type", "Authorization"],
    ),
)

authorizer = apigw.CognitoUserPoolsAuthorizer(self, "Authorizer",
    cognito_user_pools=[user_pool]
)

# All endpoints require auth
resource.add_method("POST", lambda_integration,
    authorizer=authorizer,
    authorization_type=apigw.AuthorizationType.COGNITO,
)
```

**API design for agent apps:**
- `POST /chat` — Send message to agent (streaming or sync)
- `POST /tasks` — Create async task for agent
- `GET /tasks/{id}` — Check task status
- `POST /documents/upload` — Get presigned URL for document upload
- `GET /documents/{id}` — Get document metadata/status

### 2. AI Native Process Automation (Step Functions + Prompt Chaining)

**Coverage:** 🟢 Agentic #57, #58

| Resource | Link |
|----------|------|
| Step Functions + Bedrock Integration | https://docs.aws.amazon.com/step-functions/latest/dg/connect-bedrock.html |
| Prompt Chaining Sample | https://docs.aws.amazon.com/step-functions/latest/dg/sample-bedrock-prompt-chaining.html |
| Orchestrate GenAI Workflows | https://aws.amazon.com/blogs/machine-learning/orchestrate-generative-ai-workflows-with-amazon-bedrock-and-aws-step-functions/ |
| Serverless Prompt Chaining | https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-chaining.html |

**Pattern: Multi-step AI pipeline with Step Functions**

```
Start → Classify Document → Extract Data → Validate → Route Decision
                                                          ├── Auto-approve → Notify
                                                          ├── Escalate → Human Review
                                                          └── Reject → Notify
```

**Step Functions + Bedrock CDK:**

```python
from aws_cdk import aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks

# Invoke Bedrock model in a Step Function
classify_task = tasks.BedrockInvokeModel(self, "ClassifyDocument",
    model=bedrock.FoundationModel.from_foundation_model_id(
        self, "Claude", bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0
    ),
    body=sfn.TaskInput.from_object({
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [{"role": "user", "content": sfn.JsonPath.string_at("$.prompt")}],
        "max_tokens": 1000,
    }),
    result_selector={"classification": sfn.JsonPath.string_at("$.Body.content[0].text")},
)
```

**When to use Step Functions vs Agent:**
- **Step Functions:** Deterministic workflows, parallel processing, human approval gates, long-running processes (>15 min)
- **Agent:** Conversational, dynamic decision-making, tool selection, multi-turn interactions

### 3. Decision Tables

**Coverage:** 🟠 Partial (Accel #13)

| Resource | Link |
|----------|------|
| Workflow Automation Agent | New — scope being defined |

**Gap:** No pre-built decision table engine. Options:
- Encode rules in DynamoDB (condition → action mapping)
- Use Step Functions Choice states for branching logic
- Use Bedrock with structured prompts for complex decisions
- Build a rules engine Lambda that evaluates conditions

**Pattern for business rules:**

```python
# DynamoDB-based decision table
RULES_TABLE = {
    "claim_amount > 10000": {"action": "escalate", "reason": "High value"},
    "fraud_score > 0.8": {"action": "deny", "reason": "Fraud detected"},
    "all_docs_valid AND amount <= deductible": {"action": "deny", "reason": "Below deductible"},
    "all_docs_valid AND amount > deductible": {"action": "approve", "reason": "Valid claim"},
}
```

## Workflow Patterns for AI Apps

### Pattern 1: Synchronous Agent Chat

```
Client → API GW → Lambda → Agent → Response → Client
```
Simple, <30s response time. Good for conversational UIs.

### Pattern 2: Async Task Processing

```
Client → API GW → SQS → Lambda → Agent → DynamoDB (result)
Client polls GET /tasks/{id} for status
```
For long-running tasks (document processing, multi-step analysis).

### Pattern 3: Event-Driven Pipeline

```
S3 Upload → EventBridge → Step Functions → [Classify, Extract, Validate, Route] → DynamoDB + SNS
```
For batch processing, document pipelines, automated workflows.

### Pattern 4: Human-in-the-Loop

```
Agent → Step Functions → Wait for Callback → Human approves/rejects → Continue
```
For high-stakes decisions requiring human oversight.

## Build Checklist

- [ ] Define API endpoints (REST or WebSocket for streaming)
- [ ] Set up API Gateway with Cognito authorizer
- [ ] Identify which processes are deterministic (Step Functions) vs dynamic (Agent)
- [ ] Build Step Functions state machines for multi-step pipelines
- [ ] Implement async patterns for long-running operations
- [ ] Add human-in-the-loop gates for high-stakes decisions
- [ ] Set up EventBridge rules for event-driven triggers
- [ ] Define business rules (decision tables or Choice states)

## Common Mistakes

1. **Synchronous calls for long operations** — Use async + polling for anything >10s
2. **No timeout on agent invocations** — Always set Lambda timeout and Step Functions task timeout
3. **Missing error handling in state machines** — Add Catch/Retry on every task state
4. **Hardcoding business rules in Lambda** — Store in DynamoDB for easy updates without redeployment
5. **Not using Step Functions Map for parallel processing** — Process multiple documents/items concurrently

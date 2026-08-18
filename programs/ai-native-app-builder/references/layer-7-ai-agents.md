# Layer 7 — AI Agents

## Purpose

Multi-agentic autonomous execution. This is the intelligence layer — where AI agents are built, configured with tools, connected to knowledge, and orchestrated together. **Strongest layer at 95% coverage.**

## Coverage: 95% (Excellent — 30+ samples across both catalogs)

## Deep-dive: Deploying agents on AWS

**Reference material in this engagement** (no Docker, no repository required):

- `deployment-agentcore-overview.md` — decision guide: AgentCore CLI vs Starter Toolkit, deployment modes (direct code deploy, container via CodeBuild), 10 production gotchas, troubleshooting, security checklist
- `deployment-agentcore-cli.md` — `agentcore create / dev / deploy / invoke` workflow with framework selection, hot reload, project templates
- `deployment-agentcore-services.md` — full inventory of AgentCore services: Runtime, Memory, Gateway, Code Interpreter, Browser, Observability, Evaluation, Identity, Policy — with selection criteria
- `deployment-agentcore-starter-toolkit.md` — Python `bedrock-agentcore-starter-toolkit` walkthrough including IaC generation (CDK/Terraform), local testing, programmatic invocation

## Capabilities

### 1. AI Agent Builder

**Coverage:** ✅ Both (Accel #12 + Agentic #7, #8, #40, #50)

| Resource | Link |
|----------|------|
| Bedrock Agent Samples | https://github.com/awslabs/amazon-bedrock-agent-samples |
| AgentCore Samples (13) | https://github.com/awslabs/amazon-bedrock-agentcore-samples |
| Bedrock Engineer | https://github.com/aws-samples/bedrock-engineer |
| Strands Agents SDK | https://github.com/strands-agents/sdk-python |
| Strands Agents Samples | https://github.com/strands-agents/samples |

**Three agent approaches:**

| Approach | Framework | Best For | Deployment |
|----------|-----------|----------|------------|
| Strands Agents | Python SDK | Custom agents, full control, any model | AgentCore Runtime or Lambda |
| Bedrock Agents | Managed | Quick setup, action groups, managed orchestration | Bedrock service |
| Multi-framework | LangGraph, CrewAI | Team already uses these | AgentCore Runtime |

**Strands Agent pattern:**

```python
from strands import Agent, tool
from strands.models.bedrock import BedrockModel

@tool
def my_tool(param: str) -> dict:
    """Tool description for the agent."""
    # Implementation
    return {"result": "..."}

# Resolve <current-inference-profile-id> live via the AWS MCP server — see
# bedrock-model-selection.md. Do not hardcode a dated model ID.
model = BedrockModel(model_id="<current-inference-profile-id>")
agent = Agent(model=model, system_prompt="...", tools=[my_tool])
response = agent("User message")
```

**Bedrock Agent pattern:**

```python
# CDK
agent = bedrock.CfnAgent(self, "MyAgent",
    agent_name="claims-agent",
    foundation_model="<current-inference-profile-id>",  # resolve live — see bedrock-model-selection.md
    instruction="You are a claims processing agent...",
    action_groups=[...],
    knowledge_bases=[...],
)
```

### 2. Enterprise Search (RAG)

**Coverage:** ✅ Both (Accel #1, #3 + Agentic #9, #37)

| Resource | Link |
|----------|------|
| Amazon Bedrock RAG | https://github.com/aws-samples/amazon-bedrock-rag |
| Deep Researcher | https://github.com/aws-samples/sample-bedrock-deep-researcher |
| Semantic Search | https://github.com/aws-samples/amazon-bedrock-samples |

### 3. Team of Agents (Multi-Agent)

**Coverage:** ✅ Both (Accel #11 + Agentic #10, #13, #34, #86)

| Resource | Link |
|----------|------|
| Agent Squad (Multi-Agent Orchestrator) | https://github.com/awslabs/multi-agent-orchestrator |
| Multi-Agent Workshop | https://github.com/aws-samples/bedrock-multi-agents-collaboration-workshop |
| Multi-Agent Orchestration Guidance | https://aws.amazon.com/solutions/guidance/multi-agent-orchestration-on-aws/ |
| Bedrock Multi-Agent Collaboration | https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html |

**Multi-agent patterns:**

| Pattern | When | How |
|---------|------|-----|
| Supervisor + Collaborators | Complex tasks needing specialization | Bedrock Multi-Agent Collaboration |
| Classifier + Specialists | Intent routing to domain experts | Agent Squad |
| Peer Collaboration | Agents negotiate/debate | Custom with A2A protocol |
| Pipeline | Sequential processing stages | Step Functions + multiple agents |

### 4. Multi-turn Chatbot

**Coverage:** 🔵 Accel #6

| Resource | Link |
|----------|------|
| Bedrock Chat | https://github.com/aws-samples/bedrock-chat |
| AWS GenAI LLM Chatbot | https://github.com/aws-samples/aws-genai-llm-chatbot |

### 5. Intent Recognition & Routing

**Coverage:** 🔵 Accel #7

| Resource | Link |
|----------|------|
| Agent Squad (classifier) | https://github.com/awslabs/multi-agent-orchestrator |
| Amazon Lex V2 | https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html |

### 6. Voice AI

**Coverage:** 🔵 Accel #8

| Resource | Link |
|----------|------|
| Amazon Transcribe | https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html |
| Amazon Polly | https://docs.aws.amazon.com/polly/latest/dg/what-is.html |
| Amazon Nova Sonic (speech-to-speech) | https://aws.amazon.com/blogs/aws/introducing-amazon-nova-2-sonic/ |

### 7. Multi-language Support

**Coverage:** 🔵 Accel #9

| Resource | Link |
|----------|------|
| Connect Chat Translate | https://github.com/aws-samples/amazon-connect-chat-translate |
| Bedrock Translation | https://aws-samples.github.io/amazon-bedrock-samples/genai-use-cases/text-generation/how_to_work_with_text_translation_w_bedrock/ |

### 8. LLM Agnostic / Multi-Framework

**Coverage:** 🟢 Agentic #49, #66-73

| Resource | Link |
|----------|------|
| Agentic Frameworks on AWS | https://github.com/aws-samples/sample-agentic-frameworks-on-aws |
| Strands TypeScript SDK | https://github.com/strands-agents/sdk-typescript |
| Agent SOP | https://github.com/strands-agents/agent-sop |

Supports: Strands, LangGraph, CrewAI, AutoGen — all deployable on AgentCore Runtime.

### 9. Contact Center Agent

**Coverage:** 🟢 Agentic #14

| Resource | Link |
|----------|------|
| Contact Center GenAI Agent | https://github.com/aws-samples/contact-center-genai-agent |

Amazon Connect + Lex + Bedrock KB integration.

### 10. Guardrails

**Coverage:** ✅ Both (Accel #14 + Agentic #33)

| Resource | Link |
|----------|------|
| Guardrails API | https://aws-samples.github.io/amazon-bedrock-samples/introduction-to-bedrock/bedrock_apis/02_guardrails_api/ |
| CfnGuardrail CDK | https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnGuardrail.html |

**Always add guardrails:**

```python
guardrail = bedrock.CfnGuardrail(self, "AppGuardrail",
    name="app-guardrail",
    blocked_input_messaging="I cannot process that request.",
    blocked_output_messaging="I cannot provide that information.",
    content_policy_config=bedrock.CfnGuardrail.ContentPolicyConfigProperty(
        filters_config=[
            {"type": "HATE", "input_strength": "HIGH", "output_strength": "HIGH"},
            {"type": "VIOLENCE", "input_strength": "HIGH", "output_strength": "HIGH"},
        ]
    ),
    sensitive_information_policy_config=bedrock.CfnGuardrail.SensitiveInformationPolicyConfigProperty(
        pii_entities_config=[
            {"type": "EMAIL", "action": "ANONYMIZE"},
            {"type": "PHONE", "action": "ANONYMIZE"},
            {"type": "US_SOCIAL_SECURITY_NUMBER", "action": "BLOCK"},
        ]
    ),
)
```

## Agent Design Principles

1. **Single responsibility** — Each agent should do one thing well
2. **Clear tool descriptions** — LLM selects tools based on docstrings; be precise
3. **Fail gracefully** — Tools should return error dicts, not raise exceptions
4. **Human escalation** — Always have an escape hatch for edge cases
5. **Guardrails always on** — Never deploy without content filtering
6. **Session management** — Use AgentCore Memory for multi-turn context
7. **Evaluation before production** — Test with diverse inputs, measure quality

## Advanced Agent Patterns (from Agentic Catalog)

### Reflection Pattern (Agentic #22)

Agent reviews and self-corrects its own output before returning:

```python
# Agent generates response → reviews it → corrects if needed
REFLECTION_PROMPT = """Review your previous response for:
1. Factual accuracy (grounded in retrieved data)
2. Completeness (all user questions answered)
3. Tone (professional, empathetic)
If issues found, provide a corrected response. If acceptable, return as-is."""
```

Reference: https://builder.aws.com/content/2zo16pNcEvQHtHpwSa...

### Agent-to-Agent (A2A) Protocol (Agentic #24)

Standard protocol for agents to communicate with each other across systems:

```python
# Agent A calls Agent B via A2A protocol on AgentCore Runtime
# Enables cross-team, cross-framework agent collaboration
```

### Computer Use / Browser Automation (Agentic #30)

Agent controls a browser to interact with web applications:

```python
# Bedrock Agents Computer Use — automate web-based workflows
# Use case: Fill forms, extract data from legacy web apps, test UIs
```

### Dynamic Inline Agents (Agentic #31)

Configure agent behavior at runtime without redeployment:

```python
# Create agent configuration dynamically based on user role/context
# Useful for multi-tenant apps where each tenant has different rules
```

### Custom Orchestrator (Agentic #32)

Build custom routing logic instead of using default orchestration:

```python
# Override default ReAct loop with custom decision logic
# Useful when you need deterministic routing for certain inputs
```

### Agent SOP — Standard Operating Procedures (Agentic #46)

Structure agent behavior around documented SOPs:

```python
# Agent follows step-by-step procedures from SOP documents
# Combines RAG (retrieve SOP) + structured execution
```

Reference: https://github.com/strands-agents/agent-sop

### Durable Agent Workflows — Temporal + Strands (Agentic #113)

Agent workflows that survive failures and can resume:

```python
# Temporal provides durable execution guarantees
# Agent state persists across crashes, timeouts, deployments
# Use for long-running multi-step processes (claims, onboarding)
```

Reference: https://github.com/temporal-community/bedrock-agen...

## Build Checklist

- [ ] Choose agent framework (Strands, Bedrock Agents, or multi-framework)
- [ ] Define system prompt with clear role, capabilities, and rules
- [ ] Implement tools with proper type hints and docstrings
- [ ] Add guardrails (content filtering + PII protection)
- [ ] Set up Knowledge Base for RAG (if needed)
- [ ] Implement session/memory management
- [ ] Add human escalation path for edge cases
- [ ] Test with diverse inputs and edge cases
- [ ] Set up evaluation metrics

## Common Mistakes

1. **Vague system prompts** — Be specific about what the agent can/cannot do
2. **Tools without error handling** — Every tool should catch exceptions and return error dicts
3. **No token limits** — Set max_tokens to prevent runaway responses
4. **Missing guardrails** — Always deploy with content filtering enabled
5. **No evaluation** — Test with adversarial inputs before production
6. **Monolithic agent** — Split into specialized agents if handling >5 distinct tasks

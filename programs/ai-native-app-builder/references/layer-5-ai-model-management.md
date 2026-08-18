# Layer 5 — AI Model Management

## Purpose

Manage the AI models that power your application — selection, serving, prompts, fine-tuning, and benchmarking. Separated from the Agent layer (L6) because model management is a distinct operational concern that applies whether you're using agents, pipelines, or direct inference.

## Why This Layer Exists

The FDE overlay folds model management into L6 (Agents), but in practice:
- You choose and configure models **before** building agents
- Prompt management is independent of agent framework
- Model benchmarking drives architecture decisions
- Fine-tuning is a separate workflow from agent development
- Cost optimization requires model-level decisions

## Capabilities

### 1. Model Serving / Inference

**Bedrock model selection guide:**

| Model | Best For | Cost | Latency |
|-------|----------|------|---------|
| Claude 3.5 Sonnet | Complex reasoning, tool use, coding | $$ | Medium |
| Claude 3 Haiku | Fast responses, simple tasks, classification | $ | Low |
| Claude 3 Opus | Highest quality, complex analysis | $$$ | High |
| Amazon Nova Pro | Balanced quality/cost, multimodal | $$ | Medium |
| Amazon Nova Lite | Cost-effective, simple tasks | $ | Low |
| Amazon Nova Micro | Text-only, lowest cost | $ | Lowest |
| Cohere Command R+ | RAG-optimized, tool use | $$ | Medium |
| Mistral Large | European data residency, multilingual | $$ | Medium |

**Provisioned throughput (for production):**

```python
# CDK — reserve model capacity for consistent latency
from aws_cdk import aws_bedrock as bedrock

provisioned_model = bedrock.CfnProvisionedModelThroughput(self, "ProvisionedClaude",
    model_id="<current-inference-profile-id>",  # resolve live — see below
    provisioned_model_name="agent-claude",
    model_units=1,  # Each unit = specific tokens/min
)
```

**Cross-region inference (for availability):**

```python
# Use inference profiles for automatic failover
model = BedrockModel(
    model_id="us.<current-inference-profile-id>",  # cross-region profile
    region_name="us-east-1",
)
```

> **Model IDs are not hardcoded here.** Bedrock model IDs are deprecated within
> months. Resolve the current, ACTIVE inference-profile ID at build time via the
> AWS MCP server, per the `bedrock-model-selection.md` steering rule (Rule 0).
> Authoritative sources: [model lifecycle](https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html)
> and [inference-profile support](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html).

**Model selection decision tree** (choose the model *family/tier*, then resolve
the current version live via the AWS MCP server):

```
Is response quality critical? (legal, medical, financial)
  YES → latest Claude Sonnet/Opus tier
  NO → Is latency critical? (real-time chat)
    YES → a fast tier (latest Claude Haiku or Amazon Nova Lite)
    NO → Is cost the primary concern?
      YES → a cost tier (Amazon Nova Micro or latest Haiku)
      NO → latest Claude Sonnet tier (default choice)
```

Pick the tier here; resolve the exact current inference-profile ID at build time
(see `bedrock-model-selection.md`). Do not pin a dated version in generated code.

### 2. Prompt Management

**Prompt versioning with Bedrock Prompt Management:**

```python
# Store prompts as managed resources (not hardcoded in code)
import boto3

bedrock_agent = boto3.client("bedrock-agent")

# Create a prompt
response = bedrock_agent.create_prompt(
    name="claims-system-prompt",
    description="System prompt for claims processing agent",
    variants=[
        {
            "name": "v1",
            "templateType": "TEXT",
            "templateConfiguration": {
                "text": {
                    "text": "You are an insurance claims processing agent..."
                }
            },
            "modelId": "<current-inference-profile-id>",  # resolve live (see bedrock-model-selection.md)
            "inferenceConfiguration": {
                "text": {"temperature": 0.1, "maxTokens": 4096}
            },
        }
    ],
    defaultVariant="v1",
)
```

**Prompt template pattern (code-based):**

```python
# src/agent/prompts.py
"""Centralized prompt management."""

SYSTEM_PROMPTS = {
    "claims_agent_v1": """You are an insurance claims processing agent...""",
    "claims_agent_v2": """You are a claims specialist. You help policy holders...""",
}

TOOL_PROMPTS = {
    "validation_instructions": """When validating a claim, check these rules in order:
1. Policy is active
2. Claim type is covered
3. Amount is within limits
4. Filing is timely
""",
}

# Active prompt selection (can be driven by feature flag)
ACTIVE_SYSTEM_PROMPT = SYSTEM_PROMPTS["claims_agent_v2"]
```

**Prompt A/B testing pattern:**

```python
import random

def get_system_prompt(experiment_id: str = None) -> str:
    """Select prompt variant for A/B testing."""
    if experiment_id == "prompt_v2_test":
        # 50/50 split
        variant = "v2" if random.random() > 0.5 else "v1"
        # Log which variant was used for analysis
        logger.info("prompt_variant", variant=variant, experiment=experiment_id)
        return SYSTEM_PROMPTS[f"claims_agent_{variant}"]
    return ACTIVE_SYSTEM_PROMPT
```

### 3. RAG Orchestration & Tuning

**Chunking strategy selection:**

| Strategy | Chunk Size | Overlap | Best For |
|----------|-----------|---------|----------|
| Fixed size | 512 tokens | 50 tokens | General documents |
| Semantic | Variable | N/A | Well-structured docs (headers, sections) |
| Hierarchical | Parent: 1024, Child: 256 | N/A | Long documents with context needs |
| Sentence-based | 3-5 sentences | 1 sentence | FAQ, Q&A content |

**Retrieval tuning:**

```python
# Knowledge Base retrieval configuration
retrieval_config = {
    "vectorSearchConfiguration": {
        "numberOfResults": 5,  # Top-K results
        "overrideSearchType": "HYBRID",  # SEMANTIC or HYBRID (keyword + vector)
        "filter": {
            "equals": {"key": "document_type", "value": "policy_handbook"}
        },
    }
}
```

**Reranking (improve retrieval quality):**

```python
# Use Cohere Rerank or Bedrock reranking
rerank_config = {
    "type": "BEDROCK_RERANKING_MODEL",
    "bedrockRerankingConfiguration": {
        "modelConfiguration": {
            "modelArn": "arn:aws:bedrock:us-east-1::foundation-model/cohere.rerank-v3-5:0"
        },
        "numberOfRerankedResults": 3,
    }
}
```

### 4. Embedding Management

**Embedding model selection:**

| Model | Dimensions | Multilingual | Cost | Best For |
|-------|-----------|-------------|------|----------|
| Titan Embed Text v2 | 256/512/1024 | Yes | $ | General purpose, configurable dimensions |
| Cohere Embed English v3 | 1024 | English | $$ | English-only, high quality retrieval |
| Cohere Embed Multilingual v3 | 1024 | Yes | $$ | Multilingual enterprise |

**Dimension selection:**
- 256: Fastest search, lowest storage, good for simple use cases
- 512: Balanced quality/performance
- 1024: Highest quality, best for complex semantic search

**Embedding refresh strategy:**

```python
# EventBridge scheduled rule to re-sync KB
from aws_cdk import aws_events as events, aws_events_targets as targets

# Re-ingest every 6 hours
rule = events.Rule(self, "KBRefreshRule",
    schedule=events.Schedule.rate(Duration.hours(6)),
)
rule.add_target(targets.LambdaFunction(kb_sync_lambda))
```

### 5. Model Registry & Version Pinning

**Pin model versions in configuration:**

```python
# config/models.py
"""Model registry — pin versions for reproducibility."""

MODELS = {
    "agent_primary": {
        # Resolve the current ACTIVE inference-profile ID at build time via the
        # AWS MCP server, then pin the resolved value here for reproducibility.
        "model_id": "<current-sonnet-tier-inference-profile-id>",
        "max_tokens": 4096,
        "temperature": 0.1,
        "description": "Primary agent model — balanced quality/cost",
    },
    "agent_fast": {
        "model_id": "<current-haiku-tier-inference-profile-id>",
        "max_tokens": 2048,
        "temperature": 0.0,
        "description": "Fast model for classification and routing",
    },
    "embedding": {
        "model_id": "<current-embedding-model-id>",  # e.g. an Amazon Titan/Nova embedding profile
        "dimensions": 1024,
        "description": "Embedding model for Knowledge Base",
    },
}
```

**Why pin versions:**
- Model behavior can change between versions
- Evaluation results are only valid for the tested version
- Rollback requires knowing which version was in production
- Compliance/audit requires traceability

**Pin the *resolved* ID, not one from memory.** Resolve the current ACTIVE model
for the region via the AWS MCP server (see `bedrock-model-selection.md`), then
record that value here. Re-verify at each deployment — pinned IDs reach
end-of-life and must be refreshed.

### 6. Fine-Tuning (When Needed)

**When to fine-tune vs prompt engineering:**

| Approach | When | Cost | Effort |
|----------|------|------|--------|
| Prompt engineering | First attempt, most use cases | Free | Low |
| Few-shot examples | Need consistent format/style | Free | Low |
| RAG (Knowledge Base) | Domain knowledge needed | $ | Medium |
| Fine-tuning | Consistent style + domain + format | $$$ | High |
| Continued pre-training | Massive domain corpus | $$$$ | Very High |

**Fine-tuning is rarely needed for agent apps.** Use it only when:
- You need a very specific output format consistently
- RAG + prompting can't achieve required quality
- You have 1000+ high-quality training examples
- Cost of larger model exceeds fine-tuning cost

### 7. Model Benchmarking

**Benchmark before selecting:**

```python
# scripts/benchmark_models.py
"""Compare models on your specific use cases."""

BENCHMARK_CASES = [
    {"input": "File a claim for car accident", "expected_tools": ["lookup_policy", "create_claim"]},
    {"input": "What documents do I need?", "expected_in_response": ["police report", "photos"]},
    # ... 50+ cases covering edge cases
]

# Populate with current ACTIVE inference-profile IDs resolved via the AWS MCP
# server (see bedrock-model-selection.md). Compare the tiers you're choosing between.
MODELS_TO_TEST = [
    "<current-sonnet-tier-inference-profile-id>",
    "<current-haiku-tier-inference-profile-id>",
    "<current-nova-tier-inference-profile-id>",
]

async def benchmark():
    results = {}
    for model_id in MODELS_TO_TEST:
        agent = create_agent(model_id=model_id)
        scores = []
        latencies = []
        for case in BENCHMARK_CASES:
            start = time.time()
            response = agent(case["input"])
            latency = time.time() - start
            score = evaluate_response(response, case)
            scores.append(score)
            latencies.append(latency)

        results[model_id] = {
            "avg_score": sum(scores) / len(scores),
            "avg_latency": sum(latencies) / len(latencies),
            "cost_per_1k": estimate_cost(model_id, BENCHMARK_CASES),
        }
    return results
```

**Decision framework:**

```
Quality Score > 0.9 AND Latency < 3s AND Cost < budget
  → Use that model

Multiple models pass?
  → Pick cheapest that meets quality threshold

No model passes quality?
  → Try RAG improvements before upgrading model
```

## Build Checklist

- [ ] Select primary model based on quality/cost/latency requirements
- [ ] Pin model versions in configuration
- [ ] Set up prompt management (versioned, not hardcoded)
- [ ] Configure RAG chunking strategy for your document types
- [ ] Choose embedding model and dimensions
- [ ] Set up embedding refresh schedule
- [ ] Run benchmarks comparing 2-3 models on your use cases
- [ ] Configure provisioned throughput for production (if needed)
- [ ] Set up cross-region inference profiles (if high availability needed)
- [ ] Document model selection rationale

## Common Mistakes

1. **Defaulting to the most expensive model** — Haiku/Nova Lite handles 80% of tasks at 10x lower cost
2. **Hardcoding prompts in agent code** — Use prompt management for versioning and A/B testing
3. **Not benchmarking** — Assumptions about model quality are often wrong; measure
4. **Ignoring embedding dimensions** — 1024 isn't always better; 256 may suffice and is 4x cheaper to store/search
5. **Fine-tuning too early** — Exhaust prompt engineering and RAG before fine-tuning
6. **No model version pinning** — Model updates can silently break your agent

# ⬡ Cross-Cutting — Observability & Evaluation

## Purpose

Monitor agent performance, evaluate quality, track costs, and detect anomalies across all layers. Essential for production AI applications.

## Coverage: 85% (Strong — 6 observability options, evaluation tools mature)

## Capabilities

### 1. Agent Observability

**Coverage:** ✅ Both (Accel #30 + Agentic #93-98)

| Resource | Link |
|----------|------|
| AgentCore Observability | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-get-started.html |
| CloudWatch GenAI Observability | https://aws.amazon.com/blogs/mt/launching-amazon-cloudwatch-generative-ai-observability-preview/ |
| Langfuse (AgentCore integration) | https://langfuse.com/changelog/2025-11-04-amazon-bedrock-agentcore |
| Datadog Integration | Available via ADOT |
| Grafana Integration | Available via ADOT |
| One Observability Demo | https://github.com/aws-samples/one-observability-demo |

**6 observability options:**

| Tool | Best For | Setup |
|------|----------|-------|
| AgentCore Observability | Agents on AgentCore Runtime | Automatic (zero config) |
| CloudWatch GenAI | Any agent (Strands, LangGraph, CrewAI) | ADOT SDK instrumentation |
| Langfuse | Detailed prompt/response logging, cost tracking | AgentCore integration or self-hosted |
| Datadog | Teams already using Datadog | ADOT exporter |
| Grafana | Custom dashboards, open-source | ADOT exporter |
| CloudWatch Dashboards | Simple, native AWS | Custom metrics + dashboard |

**CloudWatch GenAI setup (ADOT):**

```python
# For agents on AgentCore Runtime — automatic, no code needed

# For agents on Lambda/ECS — add ADOT SDK
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
```

**Key metrics to track:**
- Agent response latency (p50, p95, p99)
- Tool invocation success/failure rate
- Token usage per request
- Guardrail block rate
- Error rate by error type
- Session duration and turn count

### 2. Agent Evaluation & Quality

**Coverage:** ✅ Both (Accel #42 + Agentic #87-92)

| Resource | Link |
|----------|------|
| AgentCore Evaluations | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html |
| Strands Evals | https://github.com/strands-agents/sdk-python |
| Agent Evaluation Framework | https://awslabs.github.io/agent-evaluation/ |
| Generative AI Toolkit | https://github.com/awslabs/generative-ai-toolkit |
| RAGAS (RAG evaluation) | https://docs.ragas.io/ |
| Bedrock KB Evaluation | https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-evaluate.html |

**Evaluation dimensions:**

| Dimension | What It Measures | Tool |
|-----------|-----------------|------|
| Task completion | Did the agent achieve the goal? | AgentCore Evals, Strands Evals |
| Tool accuracy | Did it call the right tools with right params? | Strands Evals |
| Response quality | Is the response helpful, accurate, complete? | LLM-as-judge |
| RAG relevance | Are retrieved documents relevant? | RAGAS, Bedrock KB Eval |
| RAG faithfulness | Is the response grounded in retrieved docs? | RAGAS, Bedrock KB Eval |
| Safety | Does it avoid harmful content? | Guardrails metrics |
| Latency | Is response time acceptable? | CloudWatch metrics |

**Evaluation in CI/CD:**

```python
# Run as part of CI pipeline
from strands.eval import evaluate

results = evaluate(
    agent=my_agent,
    test_cases=[
        {"input": "File a claim for car accident", "expected_tools": ["lookup_policy", "create_claim"]},
        {"input": "What's my claim status?", "expected_tools": ["get_claim_status"]},
    ],
    metrics=["tool_accuracy", "response_quality"],
)

assert results.tool_accuracy > 0.9
assert results.response_quality > 0.8
```

### 3. Predictive Analytics

**Coverage:** 🔵 Accel #22

| Resource | Link |
|----------|------|
| SageMaker Autopilot | https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-automate-model-development.html |
| QuickSight ML | https://aws.amazon.com/quicksight/features-ml |

For forecasting (claim volumes, processing times, cost projections).

### 4. Anomaly Detection

**Coverage:** 🔵 Accel #23

| Resource | Link |
|----------|------|
| CloudWatch Anomaly Detection | https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html |

Detect unusual patterns: spike in errors, unusual token usage, unexpected tool calls.

### 5. Real-time Dashboards

**Coverage:** 🔵 Accel #24

| Resource | Link |
|----------|------|
| QuickSight Q (NL queries) | https://aws.amazon.com/quicksight/features-ml |
| Generative BI using RAG | https://github.com/aws-samples/generative-bi-using-rag |

### 6. Cost Governance & Token Budgets

**Coverage:** 🟠 Partial (Accel #18 + Agentic #59, #94)

| Resource | Link |
|----------|------|
| CloudWatch GenAI (token metrics) | Built into CloudWatch GenAI Observability |
| AWS Cost Explorer | https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html |

**Cost tracking approach:**
- Track tokens per request via CloudWatch custom metrics
- Set billing alarms on Bedrock spend
- Use CloudWatch GenAI for per-agent cost breakdown
- Implement token budgets per user/session (custom logic)

**Gap:** No token budget enforcement tool exists. Must build custom:

```python
# Custom token budget check
MAX_TOKENS_PER_SESSION = 50000

@tool
def check_token_budget(session_id: str) -> dict:
    """Check remaining token budget for this session."""
    used = get_session_token_count(session_id)
    remaining = MAX_TOKENS_PER_SESSION - used
    if remaining <= 0:
        return {"error": "Token budget exceeded", "used": used}
    return {"remaining": remaining, "used": used}
```

### 7. Production Cost Projection

**Coverage:** 🔴 TRUE GAP

No tool exists to extrapolate PoC usage to production-scale cost estimates.

**Custom build recommendation:**
1. Collect token usage metrics during PoC (per request type)
2. Multiply by projected production volume
3. Factor in: model costs, Lambda invocations, DynamoDB reads/writes, S3 storage
4. Build a calculator that takes PoC metrics + projected users → monthly cost estimate

## Build Checklist

- [ ] Enable AgentCore Observability or CloudWatch GenAI
- [ ] Set up key metrics dashboards (latency, errors, tokens, cost)
- [ ] Implement agent evaluation suite (run in CI)
- [ ] Configure CloudWatch alarms (error rate, latency, cost)
- [ ] Set up anomaly detection on key metrics
- [ ] Track token usage per user/session
- [ ] Set billing alarms on Bedrock spend
- [ ] Plan evaluation cadence (daily/weekly automated runs)
- [ ] Document SLOs (response time, accuracy, availability)

## Common Mistakes

1. **No observability until production** — Instrument from day 1; debugging blind is painful
2. **Only tracking errors** — Also track latency, token usage, and quality metrics
3. **No evaluation baseline** — Establish quality metrics before making changes
4. **Ignoring cost until the bill arrives** — Set billing alarms immediately
5. **Manual evaluation only** — Automate evaluation in CI; manual doesn't scale


### 7. AWS DevOps Agent — Autonomous Incident Investigation

**Coverage:** ✅ Native AWS (GA March 2026)

| Resource | Link |
|----------|------|
| AWS DevOps Agent | https://aws.amazon.com/devops-agent |
| User Guide | https://docs.aws.amazon.com/devopsagent/latest/userguide/ |
| Blog: Autonomous Incident Response | https://aws.amazon.com/blogs/devops/leverage-agentic-ai-for-autonomous-incident-response-with-aws-devops-agent/ |
| AgentWatch: Proactive Monitoring | https://aws.amazon.com/blogs/machine-learning/agentwatch-proactive-aws-monitoring-with-ambient-agents/ |
| Custom SRE Agents (MCP/A2A) | https://aws.amazon.com/about-aws/whats-new/2026/06/aws-devops-agent-custom-agents/ |

**What it does:**
- AI-powered always-on SRE that investigates incidents autonomously
- Triggers when CloudWatch alarms fire — starts investigation before humans respond
- Correlates metrics, deployment history, application logs, and service health
- Produces root cause analysis with evidence chain
- Supports custom SRE agents via MCP and Agent-to-Agent (A2A) protocols
- Integrates with: CloudWatch, Datadog, Dynatrace, New Relic, Splunk

**When to use:**

| Scenario | Use DevOps Agent? | Use Custom Monitoring? |
|----------|------------------|----------------------|
| Production incident investigation | ✅ Primary | Supporting data |
| Proactive anomaly detection | ✅ AgentWatch | CloudWatch Anomaly Detection |
| AI-specific quality degradation | ❌ (doesn't understand AI metrics) | ✅ Golden-set evaluation |
| Cost spike investigation | ✅ Correlates with deployment | ✅ Budget alarms trigger it |
| Model hallucination spike | ❌ | ✅ Custom guardrail metrics |
| Release readiness review | ✅ Pre-deployment checks | CI/CD pipeline |

**Integration with the kit:**

The `ai-operations` program's `/define-incident-response` skill produces the **policy** (what to monitor, severity levels, escalation paths). AWS DevOps Agent is the **runtime engine** that executes that policy:

```
ai-operations policy        → configures → AWS DevOps Agent behaviour
  - Severity definitions                    - Which alarms to investigate
  - Escalation paths                        - Who to notify with findings
  - Detection mechanisms                    - What telemetry to correlate
  - SLA targets                             - When to escalate vs auto-resolve
```

**Custom SRE Agents for AI workloads:**

For AI-specific failure modes that DevOps Agent doesn't natively understand (hallucination spikes, guardrail bypass, model drift), build custom SRE agents that connect via MCP:

```python
# Custom AI SRE agent that monitors golden-set evaluation results
# Connects to DevOps Agent via MCP for correlation with infrastructure data

@tool
def check_golden_set_results() -> dict:
    """Check latest golden-set evaluation against baseline."""
    latest = get_latest_eval_results()
    baseline = get_baseline_scores()
    
    degraded = []
    for metric in ['tool_accuracy', 'response_quality', 'faithfulness']:
        if latest[metric] < baseline[metric] * 0.9:  # >10% drop
            degraded.append({
                'metric': metric,
                'baseline': baseline[metric],
                'current': latest[metric],
                'drop_pct': round((1 - latest[metric]/baseline[metric]) * 100, 1)
            })
    
    if degraded:
        return {"status": "DEGRADED", "metrics": degraded, "action": "investigate_model_or_data"}
    return {"status": "HEALTHY"}
```

## Build Checklist

- [ ] Instrument agent with OTEL (AgentCore automatic or ADOT SDK)
- [ ] Set up CloudWatch GenAI observability dashboard
- [ ] Configure golden-set evaluation (daily scheduled Lambda)
- [ ] Set cost budget alarms (Bedrock spend + Lambda compute)
- [ ] Enable AWS DevOps Agent for production account
- [ ] Configure DevOps Agent alarm integration (CloudWatch → investigate)
- [ ] Set up Langfuse for detailed prompt/response logging (if needed)
- [ ] Implement token budget enforcement per session
- [ ] Create custom SRE agent for AI-specific metrics (if Production appLevel)
- [ ] Define anomaly detection baselines after 2 weeks of production data

# Layer 7 — Developer Experience (AI-DLC)

## Purpose

In-platform AI Software Development Lifecycle — specs, build/test, CI/CD, deploy, and monitor. This is the Kiro-native layer that manages how AI applications are developed, tested, and shipped to production.

## Coverage: 85% (Strong — Kiro + AgentCore CI/CD + evaluation tools)

## Capabilities

### 1. Requirements / Designs / Tasks (Specs)

**Coverage:** ✅ Both (Accel #38, #39 + Agentic #21)

| Resource | Link |
|----------|------|
| Kiro Specs (native) | Built into Kiro IDE |
| AI-DLC Workflows | https://github.com/awslabs/aidlc-workflows |

**Kiro Specs workflow:**
1. Define requirements (what the feature does)
2. Create design (architecture, data model, API contracts)
3. Break into tasks (implementation steps)
4. Execute tasks with agent assistance

**Best practice:** Always start with a spec for features that touch >3 files or involve new architecture decisions.

### 2. Build & Test (Hooks)

**Coverage:** ✅ Both (Kiro native + Agentic #88, #90)

| Resource | Link |
|----------|------|
| Kiro Hooks | Built into Kiro IDE |
| Strands Evals | https://github.com/strands-agents/sdk-python (eval module) |
| Generative AI Toolkit | https://github.com/awslabs/generative-ai-toolkit |

**Recommended hooks for AI apps:**

```json
// Lint on save
{"when": {"type": "fileEdited", "patterns": ["*.py"]}, "then": {"type": "runCommand", "command": "ruff check ."}}

// Type check on save
{"when": {"type": "fileEdited", "patterns": ["*.py"]}, "then": {"type": "runCommand", "command": "mypy src/"}}

// Run tests after task completion
{"when": {"type": "postTaskExecution"}, "then": {"type": "runCommand", "command": "pytest tests/ -x"}}
```

**Agent evaluation:**
- Use Strands Evals for tool-use accuracy
- Use Bedrock KB Evaluation for RAG quality
- Use AgentCore Evaluations for end-to-end agent quality

### 3. CI/CD Automation

**Coverage:** ✅ Both (Accel #31 + Agentic #20, #99)

| Resource | Link |
|----------|------|
| AgentCore CI/CD | https://github.com/aws-samples/sample-bedrock-agentcore-runtime-cicd |
| CDK DevOps Template | https://github.com/aws-samples/aws-cdk-project-template-for-devops |
| CDK Pipelines | https://docs.aws.amazon.com/cdk/v2/guide/cdk_pipeline.html |

**Standard CI/CD pipeline for AI apps:**

```
Git Push → CodePipeline
├── Source (CodeCommit / GitHub)
├── Build (CodeBuild)
│   ├── Install dependencies
│   ├── Run linting (ruff/eslint)
│   ├── Run unit tests
│   ├── Run agent evaluation suite
│   └── CDK synth
├── Deploy to Staging
│   ├── CDK deploy (staging stack)
│   └── Integration tests
├── Manual Approval (for production)
└── Deploy to Production
    ├── CDK deploy (prod stack)
    └── Smoke tests
```

**CDK Pipelines pattern:**

```python
from aws_cdk import pipelines

pipeline = pipelines.CodePipeline(self, "Pipeline",
    synth=pipelines.ShellStep("Synth",
        input=pipelines.CodePipelineSource.git_hub("org/repo", "main"),
        commands=[
            "pip install -r requirements.txt",
            "pytest tests/",
            "cd infrastructure && cdk synth",
        ],
    ),
)

pipeline.add_stage(StagingStage(self, "Staging"))
pipeline.add_stage(ProductionStage(self, "Production"),
    pre=[pipelines.ManualApprovalStep("PromoteToProduction")],
)
```

### 4. Deploy (Prototype to Production)

**Coverage:** ✅ Both (Accel #40 + Agentic #42, #52)

| Resource | Link |
|----------|------|
| Prototype to Production | https://github.com/aws-samples/sample-amazon-bedrock-agentcore-prototype-to-production |
| AgentCore Starter Toolkit CLI | https://github.com/aws/bedrock-agentcore-starter-toolkit |

**Deployment options:**

| Target | Tool | When |
|--------|------|------|
| AgentCore Runtime | `agentcore deploy` | Agent-first apps, serverless agent hosting |
| Lambda | CDK `aws_lambda.Function` | Lightweight, <15 min execution |
| ECS/Fargate | CDK `aws_ecs.FargateService` | Long-running, high-memory agents |
| Amplify Hosting | `amplify deploy` | Frontend apps |

**AgentCore deployment:**

```bash
# Scaffold
agentcore create --name my-agent --framework strands

# Deploy (no repo needed)
agentcore deploy --name my-agent --entry-point agent.py

# Invoke
agentcore invoke --name my-agent --payload '{"message": "hello"}'
```

### 5. Run & Monitor

**Coverage:** 🟠 Partial (Accel #30 + Agentic #93-98)

| Resource | Link |
|----------|------|
| AgentCore Observability | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-get-started.html |
| CloudWatch GenAI Observability | https://aws.amazon.com/blogs/mt/launching-amazon-cloudwatch-generative-ai-observability-preview/ |
| Langfuse Integration | https://langfuse.com/changelog/2025-11-04-amazon-bedrock-agentcore |
| One Observability Demo | https://github.com/aws-samples/one-observability-demo |

**Monitoring stack:**
- CloudWatch GenAI (traces, spans, metrics) — automatic with ADOT SDK
- AgentCore Observability — built-in for Runtime-hosted agents
- Langfuse — open-source alternative for detailed prompt/response logging
- Custom dashboards — CloudWatch Dashboards or Grafana

## Development Workflow

```
1. Spec (Kiro)           → Define requirements, design, tasks
2. Implement (Kiro)      → Write code with agent assistance
3. Test (Hooks)          → Auto-run tests on save/task completion
4. Evaluate (Strands)    → Run agent evaluation suite
5. Deploy (CDK/AgentCore)→ Push to staging, then production
6. Monitor (CloudWatch)  → Track performance, errors, cost
7. Iterate               → Back to step 1
```

## Build Checklist

- [ ] Set up Kiro spec for the feature/project
- [ ] Configure hooks (lint, test, type-check)
- [ ] Set up CI/CD pipeline (CodePipeline or GitHub Actions)
- [ ] Define deployment targets (Lambda, AgentCore, ECS)
- [ ] Implement agent evaluation suite
- [ ] Configure monitoring (CloudWatch GenAI or Langfuse)
- [ ] Set up alerting for errors and latency
- [ ] Document deployment runbook

## Common Mistakes

1. **No evaluation before production** — Always run agent evals in CI
2. **Missing staging environment** — Never deploy directly to production
3. **No rollback plan** — Use CDK stack rollback or blue/green deployment
4. **Ignoring cold starts** — Lambda cold starts affect agent response time; use provisioned concurrency for production
5. **No cost monitoring** — Bedrock model invocations add up; set billing alarms

---
id: deploy-agent-to-agentcore
name: Deploy Agent to Amazon Bedrock AgentCore
description: "Takes existing agent code (Strands, LangGraph, CrewAI, OpenAI Agents, or BYO) and deploys it to Amazon Bedrock AgentCore Runtime — from local testing through production deployment with observability, memory, and gateway."
trigger:
  kind: command
  phrase: "/deploy-agent"
inputs:
  - name: framework
    type: string
    required: false
    prompt: "Which agent framework? (strands, langgraph, langchain, crewai, openai-agents, google-adk, byo) Default: strands"
  - name: deploymentTool
    type: string
    required: false
    prompt: "Which deployment tool? (cli, starter-toolkit) Default: cli"
  - name: memoryType
    type: string
    required: false
    prompt: "Memory configuration? (none, stm, stm-ltm) Default: stm"
outputs:
  - name: deployment-report
    path: artifacts/ai-native-app-builder/deploy-agent-{timestamp}.md
    kind: document
---

## Objective

Deploy an existing AI agent to Amazon Bedrock AgentCore Runtime. This skill assumes the agent code already exists (built via `/build-app`, `/scaffold-app`, or hand-written). It handles local validation, configuration, deployment, service enablement, and production readiness verification.

## Reference Material

This skill relies on four detailed reference documents. **Read the relevant ones before executing each phase:**

| Phase | Reference to Read |
|-------|-------------------|
| Decision (CLI vs Toolkit) | `references/deployment-agentcore-overview.md` — Decision Guide table |
| Local dev & deploy | `references/deployment-agentcore-cli.md` (if CLI) or `references/deployment-agentcore-starter-toolkit.md` (if Toolkit) |
| Enable services (memory, gateway, observability) | `references/deployment-agentcore-services.md` |
| Troubleshooting | `references/deployment-agentcore-overview.md` — Troubleshooting section |

For Kiro engagements, references are at:
`<engagement-root>/.kiro/references/ai-native-app-builder/`

For Claude engagements:
`<engagement-root>/.claude/references/ai-native-app-builder/`

## Prerequisites (MUST verify before proceeding)

1. **Python 3.10+** installed (`python3 --version`)
2. **AWS credentials** configured (`aws sts get-caller-identity` — confirm account and role)
3. **Model access** enabled in Bedrock console for the chosen model in the target region
4. **IAM permissions** — deploying user needs `bedrock-agentcore:*`, `iam:CreateRole`, `iam:PassRole`, `s3:CreateBucket`, `s3:PutObject`, `logs:*`
5. **Agent code exists** — a Python file with an agent entrypoint that responds to prompts
6. **Node.js 18+** (if using AgentCore CLI) or **pip/uv** (if using Starter Toolkit)

## Procedure

### Phase 1: Validate Agent Locally

1. **Confirm the agent runs locally:**
   ```bash
   python my_agent.py
   # In another terminal:
   curl -X POST http://localhost:8080/invocations \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello, what can you do?"}'
   ```
   If using AgentCore CLI: `agentcore dev` + `agentcore invoke --dev '{"prompt": "Hello!"}'`

2. **Verify the entrypoint contract.** The agent MUST:
   - Listen on port 8080
   - Accept POST to `/invocations` with JSON payload
   - Return JSON response
   - Use `BedrockAgentCoreApp` SDK (handles this automatically)

3. **Verify `requirements.txt`** includes all dependencies. Minimum:
   ```
   bedrock-agentcore
   strands-agents  # or your framework
   ```

4. **Stop the local server** before deploying.

### Phase 2: Choose Deployment Tool

Read the Decision Guide in `references/deployment-agentcore-overview.md`.

| Choose CLI when | Choose Starter Toolkit when |
|---|---|
| New project | Need IaC generation (CDK/Terraform) |
| Want hot reload during dev | Prefer pure Python workflow |
| Using Strands, LangGraph, Google ADK, OpenAI Agents | Using CrewAI or AutoGen |
| Want built-in evals | Already have `.bedrock_agentcore.yaml` |

**Default: Use AgentCore CLI for new deployments.**

### Phase 3: Configure & Deploy

#### Path A: AgentCore CLI

```bash
# Install (once)
npm install -g @aws/agentcore

# If starting fresh:
agentcore create  # interactive: name, framework, model, capabilities

# If deploying existing code:
agentcore deploy

# Verify
agentcore invoke '{"prompt": "Summarize what you can do"}'
```

#### Path B: Starter Toolkit

```bash
# Install (once)
pip install bedrock-agentcore-starter-toolkit

# Configure (creates .bedrock_agentcore.yaml)
agentcore configure -e my_agent.py -r us-west-2

# Deploy (direct_code_deploy — no Docker needed)
agentcore deploy

# Verify
agentcore invoke '{"prompt": "Summarize what you can do"}'
```

### Phase 4: Enable Services

Read `references/deployment-agentcore-services.md` for full details on each service.

| Service | When to Enable | How |
|---|---|---|
| **Memory (STM)** | Agent needs multi-turn conversation | `agentcore add memory` or configure during setup |
| **Memory (LTM)** | Agent should remember across sessions | Configure STM+LTM during setup |
| **Gateway** | Agent needs MCP tools / external APIs | `agentcore add gateway` |
| **Observability** | Always for production | Enable post-deploy via console or CLI |
| **Code Interpreter** | Agent runs user code (data analysis) | SDK integration |
| **Browser** | Agent interacts with web pages | SDK integration |
| **Identity** | Agent calls OAuth-protected APIs | Console setup |
| **Policy** | Need deterministic action control (Cedar) | Console or CLI |

### Phase 5: Production Readiness

| Check | Action | Status |
|---|---|---|
| Agent responds correctly | `agentcore invoke` with representative prompts | ☐ |
| Observability enabled | Traces visible in CloudWatch / AgentCore console | ☐ |
| IAM least privilege | Execution role scoped to minimum permissions | ☐ |
| No secrets in code | API keys in AgentCore Identity or Secrets Manager | ☐ |
| Error handling | Agent returns graceful errors, not stack traces | ☐ |
| Memory provisioned | `agentcore status` shows memory "active" (if configured) | ☐ |
| Logs accessible | CloudWatch log group `/aws/bedrock-agentcore/runtimes/{id}-DEFAULT` | ☐ |
| Endpoint qualifiers | `DEFAULT`, `DEV`, `PROD` configured as needed | ☐ |
| Backup plan | Know how to rollback (`agentcore deploy` previous version) | ☐ |
| Cost awareness | Understand per-invocation pricing and model costs | ☐ |

### Phase 6: Document the Deployment

Produce `artifacts/ai-native-app-builder/deploy-agent-{timestamp}.md` with:
- Agent ARN
- Deployment region
- Framework and model used
- Services enabled (memory, gateway, observability)
- CloudWatch log group location
- Invocation example (CLI and SDK)
- Known limitations or next steps

## Deployment Modes Reference

| Mode | Docker Required | Best For |
|---|---|---|
| Direct code deploy (default) | No | Most use cases, fastest iteration |
| Container via CodeBuild | No | Custom system dependencies |
| Local build + cloud runtime | Yes | Full build control |
| Local only | Yes | Development / debugging |

## Gotchas (from reference material)

1. AgentCore Runtime requires **ARM64** containers — toolkit handles this automatically
2. Port **8080 is mandatory** — `BedrockAgentCoreApp` SDK handles this
3. Model access must be **enabled in Bedrock console** — IAM alone isn't enough
4. Default region is **us-west-2** — set explicitly if different
5. Memory provisioning is **asynchronous** — wait for "active" before invoking
6. `.bedrock_agentcore.yaml` contains account-specific config — **do NOT commit to public repos**
7. `agentcore destroy` is **irreversible** — always confirm with user first
8. Features enabled after initial deploy require a **new deployment** to take effect
9. Windows users: use `.venv\Scripts\activate` and PowerShell `Invoke-RestMethod`
10. **Secrets**: use AgentCore Identity or Secrets Manager — never env vars in production

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---|---|---|
| AccessDeniedException on deploy | Missing IAM permissions | Check Runtime Permissions docs |
| Model access denied at invoke | Model not enabled in console | Bedrock console → Model access |
| Invoke timeout | Agent code slow or exception | Test locally first, check CloudWatch |
| Port already in use | Previous dev session running | Kill process on 8080 |
| Memory not available | Async provisioning | `agentcore status`, wait for "active" |

## Done when

- Agent is deployed and responding to invocations
- Observability is enabled and traces are visible
- Deployment report artifact is written
- Customer has successfully invoked the agent (CLI or SDK)
- No secrets are hardcoded in agent code

## Anti-patterns

- Deploying without testing locally first — always validate on localhost:8080
- Skipping observability — you cannot debug production agents without traces
- Using env vars for secrets — use AgentCore Identity or Secrets Manager
- Running `agentcore destroy` without confirmation — irreversible
- Deploying to production without qualifiers — use DEV/PROD endpoints for traffic separation

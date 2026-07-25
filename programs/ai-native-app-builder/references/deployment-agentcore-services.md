# Amazon Bedrock AgentCore Services Overview

Source: [docs.aws.amazon.com/bedrock-agentcore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)

Amazon Bedrock AgentCore provides modular services for deploying and operating AI agents at scale. Services are composable — use them together or independently.

## Services Summary

| Service | Purpose | Quick Start |
|---|---|---|
| **Runtime** | Serverless hosting for agents (any framework, any model) | `agentcore deploy` |
| **Memory** | Short-term and long-term agent memory | `agentcore add memory` |
| **Gateway** | Managed MCP server — converts APIs/Lambdas to MCP tools | Console or CLI |
| **Code Interpreter** | Secure sandboxed code execution | SDK integration |
| **Browser** | Cloud-based browser for agent web interaction | SDK integration |
| **Observability** | Tracing, debugging, monitoring via OpenTelemetry | Enable post-deploy |
| **Evaluation** | Assess agent quality (helpfulness, correctness) | `agentcore evals` |
| **Identity** | Agent identity, OAuth, secure token vault | Console setup |
| **Policy** | Deterministic control over agent actions (Cedar) | Console or CLI |

## AgentCore Runtime

Serverless runtime purpose-built for AI agents. Key features:

- **Any framework**: Strands, LangGraph, CrewAI, LangChain, Google ADK, OpenAI Agents, custom
- **Any model**: Bedrock, Anthropic, OpenAI, Gemini, self-hosted
- **Extended runtime**: Longer execution times than Lambda (agents need time to think)
- **Fast cold starts**: Optimized for agentic workloads
- **Session isolation**: True isolation between invocations
- **Built-in identity**: IAM-based authentication
- **Multi-modal payloads**: Text, images, documents
- **No infrastructure management**: Serverless — scales automatically

### Deployment without a repository

AgentCore Runtime supports `direct_code_deploy` mode:
1. Your Python code is zipped
2. Uploaded to S3
3. AgentCore Runtime runs it directly

No CodeCommit, GitHub, GitLab, or any repository needed. No Docker needed (unless using container mode with CodeBuild).

### Endpoints and Qualifiers

Each runtime gets multiple endpoints:
- `DEFAULT` — primary endpoint
- `PROD` — production qualifier
- `DEV` — development qualifier

Use qualifiers to manage traffic routing and access control.

### Service Contract

AgentCore Runtime supports three protocols:
- **HTTP** (default) — standard request/response via `BedrockAgentCoreApp`
- **MCP** — Model Context Protocol server
- **A2A** — Agent-to-Agent protocol

## AgentCore Memory

Eliminates complex memory infrastructure. Two types:

### Short-Term Memory (STM)
- Multi-turn conversation context within a session
- Automatic context management
- No configuration beyond enabling

### Long-Term Memory (LTM)
- Persists across sessions and agents
- Automatic extraction of facts, preferences, summaries
- Shared across multiple agents
- Industry-leading accuracy

### Usage

```python
from bedrock_agentcore.memory import MemoryClient

memory = MemoryClient()

# Store
memory.store(session_id="abc", messages=[...])

# Retrieve
context = memory.retrieve(session_id="abc")
```

Quick start: [Memory Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-get-started.html)

## AgentCore Gateway

Managed MCP server that converts APIs and Lambda functions into MCP tools.

Key capabilities:
- **OAuth ingress authorization**: Secure client authentication
- **Egress credential exchange**: Secure outbound API calls
- **Tool composition**: Combine multiple APIs into a unified tool set
- **Semantic search over tools**: Scale to hundreds/thousands of tools
- **No MCP server management**: Fully managed

### Use Cases
- Connect agents to internal APIs without writing MCP servers
- Manage OAuth flows for third-party services
- Provide a curated set of tools to agents

Quick start: [Gateway Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-quick-start.html)

## AgentCore Code Interpreter

Secure sandboxed code execution for agents:
- Isolated sandbox environments
- Advanced configuration support
- Framework integration (Strands, LangGraph, etc.)
- Enterprise security

Use for: data analysis, calculations, file processing, code generation and execution.

Quick start: [Code Interpreter Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-interpreter-getting-started.html)

## AgentCore Browser

Cloud-based browser runtime for agent web interaction:
- Fast, secure browsing at scale
- Enterprise-grade security
- Comprehensive observability
- Auto-scaling without infrastructure management

Use for: web scraping, form filling, web-based workflows, research tasks.

Quick start: [Browser Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/browser-onboarding.html)

## AgentCore Observability

Trace, debug, and monitor agent performance:
- OpenTelemetry compatible telemetry
- Detailed step-by-step workflow visualization
- Unified operational dashboards
- CloudWatch integration

### Enabling

After deploying your agent:
1. Follow [Enabling AgentCore runtime observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html#observability-configure-builtin)
2. Enable CloudWatch Transaction Search
3. View in AgentCore console or CloudWatch

Quick start: [Observability Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-get-started.html)

## AgentCore Evaluation

Assess and improve agent quality:
- **On-demand evaluation**: Run evaluations against test datasets
- **Online evaluation**: Continuous monitoring in production
- **Built-in evaluators**: Helpfulness, correctness, goal success
- **Custom evaluators**: Define your own metrics

Integrates with observability for actionable insights.

Quick start: [Evaluation Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html)

## AgentCore Identity

Secure agent identity and access management:
- Compatible with existing identity providers (no user migration)
- Secure token vault (minimizes consent fatigue)
- Just-enough access and permission delegation
- Agents securely access AWS resources and third-party tools

### OAuth Flow
1. Agent requests access to a third-party service
2. AgentCore Identity handles OAuth flow
3. Tokens stored securely in vault
4. Agent uses delegated credentials

Quick start: [Identity Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-getting-started-cognito.html)

## AgentCore Policy

Real-time, deterministic control over agent actions:
- Fine-grained rules via natural language or Cedar policy language
- Controls actions through AgentCore Gateway
- Who can perform which actions under what conditions
- No latency impact on agent execution

### Cedar Policy Example

```cedar
permit(
  principal == Agent::"my-agent",
  action == Action::"read",
  resource == Resource::"customer-data"
) when {
  context.department == "support"
};
```

Quick start: [Policy Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-getting-started.html)

## Import Bedrock Agents

Migrate existing Amazon Bedrock Agents to open-source frameworks:
- Automatic migration to LangChain/LangGraph or Strands
- Integrates AgentCore primitives (Memory, Code Interpreter, Gateway)
- Deploy directly to AgentCore Runtime
- Full feature parity in minutes

```bash
# Using starter toolkit
agentcore import-agent
```

Quick start: [Import Agent Documentation](https://aws.github.io/bedrock-agentcore-starter-toolkit/user-guide/import-agent/quickstart.html)

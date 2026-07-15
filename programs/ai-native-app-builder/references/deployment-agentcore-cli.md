# AgentCore CLI Guide

Source: [github.com/aws/agentcore-cli](https://github.com/aws/agentcore-cli)

The AgentCore CLI (`@aws/agentcore`) is the recommended tool for new projects deploying to Amazon Bedrock AgentCore. It supports a broader set of frameworks, provides local development with hot reload, built-in evaluations, gateway management, and more.

## Installation

```bash
npm install -g @aws/agentcore
```

Requires Node.js 18+.

Verify:
```bash
agentcore --version
```

## Commands Reference

| Command | Description |
|---|---|
| `agentcore create` | Scaffold a new agent project |
| `agentcore deploy` | Deploy agent to AgentCore Runtime |
| `agentcore dev` | Start local dev server with hot reload |
| `agentcore invoke` | Invoke a deployed or local agent |
| `agentcore add` | Add capabilities (memory, gateway, tools) |
| `agentcore remove` | Remove capabilities |
| `agentcore logs` | View agent logs |
| `agentcore traces` | View agent traces |
| `agentcore evals` | Run evaluations |

## Supported Frameworks

- **Strands Agents** — AWS-native agent framework
- **LangGraph** — LangChain's graph-based agent framework
- **LangChain** — Popular LLM application framework
- **Google ADK** — Google's Agent Development Kit
- **OpenAI Agents** — OpenAI's agent SDK
- **BYO (Bring Your Own)** — Any custom framework
- **Import** — Import existing Bedrock Agents

## Create a New Project

```bash
agentcore create
```

Interactive prompts guide you through:
1. Project name
2. Framework selection
3. Model provider
4. Additional capabilities (memory, gateway, tools)

### Non-Interactive Creation

```bash
agentcore create --name my-agent --framework strands --model-provider bedrock
```

## Local Development

Start the dev server with hot reload:

```bash
agentcore dev
```

This watches for file changes and automatically restarts the agent. Test with:

```bash
agentcore invoke --dev '{"prompt": "Hello!"}'
```

## Deployment

```bash
agentcore deploy
```

The CLI handles:
- Packaging your code
- Creating/updating the AgentCore Runtime
- Provisioning configured services (memory, gateway)
- Setting up IAM roles

## Configuration (agentcore.json)

The CLI uses `agentcore.json` for project configuration:

```json
{
  "name": "my-agent",
  "framework": "strands",
  "runtime": {
    "region": "us-west-2",
    "memory": true,
    "gateway": true
  },
  "model": {
    "provider": "bedrock",
    "modelId": "anthropic.claude-sonnet-4-20250514-v1:0"
  }
}
```

## MCP Configuration (mcp.json)

Configure MCP tools for your agent:

```json
{
  "mcpServers": {
    "my-tool": {
      "command": "uvx",
      "args": ["my-mcp-server"]
    }
  }
}
```

## Adding Capabilities

### Memory

```bash
agentcore add memory
```

Configures short-term and/or long-term memory for your agent.

### Gateway

```bash
agentcore add gateway
```

Sets up AgentCore Gateway for MCP tool management.

## Viewing Logs and Traces

```bash
# View recent logs
agentcore logs

# View traces
agentcore traces
```

## Evaluations

Run built-in or custom evaluations:

```bash
agentcore evals
```

Supports metrics like helpfulness, correctness, and goal success rates.

## Migration from Starter Toolkit

If migrating from the starter toolkit (`bedrock-agentcore-starter-toolkit`):

1. Install AgentCore CLI: `npm install -g @aws/agentcore`
2. See the [Migration Guide](https://github.com/awslabs/amazon-bedrock-agentcore-samples/blob/main/MIGRATION.md)
3. Key differences:
   - Configuration moves from `.bedrock_agentcore.yaml` to `agentcore.json`
   - `agentcore launch` → `agentcore deploy`
   - `agentcore configure` → handled by `agentcore create`
   - Hot reload is built into `agentcore dev`

## IAM Permissions

The deploying user/role needs permissions documented in [PERMISSIONS.md](https://github.com/aws/agentcore-cli/blob/main/docs/PERMISSIONS.md).

Key permissions:
- `bedrock-agentcore:*` (Runtime, Memory, Gateway operations)
- `iam:CreateRole`, `iam:PassRole` (execution role management)
- `s3:*` (code packaging and deployment)
- `logs:*` (CloudWatch logging)

## Additional Documentation

- [Commands Reference](https://github.com/aws/agentcore-cli/blob/main/docs/commands.md)
- [Supported Frameworks](https://github.com/aws/agentcore-cli/blob/main/docs/frameworks.md)
- [Configuration Guide](https://github.com/aws/agentcore-cli/blob/main/docs/configuration.md)
- [Local Development](https://github.com/aws/agentcore-cli/blob/main/docs/local-development.md)
- [Memory](https://github.com/aws/agentcore-cli/blob/main/docs/memory.md)
- [Gateway](https://github.com/aws/agentcore-cli/blob/main/docs/gateway.md)
- [Evaluations](https://github.com/aws/agentcore-cli/blob/main/docs/evals.md)
- [IAM Permissions](https://github.com/aws/agentcore-cli/blob/main/docs/PERMISSIONS.md)

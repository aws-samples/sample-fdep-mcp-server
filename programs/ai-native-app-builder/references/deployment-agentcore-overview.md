# Deploying Agents to Amazon Bedrock AgentCore

## Overview

This skill guides deployment of AI agents to Amazon Bedrock AgentCore Runtime **without needing a source code repository** (no CodeCommit, GitHub, or GitLab required). It uses either:

1. **AgentCore CLI** (`@aws/agentcore`) — the recommended tool for new projects (broader framework support, hot reload, evaluations)
2. **Bedrock AgentCore Starter Toolkit** (`bedrock-agentcore-starter-toolkit`) — Python-based CLI for existing workflows

Both tools package your local code and deploy directly to AgentCore Runtime using `direct_code_deploy` mode (zip upload to S3) or container mode (CodeBuild — no local Docker required).

**Source:** [github.com/aws/bedrock-agentcore-starter-toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit)

**Recommended setup:** Install the AWS MCP server for sandboxed execution. See: aws.amazon.com/mcp

**When NOT to use this skill:**

- Managed Bedrock Agents (action groups, knowledge bases) → use the amazon-bedrock skill
- Deploying to Lambda or SageMaker → use the aws-serverless skill
- CI/CD pipeline setup → use a deployment/pipeline skill
- Kubernetes-based agent hosting → use a containers/EKS skill

**Before executing any commands:**

- You MUST verify Python 3.10+ is installed
- You MUST verify AWS CLI credentials are configured (`aws sts get-caller-identity`)
- You MUST verify the user has model access enabled in the Bedrock console for their chosen model
- You MUST inform the user of required IAM permissions before deployment

## Decision Guide: AgentCore CLI vs Starter Toolkit

| Factor | AgentCore CLI (`@aws/agentcore`) | Starter Toolkit (`bedrock-agentcore-starter-toolkit`) |
|---|---|---|
| Install | `npm install -g @aws/agentcore` | `pip install bedrock-agentcore-starter-toolkit` |
| Frameworks | Strands, LangGraph, LangChain, Google ADK, OpenAI Agents, BYO | Strands, LangGraph, CrewAI, AutoGen |
| Local dev | Hot reload built-in | `agentcore dev` |
| Deployment | `agentcore deploy` | `agentcore deploy` or `agentcore launch` |
| IaC generation | No (deploy-focused) | Yes — CDK or Terraform (`--template production`) |
| Status | Recommended for new projects | Legacy but fully functional |
| Requires | Node.js 18+ | Python 3.10+ |

**Default recommendation:** Use AgentCore CLI for new projects. Use Starter Toolkit if you need IaC generation or prefer a pure Python workflow.

## Quick-Start: Deploy in 5 Minutes (Starter Toolkit)

```bash
# 1. Install
pip install bedrock-agentcore strands-agents bedrock-agentcore-starter-toolkit

# 2. Create agent file (my_agent.py)
# See reference for full code

# 3. Configure (creates .bedrock_agentcore.yaml)
agentcore configure -e my_agent.py

# 4. Deploy (direct_code_deploy — no Docker needed)
agentcore deploy

# 5. Test
agentcore invoke '{"prompt": "Hello!"}'

# 6. Clean up
agentcore destroy
```

## Quick-Start: Deploy with AgentCore CLI

```bash
# 1. Install
npm install -g @aws/agentcore

# 2. Create project (interactive prompts)
agentcore create

# 3. Local dev with hot reload
agentcore dev

# 4. Deploy
agentcore deploy

# 5. Invoke
agentcore invoke '{"prompt": "Hello!"}'
```

## Minimal Agent Code (Strands + AgentCore SDK)

```python
from bedrock_agentcore import BedrockAgentCoreApp
from strands import Agent

app = BedrockAgentCoreApp()
agent = Agent()

@app.entrypoint
def invoke(payload):
    """Your AI agent function"""
    user_message = payload.get("prompt", "Hello! How can I help you today?")
    result = agent(user_message)
    return {"result": result.message}

if __name__ == "__main__":
    app.run()
```

**requirements.txt:**
```
bedrock-agentcore
strands-agents
```

## Deployment Modes

| Mode | Command | Docker Required | Best For |
|---|---|---|---|
| Direct code deploy (default) | `agentcore deploy` | No | Most use cases, fastest iteration |
| Container via CodeBuild | `agentcore deploy` (container config) | No | Custom dependencies, system packages |
| Local build + cloud runtime | `agentcore deploy --local-build` | Yes | Build customization |
| Local only | `agentcore deploy --local` | Yes | Development, debugging |

**Direct code deploy** zips your Python code and uploads to S3. AgentCore Runtime runs it directly. No Docker, no CodeBuild, no repository needed.

## Gotchas

1. **AgentCore Runtime requires ARM64 containers.** The toolkit handles this automatically via CodeBuild. If using `--local-build`, you must build on an ARM64 machine or use Docker buildx.

2. **Port 8080 is mandatory.** AgentCore Runtime expects your agent to listen on port 8080. The `BedrockAgentCoreApp` SDK handles this automatically.

3. **Model access must be enabled in the Bedrock console.** Even with correct IAM permissions, you'll get `AccessDeniedException` if the model isn't enabled in the target region.

4. **Default region is us-west-2.** Use `agentcore configure -e my_agent.py -r us-east-1` to change.

5. **Memory provisioning takes time.** After deploy, `agentcore status` may show memory as "provisioning" for a few minutes. Wait before invoking if memory is configured.

6. **Secrets and API keys for third-party providers:** Use AgentCore Identity or AWS Secrets Manager in deployed environments. For local dev, use `.env.local` with `LOCAL_DEV=1`.

7. **`agentcore destroy` deletes ALL resources** including IAM roles, S3 buckets, ECR repos, and memory. Confirm with the user before running.

8. **Tasks launched before enabling features don't inherit them.** If you enable observability or ECS Exec after initial deploy, force a new deployment.

9. **The `.bedrock_agentcore.yaml` file stores all configuration.** It's created by `agentcore configure` and should NOT be committed to public repos (contains account-specific ARNs).

10. **Windows users:** Use `.venv\Scripts\activate` instead of `source .venv/bin/activate`. The toolkit works on Windows but some shell examples assume bash.

## Project Templates

### Basic Template (`agentcore create --template basic`)

```
my_project/
  src/
    main.py
    model/
    mcp_client/
  .bedrock_agentcore.yaml
  README.md
```

Deploy with `agentcore launch`. No IaC, no Docker.

### Production Template (`agentcore create --template production`)

```
my_project/
  src/
  mcp/
    lambda/handler.py
  cdk/      OR     terraform/
  .bedrock_agentcore.yaml
  README.md
```

Includes full IaC: Runtime, Gateway, Cognito OAuth2, Memory, networking.

Deploy with CDK (`npm run cdk:deploy`) or Terraform (`terraform apply`).

## Production Readiness Checklist

| Area | Action |
|---|---|
| Security | Use AgentCore Identity or Secrets Manager for API keys — never env vars |
| Observability | Enable AgentCore observability after deploy |
| CI/CD | Build into a pipeline (CodePipeline) for automated deploys |
| Access Control | Configure endpoint access (DEFAULT, PROD, DEV qualifiers) |
| Testing | Write unit tests, implement E2E tests |
| Error Handling | Implement graceful error handling in agent code |

## Common Workflows

Use the best available tool for AWS operations (MCP server, AWS CLI, or SDK).

- Read [deployment-agentcore-starter-toolkit.md](deployment-agentcore-starter-toolkit.md) for the full step-by-step deployment walkthrough using the starter toolkit, including local testing, configuration options, deployment modes, and programmatic invocation.
- Read [deployment-agentcore-cli.md](deployment-agentcore-cli.md) for the AgentCore CLI workflow including project creation, framework selection, local dev with hot reload, and deployment.
- Read [deployment-agentcore-services.md](deployment-agentcore-services.md) for an overview of all AgentCore services (Runtime, Memory, Gateway, Code Interpreter, Browser, Observability, Evaluation, Identity, Policy) and when to use each.

## Troubleshooting

### AccessDeniedException on deploy
**Cause**: Missing IAM permissions for the starter toolkit.
**Fix**: Ensure the deploying user/role has permissions per [Runtime Permissions docs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-permissions.html#runtime-permissions-starter-toolkit). Key permissions: `bedrock-agentcore:*`, `iam:CreateRole`, `iam:PassRole`, `s3:CreateBucket`, `s3:PutObject`, `ecr:*` (for container mode).

### Model access denied after deploy
**Cause**: Model not enabled in the Bedrock console for the deployment region.
**Fix**: Go to Amazon Bedrock console → Model access → Enable the required model (e.g., Claude Sonnet 4.0).

### agentcore invoke returns timeout
**Cause**: Agent code is slow to respond or has an unhandled exception.
**Fix**: Test locally first with `python my_agent.py` + `curl http://localhost:8080/invocations`. Check CloudWatch logs at `/aws/bedrock-agentcore/runtimes/{agent-id}-DEFAULT`.

### Deploy fails with "port already in use"
**Cause**: Local testing — port 8080 is occupied.
**Fix**: Kill the process using port 8080, or stop the previous `agentcore dev` session.

### Memory not available after deploy
**Cause**: Memory provisioning is asynchronous.
**Fix**: Run `agentcore status` and wait until memory shows as "active" before invoking.

## Security Considerations

- You MUST use IAM roles for AgentCore Runtime execution — never embed credentials in agent code
- You MUST use AgentCore Identity or Secrets Manager for third-party API keys
- You SHOULD enable AgentCore observability for production agents
- You SHOULD use private subnets with VPC configuration for production deployments
- You MUST NOT commit `.bedrock_agentcore.yaml` to public repositories (contains account-specific configuration)
- You MUST confirm with the user before running `agentcore destroy` — it deletes all associated resources and is irreversible
- You SHOULD scope the execution role to minimum required permissions
- You SHOULD enable CloudTrail for AgentCore API audit logging

## Additional Resources

- [Bedrock AgentCore Developer Guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)
- [Starter Toolkit GitHub](https://github.com/aws/bedrock-agentcore-starter-toolkit)
- [AgentCore CLI GitHub](https://github.com/aws/agentcore-cli)
- [AgentCore Samples](https://github.com/awslabs/amazon-bedrock-agentcore-samples)
- [AgentCore SDK Python](https://github.com/aws/bedrock-agentcore-sdk-python)
- [Strands Agents](https://strandsagents.com/latest/)
- [Runtime Permissions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-permissions.html)
- [AgentCore Observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html)

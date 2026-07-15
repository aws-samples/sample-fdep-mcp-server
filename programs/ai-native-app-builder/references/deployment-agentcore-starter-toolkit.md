# Starter Toolkit: Full Deployment Walkthrough

Source: [github.com/aws/bedrock-agentcore-starter-toolkit](https://github.com/aws/bedrock-agentcore-starter-toolkit)

## Prerequisites

- Python 3.10+
- AWS account with credentials configured (`aws configure` or environment variables)
- `uv` package manager (recommended) or `pip`
- Model access enabled in Amazon Bedrock console (e.g., Claude Sonnet 4.0)
- IAM permissions per [Runtime Permissions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-permissions.html#runtime-permissions-starter-toolkit)

## Step 1: Install the Toolkit

```bash
# Option A: Using uv (recommended)
uv pip install bedrock-agentcore-starter-toolkit

# Option B: Using pip
pip install bedrock-agentcore-starter-toolkit

# Verify
agentcore --help
```

## Step 2: Create Your Agent

Create `my_agent.py`:

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

Create `requirements.txt`:

```
bedrock-agentcore
strands-agents
```

## Step 3: Test Locally

Terminal 1 — start the agent:
```bash
python my_agent.py
```

Terminal 2 — invoke:
```bash
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello!"}'
```

On Windows (PowerShell):
```powershell
Invoke-RestMethod -Uri http://localhost:8080/invocations -Method POST -ContentType "application/json" -Body '{"prompt": "Hello!"}'
```

Expected response: `{"result": "Hello! I'm here to help..."}`

Stop with `Ctrl+C`.

## Step 4: Configure

```bash
agentcore configure -e my_agent.py
```

Options:
- `-e` / `--entrypoint`: Python file with your agent code (required)
- `-r` / `--region`: AWS region (default: us-west-2)
- `--disable-memory`: Skip memory provisioning
- `--execution-role`: Use an existing IAM role ARN

This creates `.bedrock_agentcore.yaml` with deployment configuration.

### Memory Options

During configuration, you'll be prompted for memory:
- **Short-term memory (STM) only**: Multi-turn conversation context
- **STM + Long-term memory (LTM)**: Automatic extraction of facts, preferences, summaries across sessions

To skip: `agentcore configure -e my_agent.py --disable-memory`

## Step 5: Deploy

```bash
agentcore deploy
```

This command:
1. Packages your Python code into a zip
2. Uploads to S3 (direct_code_deploy mode)
3. Creates IAM execution role (if not provided)
4. Creates AgentCore Runtime
5. Provisions memory (if configured)
6. Configures CloudWatch logging

**Note the output:**
- Agent ARN (needed for programmatic invocation)
- CloudWatch log group location

Check status:
```bash
agentcore status
```

## Step 6: Invoke the Deployed Agent

Via CLI:
```bash
agentcore invoke '{"prompt": "Tell me a joke"}'
```

Via boto3 (Python SDK):
```python
import json
import uuid
import boto3

agent_arn = "<your-agent-arn>"  # From deploy output or .bedrock_agentcore.yaml
prompt = "Tell me a joke"

client = boto3.client('bedrock-agentcore')

payload = json.dumps({"prompt": prompt}).encode()

response = client.invoke_agent_runtime(
    agentRuntimeArn=agent_arn,
    runtimeSessionId=str(uuid.uuid4()),
    payload=payload,
    qualifier="DEFAULT"
)

content = []
for chunk in response.get("response", []):
    content.append(chunk.decode('utf-8'))
print(json.loads(''.join(content)))
```

## Step 7: Enable Observability

Follow [Enabling AgentCore runtime observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html#observability-configure-builtin) to enable CloudWatch Transaction Search.

View traces and logs in the AgentCore console or CloudWatch.

## Step 8: Clean Up

```bash
agentcore destroy
```

**WARNING:** This deletes ALL resources — IAM roles, S3 buckets, ECR repos, memory, and the runtime itself. This is irreversible.

## Deployment Modes (Advanced)

### Direct Code Deploy (Default — Recommended)

```bash
agentcore deploy
```

- No Docker required
- Packages Python code as zip → S3
- Fastest iteration cycle
- Suitable for most use cases

### Container via CodeBuild (No Local Docker)

Configure for container deployment, then:
```bash
agentcore deploy
```

- CodeBuild builds ARM64 container in the cloud
- No Docker needed locally
- Use when you need system-level dependencies or custom base images

### Local Build + Cloud Runtime

```bash
agentcore deploy --local-build
```

- Requires Docker/Finch/Podman locally
- Builds container locally, pushes to ECR, deploys to AgentCore
- Use when you need full build control

### Local Only (Development)

```bash
agentcore deploy --local
```

- Requires Docker locally
- Runs container locally for testing
- Does NOT deploy to AWS

## Using `agentcore create` for Scaffolding

Instead of writing agent code from scratch, scaffold a complete project:

```bash
agentcore create
```

Interactive prompts:
1. Project name
2. Agent SDK (Strands, LangGraph, CrewAI, AutoGen)
3. Template (`basic` or `production`)
4. IaC provider (CDK or Terraform — production only)
5. Model provider (Bedrock, Anthropic, OpenAI, Gemini)
6. MCP integration (yes/no)
7. Memory (yes/no)

### Basic Template Output

```
my_project/
  src/
    main.py          # Agent entrypoint
    model/           # Model loader for chosen provider
    mcp_client/      # MCP tools (if selected)
  .bedrock_agentcore.yaml
  README.md
```

Deploy with: `agentcore launch`

### Production Template Output

```
my_project/
  src/              # Agent runtime code
  mcp/
    lambda/handler.py  # Gateway Lambda MCP target
  cdk/              # OR terraform/
  .bedrock_agentcore.yaml
  README.md
```

IaC provisions: Runtime, Gateway, Cognito OAuth2, Memory, networking.

Deploy with CDK:
```bash
cd cdk
npm install
npm run cdk synth
npm run cdk:deploy
```

Or Terraform:
```bash
cd terraform
terraform init
terraform apply
```

## Local Development with Hot Reload

```bash
agentcore dev
```

In another terminal:
```bash
agentcore invoke --dev '{"prompt": "What can you do?"}'
```

Hot reload detects file changes automatically.

## Configuration File Reference (.bedrock_agentcore.yaml)

Created by `agentcore configure`. Key fields:

```yaml
bedrock_agentcore:
  agent_name: my-agent
  region: us-west-2
  entrypoint: my_agent.py
  deployment_mode: direct_code_deploy  # or container
  execution_role_arn: arn:aws:iam::<ACCOUNT_ID>:role/...
  runtime_arn: arn:aws:bedrock-agentcore:us-west-2:<ACCOUNT_ID>:runtime/...
  memory:
    enabled: true
    type: stm  # or stm_ltm
```

## Finding Your Resources After Deployment

| Resource | Location |
|---|---|
| Agent Logs | CloudWatch → `/aws/bedrock-agentcore/runtimes/{agent-id}-DEFAULT` |
| Memory | Bedrock AgentCore console → Memory |
| Container Images | ECR → `bedrock-agentcore-{agent-name}` (container mode only) |
| Code Package | S3 → deployment bucket → `{agent-name}/deployment.zip` |
| IAM Role | IAM → Roles → search "BedrockAgentCore" |
| Runtime | Bedrock AgentCore console → Runtimes |

## Common Issues

### Permission denied on deploy
Ensure your IAM user/role has the required permissions. Key actions:
- `bedrock-agentcore:CreateAgentRuntime`
- `bedrock-agentcore:UpdateAgentRuntime`
- `iam:CreateRole`, `iam:PassRole`
- `s3:CreateBucket`, `s3:PutObject`
- `ecr:*` (container mode)

### Model access denied at invocation
Enable the model in Amazon Bedrock console → Model access for the deployment region.

### Agent not responding
1. Check `agentcore status` — ensure runtime is "active"
2. Check CloudWatch logs for errors
3. Verify the agent works locally first (`python my_agent.py`)

### Windows-specific issues
- Use `.venv\Scripts\activate` (not `source .venv/bin/activate`)
- Use PowerShell `Invoke-RestMethod` instead of `curl` for local testing
- Ensure Python 3.10+ is on PATH

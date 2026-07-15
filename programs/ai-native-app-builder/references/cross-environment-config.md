# ⬡ Cross-Cutting — Multi-Environment & Configuration

## Purpose

Manage multiple environments (dev, staging, production), configuration, feature flags, and data migration. Every real application needs environment separation and a strategy for promoting changes safely.

## Capabilities

### 1. Multi-Environment CDK Strategy

**Pattern: CDK Context + Separate Stacks**

```python
# infrastructure/app.py
import aws_cdk as cdk
from stacks.claims_stack import ClaimsProcessingStack

app = cdk.App()

# Environment configuration
ENVIRONMENTS = {
    "dev": {
        "account": "<DEV_ACCOUNT_ID>",
        "region": "us-east-1",
        "table_suffix": "-dev",
        "lambda_memory": 256,
        "log_retention_days": 7,
        "removal_policy": "DESTROY",
    },
    "staging": {
        "account": "<STAGING_ACCOUNT_ID>",
        "region": "us-east-1",
        "table_suffix": "-staging",
        "lambda_memory": 512,
        "log_retention_days": 30,
        "removal_policy": "RETAIN",
    },
    "prod": {
        "account": "<PROD_ACCOUNT_ID>",
        "region": "us-east-1",
        "table_suffix": "-prod",
        "lambda_memory": 512,
        "log_retention_days": 90,
        "removal_policy": "RETAIN",
    },
}

env_name = app.node.try_get_context("env") or "dev"
config = ENVIRONMENTS[env_name]

ClaimsProcessingStack(
    app,
    f"ClaimsProcessing-{env_name}",
    env=cdk.Environment(account=config["account"], region=config["region"]),
    config=config,
)

app.synth()
```

**Deploy to specific environment:**

```bash
cdk deploy -c env=dev       # Development
cdk deploy -c env=staging   # Staging
cdk deploy -c env=prod      # Production (requires approval)
```

**Stack using config:**

```python
class ClaimsProcessingStack(Stack):
    def __init__(self, scope, construct_id, config: dict, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        removal_policy = (
            RemovalPolicy.DESTROY if config["removal_policy"] == "DESTROY"
            else RemovalPolicy.RETAIN
        )

        claims_table = dynamodb.Table(self, "ClaimsTable",
            table_name=f"ClaimsTable{config['table_suffix']}",
            removal_policy=removal_policy,
            point_in_time_recovery=config["removal_policy"] == "RETAIN",
        )

        agent_lambda = lambda_.Function(self, "AgentFunction",
            memory_size=config["lambda_memory"],
            environment={"ENVIRONMENT": config.get("env_name", "dev")},
        )
```

### 2. Environment-Specific Configuration

**SSM Parameter Store for runtime config:**

```python
from aws_cdk import aws_ssm as ssm

# Store config in SSM
ssm.StringParameter(self, "AgentModelId",
    parameter_name=f"/claims-app/{env_name}/agent-model-id",
    string_value="anthropic.claude-3-sonnet-20240229-v1:0",
)

ssm.StringParameter(self, "HighValueThreshold",
    parameter_name=f"/claims-app/{env_name}/high-value-threshold",
    string_value="10000",
)
```

**Reading config at runtime:**

```python
import boto3
import os

ssm = boto3.client("ssm")
ENV = os.environ.get("ENVIRONMENT", "dev")

def get_config(key: str) -> str:
    """Read configuration from SSM Parameter Store."""
    response = ssm.get_parameter(Name=f"/claims-app/{ENV}/{key}")
    return response["Parameter"]["Value"]

# Usage
HIGH_VALUE_THRESHOLD = float(get_config("high-value-threshold"))
MODEL_ID = get_config("agent-model-id")
```

### 3. Feature Flags

**Simple DynamoDB-based feature flags:**

```python
# Feature flags table
feature_flags_table = dynamodb.Table(self, "FeatureFlags",
    table_name=f"FeatureFlags{config['table_suffix']}",
    partition_key=dynamodb.Attribute(name="flagName", type=dynamodb.AttributeType.STRING),
    billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
)
```

**Feature flag check:**

```python
def is_feature_enabled(flag_name: str, default: bool = False) -> bool:
    """Check if a feature flag is enabled."""
    try:
        response = flags_table.get_item(Key={"flagName": flag_name})
        if "Item" in response:
            return response["Item"].get("enabled", default)
    except Exception:
        pass
    return default

# Usage
if is_feature_enabled("fraud_detection_v2"):
    result = run_advanced_fraud_check(claim)
else:
    result = run_basic_fraud_check(claim)
```

**Sample feature flags:**

```json
{"flagName": "fraud_detection_v2", "enabled": true, "description": "Use ML-based fraud detection"}
{"flagName": "auto_approve_low_value", "enabled": false, "description": "Auto-approve claims under $500"}
{"flagName": "streaming_responses", "enabled": true, "description": "Stream agent responses via WebSocket"}
```

### 4. Data Migration & Schema Evolution

**DynamoDB schema evolution (additive only):**

DynamoDB is schemaless — you can add new attributes without migration. For breaking changes:

```python
# scripts/migrate_v2.py
"""Migration: Add 'priority' field to all existing claims."""
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("ClaimsTable")

def migrate():
    response = table.scan()
    items = response["Items"]

    for item in items:
        if "priority" not in item:
            table.update_item(
                Key={"claimId": item["claimId"]},
                UpdateExpression="SET priority = :p",
                ExpressionAttributeValues={":p": "normal"},
            )
            print(f"  Migrated {item['claimId']}")

    # Handle pagination
    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        for item in response["Items"]:
            if "priority" not in item:
                table.update_item(
                    Key={"claimId": item["claimId"]},
                    UpdateExpression="SET priority = :p",
                    ExpressionAttributeValues={":p": "normal"},
                )

if __name__ == "__main__":
    migrate()
```

**GSI addition (no downtime):**

```python
# Adding a new GSI is non-breaking — CDK handles it
claims_table.add_global_secondary_index(
    index_name="StatusDateIndex",
    partition_key=dynamodb.Attribute(name="status", type=dynamodb.AttributeType.STRING),
    sort_key=dynamodb.Attribute(name="filingDate", type=dynamodb.AttributeType.STRING),
)
```

### 5. Environment Promotion Workflow

```
Developer → Feature Branch → Dev Environment
                                    │
                              PR + Review
                                    │
                              Main Branch → Staging Environment
                                                │
                                          Integration Tests
                                                │
                                          Manual Approval
                                                │
                                          Production Environment
```

**CDK Pipelines for automated promotion:**

```python
from aws_cdk import pipelines

pipeline = pipelines.CodePipeline(self, "AppPipeline",
    synth=pipelines.ShellStep("Synth",
        input=pipelines.CodePipelineSource.git_hub("org/repo", "main"),
        commands=[
            "pip install -r requirements.txt",
            "pytest tests/unit/",
            "cd infrastructure && cdk synth",
        ],
    ),
)

# Staging (auto-deploy + integration tests)
staging = pipeline.add_stage(AppStage(self, "Staging", config=ENVIRONMENTS["staging"]))
staging.add_post(pipelines.ShellStep("IntegrationTests",
    commands=["pytest tests/integration/"],
    env_from_cfn_outputs={"API_URL": staging.api_url_output},
))

# Production (manual approval required)
pipeline.add_stage(AppStage(self, "Production", config=ENVIRONMENTS["prod"]),
    pre=[pipelines.ManualApprovalStep("ApproveProduction")],
)
```

### 6. Local Development Setup

**docker-compose for local services:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb"

  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3,sns,sqs,secretsmanager
```

**Local dev script:**

```bash
#!/bin/bash
# scripts/dev-setup.sh

echo "Starting local services..."
docker-compose up -d

echo "Creating local tables..."
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name ClaimsTable \
  --key-schema AttributeName=claimId,KeyType=HASH \
  --attribute-definitions AttributeName=claimId,AttributeType=S \
  --billing-mode PAY_PER_REQUEST

echo "Seeding data..."
python scripts/seed_data.py --local

echo "Ready! API running at http://localhost:3000"
```

## Build Checklist

- [ ] Define environment strategy (dev/staging/prod)
- [ ] Set up CDK context-based environment selection
- [ ] Configure SSM Parameter Store for runtime config
- [ ] Implement feature flags (DynamoDB or AppConfig)
- [ ] Create data migration scripts
- [ ] Set up CDK Pipelines for automated promotion
- [ ] Configure local development environment
- [ ] Document environment-specific differences
- [ ] Set up seed data for each environment
- [ ] Plan rollback strategy per environment

## Common Mistakes

1. **Same AWS account for all environments** — Use separate accounts for isolation
2. **Hardcoded table names** — Use suffixes or SSM parameters for environment-specific names
3. **No staging environment** — Testing in dev then deploying to prod skips critical validation
4. **Feature flags without cleanup** — Remove old flags; they accumulate and confuse
5. **Manual deployments to production** — Always use pipeline with approval gates
6. **No local development option** — Developers shouldn't need AWS access for basic coding

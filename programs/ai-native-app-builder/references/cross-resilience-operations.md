# ⬡ Cross-Cutting — Resilience & Operations

## Purpose

Ensure the application is fault-tolerant, recoverable, and operationally sound. Covers error handling, retry patterns, backup/DR, scaling, and secrets management. Every production app needs these patterns regardless of which FDE layers it uses.

## Capabilities

### 1. Error Handling & Resilience Patterns

**Retry with exponential backoff:**

```python
import time
from functools import wraps

def retry_with_backoff(max_retries=3, base_delay=1.0, max_delay=30.0):
    """Decorator for retrying failed operations with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    time.sleep(delay)
        return wrapper
    return decorator
```

**Dead Letter Queues (DLQ) for failed messages:**

```python
from aws_cdk import aws_sqs as sqs, Duration

dlq = sqs.Queue(self, "DLQ",
    retention_period=Duration.days(14),
)

main_queue = sqs.Queue(self, "MainQueue",
    dead_letter_queue=sqs.DeadLetterQueue(
        max_receive_count=3,
        queue=dlq,
    ),
    visibility_timeout=Duration.seconds(300),
)
```

**Circuit breaker pattern (for external service calls):**

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN

    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
            else:
                return {"error": "Service temporarily unavailable", "retry_after": self.recovery_timeout}

        try:
            result = func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            raise
```

**Graceful degradation for agents:**

```python
@tool
def lookup_policy(policy_id: str) -> dict:
    """Look up policy details with graceful fallback."""
    try:
        response = policies_table.get_item(Key={"policyId": policy_id})
        if "Item" not in response:
            return {"error": f"Policy {policy_id} not found", "suggestion": "Please verify the policy ID"}
        return response["Item"]
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "ProvisionedThroughputExceededException":
            return {"error": "System is busy. Please try again in a moment.", "retryable": True}
        return {"error": f"Unable to look up policy: {error_code}", "retryable": False}
    except Exception as e:
        return {"error": "Service temporarily unavailable", "retryable": True}
```

### 2. Backup & Disaster Recovery

**DynamoDB:**
- Point-in-Time Recovery (PITR) — always enable on production tables
- On-demand backups for pre-deployment snapshots
- Global Tables for multi-region DR

```python
claims_table = dynamodb.Table(self, "ClaimsTable",
    point_in_time_recovery=True,  # ALWAYS enable
    removal_policy=RemovalPolicy.RETAIN,
)
```

**S3:**
- Versioning — recover from accidental overwrites/deletes
- Cross-region replication for DR
- Object Lock for compliance (immutable records)

```python
documents_bucket = s3.Bucket(self, "DocumentsBucket",
    versioned=True,
    encryption=s3.BucketEncryption.S3_MANAGED,
    block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
    removal_policy=RemovalPolicy.RETAIN,
)
```

**Cognito:**
- User pools cannot be replicated — plan for regional failover
- Export user data periodically for DR

**RTO/RPO planning:**

| Component | RPO | RTO | Strategy |
|-----------|-----|-----|----------|
| DynamoDB | 5 min (PITR) | < 1 hour | Restore from PITR |
| S3 | 0 (versioned) | Minutes | Version rollback |
| Lambda code | 0 (in CDK) | Minutes | Redeploy from CDK |
| Cognito users | 24 hours | Hours | Export/import |
| Knowledge Base | Hours | Hours | Re-ingest from S3 source |

### 3. Performance & Scaling

**Lambda optimization:**

```python
claims_lambda = lambda_.Function(self, "AgentFunction",
    memory_size=512,          # More memory = more CPU = faster
    timeout=Duration.seconds(60),
    reserved_concurrent_executions=100,  # Prevent runaway scaling
    environment={
        "POWERTOOLS_SERVICE_NAME": "claims-agent",
    },
)

# Provisioned concurrency for production (eliminates cold starts)
alias = claims_lambda.add_alias("live")
alias.add_auto_scaling(min_capacity=2, max_capacity=50)
```

**DynamoDB capacity:**

```python
# PAY_PER_REQUEST for unpredictable workloads (recommended for most AI apps)
table = dynamodb.Table(self, "Table",
    billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
)

# PROVISIONED with auto-scaling for predictable high-throughput
table = dynamodb.Table(self, "Table",
    billing_mode=dynamodb.BillingMode.PROVISIONED,
    read_capacity=10,
    write_capacity=10,
)
table.auto_scale_read_capacity(min_capacity=5, max_capacity=100).scale_on_utilization(
    target_utilization_percent=70
)
```

**Caching patterns:**

| What to Cache | Service | TTL | When |
|---------------|---------|-----|------|
| Policy lookups | DynamoDB DAX | 5 min | High read frequency, rarely changes |
| API responses | API Gateway cache | 1-5 min | Repeated identical queries |
| Session data | ElastiCache Redis | 30 min | Multi-turn agent conversations |
| Embeddings | S3 + local | Hours | Avoid re-computing expensive embeddings |

**Bedrock throttling mitigation:**
- Use provisioned throughput for production models
- Implement request queuing (SQS → Lambda) for burst traffic
- Cache frequent model responses where appropriate

### 4. Secrets Management

**Pattern: Secrets Manager + environment variables:**

```python
from aws_cdk import aws_secretsmanager as sm

# Create secret
api_secret = sm.Secret(self, "ExternalApiKey",
    secret_name="/app/prod/external-api-key",
    description="API key for external service",
)

# Grant Lambda read access
api_secret.grant_read(claims_lambda)

# Lambda reads at runtime
claims_lambda.add_environment("API_SECRET_ARN", api_secret.secret_arn)
```

**In Lambda code:**

```python
import boto3
import json

secrets_client = boto3.client("secretsmanager")

def get_secret(secret_arn: str) -> str:
    """Retrieve secret value (cached across invocations)."""
    response = secrets_client.get_secret_value(SecretId=secret_arn)
    return json.loads(response["SecretString"])
```

**Secret rotation:**

```python
api_secret = sm.Secret(self, "RotatingSecret",
    secret_name="/app/prod/db-password",
    generate_secret_string=sm.SecretStringGenerator(
        exclude_punctuation=True,
        password_length=32,
    ),
)
# Rotation every 30 days
api_secret.add_rotation_schedule("Rotation",
    automatically_after=Duration.days(30),
    rotation_lambda=rotation_function,
)
```

**Local development (.env):**

```bash
# .env.local (gitignored)
CLAIMS_TABLE_NAME=ClaimsTable-dev
DOCUMENTS_BUCKET=claims-docs-dev-123456
API_SECRET_ARN=arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:/app/dev/api-key
```

### 5. Notifications & Async Communication

**SNS for fan-out notifications:**

```python
from aws_cdk import aws_sns as sns, aws_sns_subscriptions as subs

topic = sns.Topic(self, "ClaimNotifications", topic_name="ClaimNotifications")

# Email subscription
topic.add_subscription(subs.EmailSubscription("admin@example.com"))

# Lambda subscription (for custom processing)
topic.add_subscription(subs.LambdaSubscription(notification_handler))

# SQS subscription (for reliable delivery)
topic.add_subscription(subs.SqsSubscription(notification_queue))
```

**WebSocket for real-time streaming (agent responses):**

```python
from aws_cdk import aws_apigatewayv2 as apigwv2

websocket_api = apigwv2.WebSocketApi(self, "AgentWebSocket",
    connect_route_options=apigwv2.WebSocketRouteOptions(integration=connect_integration),
    disconnect_route_options=apigwv2.WebSocketRouteOptions(integration=disconnect_integration),
    default_route_options=apigwv2.WebSocketRouteOptions(integration=message_integration),
)
```

**SQS for reliable async processing:**

```python
from aws_cdk import aws_sqs as sqs

processing_queue = sqs.Queue(self, "ProcessingQueue",
    visibility_timeout=Duration.seconds(300),
    retention_period=Duration.days(7),
    dead_letter_queue=sqs.DeadLetterQueue(max_receive_count=3, queue=dlq),
)
```

### 6. Logging & Structured Logs

**Lambda Powertools for structured logging:**

```python
from aws_lambda_powertools import Logger, Tracer, Metrics

logger = Logger(service="claims-agent")
tracer = Tracer(service="claims-agent")
metrics = Metrics(namespace="ClaimsApp", service="claims-agent")

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event, context):
    logger.info("Processing request", extra={"claim_id": claim_id, "action": "create"})
```

**Correlation IDs across services:**

```python
import uuid

def handler(event, context):
    # Extract or generate correlation ID
    correlation_id = event.get("headers", {}).get("X-Correlation-Id", str(uuid.uuid4()))
    logger.append_keys(correlation_id=correlation_id)

    # Pass to downstream calls
    response = invoke_downstream(correlation_id=correlation_id)
```

**Log retention policy (CDK):**

```python
from aws_cdk import aws_logs as logs

logs.LogGroup(self, "AgentLogs",
    log_group_name=f"/aws/lambda/{function_name}",
    retention=logs.RetentionDays.ONE_MONTH,  # Don't keep forever
    removal_policy=RemovalPolicy.DESTROY,
)
```

## Build Checklist

- [ ] Implement retry with backoff on all external calls
- [ ] Add DLQ to all SQS queues
- [ ] Enable PITR on all DynamoDB tables
- [ ] Enable versioning on all S3 buckets
- [ ] Set up Secrets Manager for all credentials
- [ ] Configure Lambda memory/timeout appropriately
- [ ] Add structured logging (Lambda Powertools)
- [ ] Implement correlation IDs across services
- [ ] Set log retention policies (not infinite)
- [ ] Plan DR strategy (document RTO/RPO)
- [ ] Set up CloudWatch alarms for errors and latency
- [ ] Configure reserved concurrency to prevent runaway scaling
- [ ] Add circuit breakers for external service calls

## Common Mistakes

1. **No DLQ** — Failed messages disappear forever; always have a DLQ
2. **Infinite log retention** — CloudWatch costs add up; set 30-90 day retention
3. **Secrets in environment variables** — Use Secrets Manager ARN, not the value itself
4. **No timeout on Lambda** — Default 3s is too short for agents; set 30-60s
5. **Missing PITR** — One bad deployment can corrupt data; PITR lets you recover
6. **Cold starts in production** — Use provisioned concurrency for user-facing agents
7. **No correlation IDs** — Debugging distributed systems without them is painful

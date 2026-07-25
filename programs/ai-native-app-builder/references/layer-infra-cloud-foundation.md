# ⬡ Infrastructure — Cloud Platform & Foundation

## Purpose

The underlying cloud foundation that every application needs. Not a numbered FDE layer — it's the base everything else sits on.

## Capabilities

### 1. Infrastructure as Code (CDK / Terraform)

**Coverage:** ✅ Both (Accel #31 + Agentic #52)

| Resource | Link |
|----------|------|
| AWS CDK Examples | https://github.com/aws-samples/aws-cdk-examples |
| AgentCore Starter Toolkit | https://github.com/aws/bedrock-agentcore-starter-toolkit |
| CDK DevOps Template | https://github.com/aws-samples/aws-cdk-project-template-for-devops |

**Pattern:** Always use CDK (Python or TypeScript) for infrastructure. Start with `cdk init app --language python` or use a starter template.

**Key decisions:**
- Language: Python (matches agent code) or TypeScript (matches frontend)
- Single stack vs nested stacks: Use nested for >20 resources
- Environment separation: Use CDK context or separate stacks per env

### 2. Cloud Account / VPC / Container Runtime

**Coverage:** 🟢 Agentic #48

| Resource | Link |
|----------|------|
| Agentic Platform (EKS + AgentCore) | https://github.com/aws-samples/sample-agentic-platform |

**When to use VPC:**
- Agent accesses private resources (RDS, ElastiCache, internal APIs)
- Compliance requires network isolation
- Multi-agent platform with shared infrastructure

**When to skip VPC:**
- Serverless-only (Lambda + DynamoDB + S3) — use service endpoints
- Simple agent with public API access only

### 3. Auth & Identity (Cognito)

**Coverage:** 🔵 Accel #26

| Resource | Link |
|----------|------|
| Cognito + API Gateway CDK | https://github.com/aws-samples/amazon-cognito-and-api-gateway-based-machine-to-machine-authorization-using-aws-cdk |
| React SPA with Cognito Auth | https://github.com/aws-samples/aws-react-spa-with-cognito-auth |
| Amplify Gen2 Auth | https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/ |
| AgentCore Identity (Cognito) | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-getting-started-cognito.html |

**Standard pattern for AI apps:**

```
Cognito User Pool
├── Groups (role-based access)
│   ├── Users (end users — limited access)
│   ├── Operators (reviewers — elevated access)
│   └── Admins (full access)
├── App Client (frontend)
├── Cognito Authorizer → API Gateway
└── Post-Confirmation Trigger → Auto-assign default group
```

**CDK snippet:**

```python
from aws_cdk import aws_cognito as cognito

user_pool = cognito.UserPool(self, "AppUserPool",
    self_sign_up_enabled=True,
    sign_in_aliases=cognito.SignInAliases(email=True),
    auto_verify=cognito.AutoVerifiedAttrs(email=True),
    password_policy=cognito.PasswordPolicy(
        min_length=8,
        require_uppercase=True,
        require_digits=True,
        require_symbols=True,
    ),
    removal_policy=RemovalPolicy.RETAIN,
)

# Groups
for group_name in ["Users", "Operators", "Admins"]:
    cognito.CfnUserPoolGroup(self, f"{group_name}Group",
        user_pool_id=user_pool.user_pool_id,
        group_name=group_name,
    )

# App client
app_client = user_pool.add_client("AppClient",
    auth_flows=cognito.AuthFlow(user_password=True, user_srp=True),
    generate_secret=False,
)
```

## Build Checklist

- [ ] CDK project initialized with proper structure
- [ ] Cognito User Pool with groups defined
- [ ] API Gateway with Cognito Authorizer
- [ ] Environment variables / SSM parameters for cross-stack references
- [ ] VPC (if needed) with private subnets and NAT gateway
- [ ] KMS key for encryption (if handling sensitive data)

## Common Mistakes

1. **Not using RemovalPolicy.RETAIN on stateful resources** — DynamoDB tables, S3 buckets, and Cognito pools should never be accidentally deleted
2. **Hardcoding account/region** — Use `Aws.ACCOUNT_ID` and `Aws.REGION`
3. **Missing Cognito Authorizer on API** — Every endpoint should require auth unless explicitly public
4. **Single app client for all environments** — Use separate clients for dev/prod

# ✓ Cross-Cutting — Deployment Guide

## Purpose

Step-by-step deployment instructions for AI applications on AWS. Covers prerequisites, backend (CDK), frontend (S3+CloudFront or Amplify Hosting), seed data, and verification — with platform-specific commands for Windows (PowerShell/CMD), macOS, and Linux.

---

## Prerequisites

### AWS Account & Credentials

```bash
# Verify AWS credentials are configured
aws sts get-caller-identity

# Expected output: account ID, ARN, user/role
```

**Required permissions:**
- CloudFormation (create/update stacks)
- DynamoDB (create tables)
- S3 (create buckets)
- Lambda (create functions)
- API Gateway (create APIs)
- Cognito (create user pools)
- Bedrock (invoke models, create guardrails)
- IAM (create roles/policies)
- CloudWatch (create log groups)
- SNS (create topics)

### Software Requirements

| Tool | Version | Install |
|------|---------|---------|
| Python | — 3.12 | https://python.org |
| Node.js | — 18 | https://nodejs.org |
| AWS CLI | — 2.x | https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html |
| AWS CDK CLI | — 2.150 | `npm install -g aws-cdk` |
| Git | Any | https://git-scm.com |

### Bedrock Model Access

You **must** enable model access before deploying:

1. Go to AWS Console → Amazon Bedrock → Model access
2. Request access to: **Anthropic Claude 3 Sonnet**
3. Wait for approval (usually instant for on-demand)

---

## Deployment Steps

### Step 1: Clone & Setup Python Environment

#### macOS / Linux

```bash
cd ~/repos
git clone <your-repo-url> claims-processing
cd claims-processing

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

#### Windows (PowerShell)

```powershell
cd C:\Users\$env:USERNAME\Documents\Repos
git clone <your-repo-url> claims-processing
cd claims-processing

python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

#### Windows (CMD)

```cmd
cd C:\Users\%USERNAME%\Documents\Repos
git clone <your-repo-url> claims-processing
cd claims-processing

python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

---

### Step 2: Bootstrap CDK (First Time Only)

CDK bootstrap creates an S3 bucket and IAM roles that CDK uses for deployments.

#### All Platforms

```bash
cd infrastructure
pip install -r requirements.txt
cdk bootstrap aws://<ACCOUNT_ID>/<REGION>
```

Replace `<ACCOUNT_ID>` with your AWS account number and `<REGION>` with your target region (e.g., `us-east-1`).

**To find your account ID:**

```bash
aws sts get-caller-identity --query Account --output text
```

---

### Step 3: Deploy Backend (CDK)

#### Deploy to Dev

```bash
cd infrastructure
cdk deploy -c env=dev --require-approval never
```

#### Deploy to Staging

```bash
cdk deploy -c env=staging --require-approval broadening
```

#### Deploy to Production

```bash
cdk deploy -c env=prod --require-approval broadening
```

**Expected output:** Stack outputs including:
- `ApiEndpoint` — Your API Gateway URL
- `UserPoolId` — Cognito User Pool ID
- `UserPoolClientId` — Cognito App Client ID
- `DocumentsBucket` — S3 bucket name
- `GuardrailId` — Bedrock Guardrail ID

**Save these values** — you'll need them for the frontend.

---

### Step 4: Seed Data

#### macOS / Linux

```bash
cd ..  # Back to project root
source .venv/bin/activate
python scripts/seed_data.py dev
```

#### Windows (PowerShell)

```powershell
cd ..
.venv\Scripts\Activate.ps1
python scripts\seed_data.py dev
```

---

### Step 5: Create Test Users in Cognito

```bash
# Replace <USER_POOL_ID> with the value from CDK output

# Create an adjuster user
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username adjuster@example.com \
  --user-attributes Name=email,Value=adjuster@example.com Name=name,Value="Test Adjuster" \
  --temporary-password <TEMP_PASSWORD>

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id <USER_POOL_ID> \
  --username adjuster@example.com \
  --password <SECURE_PASSWORD> \
  --permanent

# Add to Adjusters group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <USER_POOL_ID> \
  --username adjuster@example.com \
  --group-name Adjusters

# Create a policy holder user
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username holder@example.com \
  --user-attributes Name=email,Value=holder@example.com Name=name,Value="Test Holder" \
  --temporary-password <TEMP_PASSWORD>

aws cognito-idp admin-set-user-password \
  --user-pool-id <USER_POOL_ID> \
  --username holder@example.com \
  --password <SECURE_PASSWORD> \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --user-pool-id <USER_POOL_ID> \
  --username holder@example.com \
  --group-name PolicyHolders
```

**Windows PowerShell note:** Replace `\` line continuations with backtick `` ` `` or put on one line.

---

### Step 6: Deploy Frontend

#### Option A: Local Development (All Platforms)

```bash
cd frontend
npm install
```

Create `.env.local` with values from CDK output:

```bash
VITE_API_ENDPOINT=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_REGION=us-east-1
```

Start dev server:

```bash
npm run dev
```

Open http://localhost:5173

#### Option B: Deploy to S3 + CloudFront (Production)

Build the frontend:

```bash
cd frontend
npm install
npm run build
```

Deploy using AWS CLI:

```bash
# Create S3 bucket for hosting
aws s3 mb s3://claims-portal-frontend-<ACCOUNT_ID>

# Upload built files
aws s3 sync dist/ s3://claims-portal-frontend-<ACCOUNT_ID> --delete

# Enable static website hosting
aws s3 website s3://claims-portal-frontend-<ACCOUNT_ID> --index-document index.html --error-document index.html
```

For production with CloudFront (HTTPS + custom domain), add the CloudFront distribution to your CDK stack (see `layer-6-ui-implementation.md`).

#### Option C: Amplify Hosting (Simplest)

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize (connect to your Git repo)
amplify init

# Deploy
amplify publish
```

---

### Step 7: Verify Deployment

#### Test the API directly

```bash
# Get a token (replace values)
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <CLIENT_ID> \
  --auth-parameters USERNAME=adjuster@example.com,PASSWORD=<SECURE_PASSWORD> \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Call the API
curl -X POST <API_ENDPOINT>/claims \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "I need to file a claim for a car accident"}'
```

**Windows PowerShell equivalent:**

```powershell
$result = aws cognito-idp initiate-auth `
  --auth-flow USER_PASSWORD_AUTH `
  --client-id <CLIENT_ID> `
  --auth-parameters USERNAME=adjuster@example.com,PASSWORD=<SECURE_PASSWORD> `
  --query 'AuthenticationResult.IdToken' `
  --output text

$headers = @{ "Authorization" = "Bearer $result"; "Content-Type" = "application/json" }
$body = '{"message": "I need to file a claim for a car accident"}'
Invoke-RestMethod -Uri "<API_ENDPOINT>/claims" -Method POST -Headers $headers -Body $body
```

#### Verify checklist

- [ ] CDK stack deployed without errors
- [ ] API Gateway endpoint returns 401 without token (auth working)
- [ ] API Gateway returns 200 with valid token
- [ ] Agent responds to "file a claim" message
- [ ] Seed data visible in DynamoDB console
- [ ] Frontend loads and shows Authenticator
- [ ] Can log in with test user
- [ ] Dashboard shows seeded claims
- [ ] Chat interface sends/receives messages

---

## Teardown / Cleanup

**☐ï¸ This destroys all resources. Only use for dev environments.**

```bash
cd infrastructure
cdk destroy -c env=dev --force
```

For production, resources have `RemovalPolicy.RETAIN` — they won't be deleted even if the stack is destroyed. You must manually delete DynamoDB tables, S3 buckets, and Cognito pools.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `cdk deploy` fails with "no credentials" | AWS CLI not configured | Run `aws configure` |
| `cdk deploy` fails with "bootstrap required" | CDK not bootstrapped in this region | Run `cdk bootstrap` |
| API returns 403 | Cognito token expired or invalid | Get a fresh token |
| API returns 500 | Lambda error | Check CloudWatch logs: `/aws/lambda/ClaimsAgent-dev` |
| Agent returns empty response | Bedrock model not enabled | Enable Claude 3 Sonnet in Bedrock console |
| Frontend shows blank page | Missing `.env.local` values | Copy from CDK outputs |
| `npm run dev` fails | Missing node_modules | Run `npm install` |
| Guardrail blocks everything | Guardrail too strict | Check denied topics in CDK stack |

---

## Quick Deploy Script

### macOS / Linux (`scripts/deploy.sh`)

```bash
#!/bin/bash
set -e

ENV=${1:-dev}
echo "u{1F680} Deploying claims-processing to $ENV..."

# Backend
echo "u{1F4E6} Deploying backend..."
cd infrastructure
pip install -r requirements.txt -q
cdk deploy -c env=$ENV --require-approval never --outputs-file ../cdk-outputs.json
cd ..

# Seed data (dev only)
if [ "$ENV" = "dev" ]; then
  echo "u{1F331} Seeding data..."
  python scripts/seed_data.py dev
fi

# Frontend
echo "u{1F3A8} Building frontend..."
cd frontend
npm install --silent
npm run build
cd ..

echo "“ Deployment complete!"
echo "u{1F4CB} Outputs saved to cdk-outputs.json"
cat cdk-outputs.json
```

### Windows (`scripts\deploy.ps1`)

```powershell
param([string]$Env = "dev")

Write-Host "u{1F680} Deploying claims-processing to $Env..." -ForegroundColor Cyan

# Backend
Write-Host "u{1F4E6} Deploying backend..." -ForegroundColor Yellow
Push-Location infrastructure
pip install -r requirements.txt -q
cdk deploy -c env=$Env --require-approval never --outputs-file ..\cdk-outputs.json
Pop-Location

# Seed data (dev only)
if ($Env -eq "dev") {
    Write-Host "u{1F331} Seeding data..." -ForegroundColor Yellow
    python scripts\seed_data.py dev
}

# Frontend
Write-Host "u{1F3A8} Building frontend..." -ForegroundColor Yellow
Push-Location frontend
npm install --silent
npm run build
Pop-Location

Write-Host "“ Deployment complete!" -ForegroundColor Green
Write-Host "u{1F4CB} Outputs:"
Get-Content cdk-outputs.json
```

**Usage:**

```bash
# macOS/Linux
chmod +x scripts/deploy.sh
./scripts/deploy.sh dev

# Windows PowerShell
.\scripts\deploy.ps1 -Env dev
```

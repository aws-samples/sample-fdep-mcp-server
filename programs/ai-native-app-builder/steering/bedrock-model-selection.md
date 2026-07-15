---
id: bedrock-model-selection
description: "Verified patterns for Amazon Bedrock model selection and configuration"
inclusion: auto
match: "aidlc-docs/construction/**"
priority: 92
---

# Bedrock Model Selection — Verified Patterns

## Context

Created after three consecutive deployment failures due to Bedrock model selection issues:
1. Claude 3 Sonnet (original model) — reached end-of-life, rejected with ResourceNotFoundException
2. Claude Sonnet 4 (direct model ID) — requires inference profile, rejected with ValidationException
3. Claude Sonnet 4 (EU inference profile) — marked as "Legacy" due to 30-day inactivity, rejected with ResourceNotFoundException

## Rules

### 1. Always use inference profiles, never direct model IDs

```typescript
// WRONG — will fail with ValidationException for newer models
const MODEL_ID = 'anthropic.claude-sonnet-4-20250514-v1:0';

// CORRECT — use the regional inference profile
const MODEL_ID = 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0'; // eu-central-1
```

### 2. Verify model availability BEFORE writing code

During Infrastructure Design, run:
```bash
aws bedrock list-inference-profiles --region <target-region> \
  --query "inferenceProfileSummaries[?contains(inferenceProfileName,'Claude')].{Name:inferenceProfileName,Id:inferenceProfileId}"
```

Use the inference profile ID from the output, not the model ID from documentation.

### 3. IAM policy must use wildcard for Bedrock at PoC level

Inference profile ARN format is complex and changes between model versions. For PoC:
```typescript
// PoC — allow all Bedrock models
assessmentFn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel'],
  resources: ['*'],
}));
```

For MVP/Production, scope to specific inference profiles:
```typescript
// Production — scoped to specific profile
assessmentFn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel'],
  resources: [
    `arn:aws:bedrock:${region}:${account}:inference-profile/${profileId}`,
  ],
}));
```

### 4. Legacy model trap

Models become "Legacy" if your account hasn't invoked them in 30 days. The error message is:
> "Access denied. This Model is marked by provider as Legacy and you have not been actively using the model in the last 30 days."

**Mitigation**: Use the LATEST available model version, not a specific dated version. Check `list-inference-profiles` at deployment time.

### 5. Model selection decision tree

```
Which region?
├── us-east-1 or us-west-2 → Most models available, use latest
├── eu-central-1 → Use eu.* inference profiles
├── ap-* regions → Check availability, may need cross-region
└── me-south-1 → Limited availability, likely need cross-region

Which model for vision/multimodal?
├── Available + Active → eu.anthropic.claude-sonnet-4-5-* (latest)
├── If Legacy error → Try next latest version
└── If no EU profile → Fall back to us.* profiles (cross-region call)
```

### 6. Document the model in requirements AND infrastructure design

The model ID should be captured in:
- Requirements (NFR section: "AI approach")
- Infrastructure Design (environment variables)
- CDK code (literal string, not inferred)

If the model changes during deployment troubleshooting, update ALL THREE locations.

## Enforcement

- During Code Generation, verify the model ID against `list-inference-profiles` output
- During Build and Test, the first test should be an actual Bedrock invocation (not mocked)
- If model invocation fails, log the error clearly and update the model ID — do not retry the same failing model

## Origin

Created: 2026-06-11
Engagement: etihad-baggage
Region: eu-central-1
Failures: 3 consecutive model selection errors requiring 3 CDK redeploys to resolve. Total time wasted: ~30 minutes of deploy cycles + debugging.

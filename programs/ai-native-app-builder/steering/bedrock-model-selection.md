---
id: bedrock-model-selection
description: "Verified patterns for Amazon Bedrock model selection and configuration"
inclusion: auto
match: "aidlc-docs/construction/**"
priority: 92
---

# Bedrock Model Selection — Verified Patterns

## Context

Bedrock model IDs are a moving target. Models reach end-of-life, become "Legacy"
after inactivity, and require inference profiles for newer versions. Any specific
model ID written into a rule or example WILL go stale — dated identifiers such as
`...-20250514-...` are deprecated within months. **This rule therefore never
asserts a current model ID. It delegates model resolution to the live source of
truth via the AWS MCP server.**

## Rules

### 0. Resolve the current model at build time — never hardcode from memory

Do NOT write a model ID from training data or from this document. Resolve the
current, active model for the target region at generation time using the
**AWS MCP server** (the required companion server; see the Quick Start).

1. **Confirm the recommended current model and its lifecycle status** by reading
   the authoritative AWS documentation through the AWS MCP server:
   - Model lifecycle (ACTIVE / LEGACY / EOL): <https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html>
   - Inference-profile support and per-model IDs: <https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html>
2. **Verify live availability in the target region** by calling the AWS API
   through the AWS MCP server (equivalent to `bedrock list-inference-profiles` /
   `bedrock list-foundation-models`). Use the ID returned by the live call.
3. Use the resolved inference-profile ID in the generated code. If you cannot
   reach the AWS MCP server, STOP and tell the FDE — do not fall back to a
   remembered ID.

> The examples below use `<current-inference-profile-id>` as a placeholder.
> Substitute the value resolved in steps 1–2. Never commit a hardcoded dated
> model ID as if it were authoritative.

### 1. Always use inference profiles, never direct model IDs

```typescript
// WRONG — a bare dated model ID; fails with ValidationException for newer
// models and goes stale as versions are deprecated.
const MODEL_ID = 'anthropic.claude-<version>-<date>-v1:0';

// CORRECT — a regional inference profile ID resolved at build time via the
// AWS MCP server (see Rule 0). Example shape only:
const MODEL_ID = '<region>.<current-inference-profile-id>';
```

### 2. Verify model availability BEFORE writing code

During Infrastructure Design, resolve availability through the AWS MCP server
(preferred), or with the AWS CLI as a fallback:
```bash
aws bedrock list-inference-profiles --region <target-region> \
  --query "inferenceProfileSummaries[?contains(inferenceProfileName,'Claude')].{Name:inferenceProfileName,Id:inferenceProfileId}"
```

Use the inference profile ID from the live output — never a model ID copied from
documentation or memory.

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
├── Resolve the latest ACTIVE Claude model via the AWS MCP server (Rule 0)
├── If Legacy/EOL error → resolve the next-latest ACTIVE version live
└── If no regional profile → fall back to us.* profiles (cross-region call)
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

## Rationale

This rule exists because Bedrock model selection is a recurring source of deploy
failures: a model reaches end-of-life (ResourceNotFoundException), a newer model
requires an inference profile rather than a direct ID (ValidationException), or a
model is marked Legacy after 30 days of inactivity. Each forces a redeploy cycle.
Resolving the current model live via the AWS MCP server at build time — rather
than hardcoding a dated ID — prevents all three failure classes.

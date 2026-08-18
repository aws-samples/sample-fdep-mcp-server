---
id: deploy-verify-loop
description: "Deploy-verify loop ensuring pipeline testing before declaring completion"
inclusion: auto
match: "aidlc-docs/construction/**"
priority: 90
---

# Deploy-Verify Loop — Test the Pipeline Before Declaring Done

## Context

Created after a PoC required 5 deployment iterations to get the end-to-end pipeline working. Each failure was only discovered after deploy + manual test + log inspection. A single pre-deployment verification step would have caught all issues upfront.

## Rule

After Code Generation and BEFORE declaring Build and Test complete:

### 1. Verify external service connectivity FIRST

Before deploying the full stack, verify that critical external services work:

```bash
# Verify Bedrock model is accessible
aws bedrock list-inference-profiles --region <region> \
  --query "inferenceProfileSummaries[?contains(inferenceProfileId,'claude')].inferenceProfileId"

# Verify the model can be invoked (simple test)
aws bedrock-runtime invoke-model \
  --model-id <inference-profile-id> \
  --region <region> \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":[{"type":"text","text":"hi"}]}]}' \
  /dev/stdout
```

If this fails, fix it BEFORE deploying Lambda functions that depend on it.

### 2. After first deploy, run a smoke test immediately

Don't wait for the user to test. After `cdk deploy` succeeds, immediately:

```bash
# 1. Get an auth token
TOKEN=$(aws cognito-idp initiate-auth ...)

# 2. Test the health endpoint
curl -s <API_URL>/health

# 3. Test the upload flow
curl -s -X POST <API_URL>/claims/upload-url -H "Authorization: $TOKEN" ...

# 4. Upload a real test file
curl -s -X PUT <presigned-url> --data-binary @test-image.jpg

# 5. Verify file in S3
aws s3 ls s3://<bucket>/<key>

# 6. Submit a claim with the real key
curl -s -X POST <API_URL>/claims -H "Authorization: $TOKEN" -d '{...}'

# 7. Check logs for errors
aws logs get-log-events ...
```

### 3. Fix forward, not around

If the smoke test reveals failures:
- Fix the root cause (model ID, IAM policy, presigned URL format)
- Redeploy
- Re-run the SAME smoke test
- Don't declare success until the test passes end-to-end

### 4. Common deployment failures to check proactively

| Failure | How to detect BEFORE deploy | Fix |
|---------|---------------------------|-----|
| Model deprecated/legacy | `list-inference-profiles` | Use latest active model |
| IAM too restrictive | Review policy against actual API calls | Match actions + resources |
| Presigned URL mismatch | Test upload from curl with same headers as browser | Remove ContentType from signing |
| Cross-region access denied | Verify IAM allows cross-region calls | Add region to resource ARN |
| Cold start timeout | Check Lambda timeout > expected latency + buffer | Increase timeout or go async |

## Enforcement

- After EVERY `cdk deploy`, run the smoke test sequence above
- If any step fails, the deployment is NOT complete — fix and redeploy
- Log all deployment iterations in the audit trail (for retrospective)

## Rationale

This rule exists because end-to-end pipeline issues (deprecated model, wrong
model format, legacy model, over-restrictive IAM) are typically discovered only
after a full deploy + manual test + log inspection — each iteration costing a
CDK deploy cycle. A pre-deploy connectivity check plus an immediate post-deploy
smoke test catches these upfront instead of across several redeploys.

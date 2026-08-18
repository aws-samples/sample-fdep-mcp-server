---
id: poc-async-default
description: "Async-by-default pattern for multi-service orchestration in PoC builds"
inclusion: auto
match: "aidlc-docs/construction/**"
priority: 93
---

# PoC Async-by-Default for Multi-Service Orchestration

## Context

Created after a PoC demo suffered a poor user experience because the synchronous orchestration pattern (Lambda → Lambda → Lambda) exceeded API Gateway's 30-second timeout. The assessment pipeline worked correctly but the customer saw a timeout error and had to refresh to see the result.

The "synchronous for PoC simplicity" trade-off is a false economy: it saves 2 hours of Step Functions setup but creates a broken demo experience that undermines the PoC's credibility.

## Rule

When designing orchestration for a multi-service pipeline at ANY appLevel (including PoC):

1. **If the pipeline calls an AI model (Bedrock, SageMaker, external LLM)** → use async by default. AI inference latency is unpredictable (2-30s) and will breach API Gateway's 29s timeout on cold starts or complex prompts.

2. **The async pattern for PoC is simple**:
   - API returns `202 Accepted` with `{ claimId, status: "SUBMITTED" }` immediately
   - Separate Lambda (triggered by DynamoDB Stream or direct async invoke) runs the pipeline
   - Customer polls `GET /claims/{id}` for status updates (simple, no WebSocket needed)
   - Frontend shows "Processing..." spinner that polls every 3 seconds

3. **Do NOT use Step Functions for PoC** unless the workflow has branching, retries, or human-wait states. A simple async Lambda invoke is sufficient for linear pipelines at PoC level.

4. **The decision tree**:
   ```
   Does the pipeline call an AI model or external service with >5s latency?
   ├── Yes → Async (even at PoC)
   │   ├── PoC: Async Lambda invoke + polling
   │   ├── MVP: Step Functions + callback
   │   └── Production: Step Functions + WebSocket push
   └── No → Synchronous is fine (CRUD, lookups, simple transforms)
   ```

## What this changes in the app-level matrix

| Layer | PoC (OLD) | PoC (NEW) | MVP | Production |
|-------|-----------|-----------|-----|------------|
| L4 Workflow | Basic (sync) | **Basic (async for AI pipelines)** | Full (Step Functions) | Full + saga |

## Implementation pattern (PoC-level async)

```typescript
// API handler — returns immediately
export async function handler(event) {
  const claim = await storeClaim(event); // DynamoDB write
  
  // Trigger assessment pipeline asynchronously
  await lambda.invoke({
    FunctionName: PIPELINE_FUNCTION,
    InvocationType: 'Event', // async — returns immediately
    Payload: JSON.stringify({ claimId: claim.id }),
  });

  return { statusCode: 202, body: JSON.stringify({ claimId: claim.id, status: 'SUBMITTED' }) };
}

// Pipeline handler — runs asynchronously, no timeout pressure
export async function pipelineHandler(event) {
  const { claimId } = event;
  await updateStatus(claimId, 'ASSESSING');
  const assessment = await callBedrock(claimId);        // Can take 5-20s safely
  const compensation = await applyRules(assessment);     // Fast
  const status = compensation.autoApproved ? 'APPROVED' : 'PENDING_REVIEW';
  await updateStatus(claimId, status);
  await notify(claimId, status);                         // Async email
}
```

## Frontend polling pattern (PoC-level)

```typescript
// After submitting, poll for status updates
const pollForResult = async (claimId: string) => {
  const interval = setInterval(async () => {
    const claim = await getClaim(claimId);
    if (claim.status !== 'SUBMITTED' && claim.status !== 'ASSESSING') {
      clearInterval(interval);
      // Show result to user
    }
  }, 3000); // Poll every 3 seconds
};
```

## Why not "sync is simpler"

| "Simpler" aspect | Reality |
|------------------|---------|
| Fewer Lambda functions | You already have 5. One more (pipeline) is trivial. |
| No polling code | 10 lines of `setInterval` in the frontend. |
| Easier to debug | Sync timeout errors are HARDER to debug (no response body). Async has full CloudWatch logs. |
| Faster to build | 30 minutes more setup. Saves hours of "why does the demo timeout?" debugging. |

## Rationale

This rule exists because a synchronous Lambda chain that calls an AI model can
exceed API Gateway's ~29s timeout once cold starts, data writes, and
orchestration overhead are added — even when the pipeline itself works. The
result is a blank error response and a broken demo experience. Async-by-default
for AI pipelines (202 Accepted + polling) avoids the timeout entirely.

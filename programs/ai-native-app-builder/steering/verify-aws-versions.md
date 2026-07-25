---
id: verify-aws-versions
description: "Rule to verify AWS SDK and service versions before code generation"
inclusion: always
priority: 94
---
<!-- FDE_MANAGED hash:verify-aws-versions-v1 -->

# Verify Current AWS Versions Before Design and Code Generation

## Rule

Before generating any application code or CDK infrastructure, the agent MUST verify the current versions of AWS services and SDKs being used. Do not rely on training data for version numbers.

### Required Checks

1. **AWS CDK version** - check `package.json` or run `cdk --version`
2. **AWS SDK version** - check installed `@aws-sdk/*` packages
3. **Amplify version** - if using Amplify, verify v6 patterns (not v5)
4. **Bedrock model IDs** - use current model identifiers, not deprecated ones
5. **Strands Agents SDK** - verify latest API patterns

### How to Verify

- Read existing `package.json` for pinned versions
- Consult layer references (which contain tested, version-specific patterns)
- When uncertain, ask the user which version they are targeting

## Why

- AWS services evolve rapidly; training data may reference deprecated APIs
- CDK constructs change between major versions (v1 vs v2)
- Amplify v5 to v6 migration changed the entire configuration model
- Model IDs change (e.g., `anthropic.claude-3-sonnet-20240229-v1:0` vs newer)
- Using wrong versions causes deployment failures that are hard to debug

## Anti-patterns

- Generating `aws-amplify` v5 config (`Amplify.configure(awsExports)`) when v6 is in use
- Using CDK v1 import paths (`@aws-cdk/aws-lambda`) instead of v2 (`aws-cdk-lib/aws-lambda`)
- Hardcoding model IDs without checking current availability in the target region
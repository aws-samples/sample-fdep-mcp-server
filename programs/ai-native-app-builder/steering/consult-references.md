---
id: consult-layer-references
description: "Rule to consult layer references before generating code"
inclusion: always
priority: 94
---

# Consult Layer References Before Code Generation

## Context

This rule was created after a pattern failure where frontend code was generated from agent memory rather than from the existing layer reference files. The references contained the correct Amplify v6 patterns, but the agent didn't read them during Code Generation, resulting in incorrect config formats and authentication flow errors.

## Rule

When generating code during any AI-DLC Construction Code Generation stage:

1. **ALWAYS read the relevant layer reference files BEFORE writing code.** Do not generate implementation patterns from memory when verified reference material exists.

2. **How to access references:** Reference files are rendered into the engagement directory. The paths below are relative to the engagement root:
   - **Kiro:** inside each skill folder — `.kiro/skills/ai-native-app-builder-<skillId>/references/<filename>` (e.g. `.kiro/skills/ai-native-app-builder-build-aws-app/references/<filename>`)
   - **Claude:** `.claude/references/ai-native-app-builder/<filename>`
   - **Cursor:** `.cursor/references/ai-native-app-builder/<filename>`
   - **Copilot:** `.github/references/ai-native-app-builder/<filename>`
   - **Fallback (MCP):** `fde_get_skill(skillId="build-aws-app", file="references/<filename>")`

3. **For frontend code**, read these references first:
   - `layer-5-ai-app-creation.md` (UI patterns, auth, file upload)
   - `layer-5-ui-implementation.md` (Amplify config, API client, streaming, deployment)

4. **For infrastructure code**, read:
   - `layer-infra-cloud-foundation.md`
   - `cross-deployment-guide.md`

5. **For agent/AI code**, read:
   - `layer-6-ai-agents.md`
   - `layer-4-ai-workflow.md`

6. **For data layer code**, read:
   - `layer-3-ai-data-ontology.md`
   - `layer-2-enterprise-resources.md`

7. **Use the exact patterns shown in references.** If the reference shows `fetchAuthSession()` from `aws-amplify/auth`, use that — don't substitute with a different import path or API from a different Amplify version.

## Why this matters

- AWS SDK and framework APIs change between major versions (Amplify v5 → v6 is a breaking change)
- Agent memory may contain outdated patterns from training data
- Layer references are curated, version-specific, and tested
- A wrong import path or config format produces cryptic runtime errors (e.g., Cognito 400 with no helpful message)

## Enforcement

- Applies to all Code Generation stages
- The agent must cite which reference file it consulted when generating code for each layer
- If no reference exists for the pattern needed, state that explicitly and fall back to documentation search

## Rationale

This rule exists because agents generate framework code from training data that drifts out of date. A representative failure: an Amplify v6 `Amplify.configure()` call was generated in an outdated format that triggered Cognito 400 errors, even though the correct pattern was already documented in `layer-5-ui-implementation.md` — it simply wasn't consulted before code generation. Consulting the version-specific reference first prevents this class of error.

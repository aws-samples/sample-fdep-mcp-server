---
id: advance-construction
name: Advance to AI-DLC Construction
description: Pre-flights that Inception is complete and FDE intake is synced, then activates AI-DLC's Construction phase. Construction produces functional / NFR / infrastructure design and code under AI-DLC's per-unit loop.
trigger:
  kind: command
  phrase: "/aidlc-construction"
outputs:
  - name: construction-kickoff-receipt
    path: artifacts/aws-aidlc/construction-kickoff-{timestamp}.md
    kind: document
---

## Objective

Activate AI-DLC's Construction phase. AI-DLC's rules drive the per-unit loop (Functional Design → NFR Requirements → NFR Design → Infrastructure Design → Code Generation), then Build and Test. FDE's role is to provide layer references on demand and to record the FDE-side decision.

## Pre-flight

1. **Verify AI-DLC is installed.** Per `aidlc-fde-bridge.md` detection. If not, refuse with a pointer to `/aidlc-install`.
2. **Verify Inception is complete.**
   - `aidlc-docs/inception/requirements/**` must exist.
   - AI-DLC `aidlc-state.md` must show the Inception phase as approved.
   - If either fails: refuse with "Inception is not complete. Run `/aidlc-inception` first."
3. **Verify FDE intake is synced.** `state.intake.discoveryComplete === true`. If false: tell the FDE "Run `/aidlc-sync` first to mirror AI-DLC requirements into FDE intake."
4. **Verify state stage.** `currentStage` should be `intent` or `assess`. Construction work belongs to the `transform` stage — entering it advances the stage.

## Procedure

1. Tell the FDE: "I will hand off to AI-DLC's Construction phase. AI-DLC walks per-unit Functional Design, NFR Requirements, NFR Design, Infrastructure Design, and Code Generation, with explicit user-confirmation gates between each. FDE's `ai-native-app-builder` 18-layer references and AgentCore deployment guides remain available — AI-DLC's design stages can call them by name (e.g., 'Read ai-native-app-builder/references/layer-6-ai-agents.md before designing the agent'). Expect a multi-day flow with frequent gates."
2. Construct the kickoff prompt. Suggest:

   > "Using AI-DLC, advance to Construction for the units defined in Inception."

   Ask the FDE to confirm or adjust.
3. Wait for the FDE to type or confirm the prompt. AI-DLC's rules take over.
4. **Do not interfere** with AI-DLC's per-unit loop. Each unit completes fully (design + code) before the next begins. Each stage requires explicit user confirmation. The agent's role is to follow AI-DLC's rules and to surface FDE references when the AI-DLC design stages call for them.
5. **Reference handoff convention.** When AI-DLC's design stages need a specific FDE layer reference, the agent reads from `<engagement>/.kiro/references/ai-native-app-builder/` (Kiro path) or the equivalent platform path. The agent must not paraphrase the references inline — AI-DLC's content-validation rules require accurate reproduction of any cited material.
6. Watch for AI-DLC's "Build and Test" stage completion. At that point AI-DLC's Construction is done.
7. **Mirror state.** Update `state/current.yaml`:
   - `currentStage: transform`
8. Append a decision entry to `state/history.jsonl`:
   ```json
   {
     "ts":"<iso>",
     "actor":"fde",
     "kind":"aidlc-construction-complete",
     "detail":{
       "artifactsAt":"aidlc-docs/construction/",
       "buildAndTestAt":"aidlc-docs/construction/build-and-test/",
       "evidence":{
         "source":"aidlc-audit",
         "auditPath":"aidlc-docs/audit.md",
         "auditTimestamp":"<iso from audit log>"
       }
     }
   }
   ```
9. Write the construction-kickoff receipt at `artifacts/aws-aidlc/construction-kickoff-{timestamp}.md` linking to the AI-DLC construction artifacts.
10. **Re-resolve and re-render (MANDATORY).** After advancing to `transform` stage:
    - Call `fde_patch_intention` to update the intention with any new information gathered during Construction (e.g., appLevel confirmed, workload type confirmed).
    - Call `fde_resolve` to re-evaluate program activation. Programs gated to `transform` stage (e.g., `resilience`, `ai-operations`, `agentpath`) may now activate.
    - Call `fde_render` to write newly-activated program steering and skills into `.kiro/steering/` and `.kiro/skills/`.
    - Report to the FDE which programs were added.


10. **Re-resolve and re-render (MANDATORY).** After advancing to `transform` stage:
    - Call `fde_patch_intention` to update the intention with any new information gathered during Construction (e.g., appLevel confirmed, workload type confirmed).
    - Call `fde_resolve` to re-evaluate program activation. Programs gated to `transform` stage (e.g., `resilience`, `ai-operations`, `agentpath`) may now activate based on updated intake fields.
    - Call `fde_render` with the engagement directory to write newly-activated program steering and skills into `.kiro/steering/` and `.kiro/skills/`.
    - Report to the FDE which programs were added.

11. Tell the FDE: "Construction is complete. Programs have been re-resolved for the transform stage. Run `/aidlc-operations` to complete AI-DLC's Operations phase."

## Done when

- `aidlc-docs/construction/**` exists with at least one unit completed.
- `aidlc-docs/construction/build-and-test/` exists.
- AI-DLC's `aidlc-state.md` shows Construction phase as complete.
- FDE's `state/history.jsonl` has an `aidlc-construction-complete` decision entry.
- `currentStage` advanced to `transform`.

## Anti-patterns this skill rejects

- **Calling Construction before Inception is signed off.** Pre-flight refuses.
- **Calling Construction without FDE intake synced.** Downstream programs (RAI, AIM) cannot read from `aidlc-docs/` directly; they need the `state.intake.*` mirrors.
- **Generating a competing Kiro spec at `.kiro/specs/<workload>/{requirements,design,tasks}.md`.** When AI-DLC drives Construction, the Kiro three-file spec is **not** produced. The bridge says: AI-DLC's design tree is the source of truth. The `ai-native-app-builder` program's `app-spec-created` exit criterion is satisfied via a pointer artifact, not a parallel spec.

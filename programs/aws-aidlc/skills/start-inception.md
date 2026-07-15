---
id: start-inception
name: Start AI-DLC Inception
description: Pre-flights AI-DLC installation, kicks off AI-DLC's Inception phase via the canonical "Using AI-DLC, ..." prompt, and tells the FDE what artifacts to expect. Inception artifacts are written by AI-DLC under `aidlc-docs/inception/` and capture verbatim business and product requirements.
trigger:
  kind: command
  phrase: "/aidlc-inception"
outputs:
  - name: inception-kickoff-receipt
    path: artifacts/aws-aidlc/inception-kickoff-{timestamp}.md
    kind: document
---

## Objective

Activate AI-DLC's Inception phase for this engagement. The substantive work — Requirements Analysis, optional User Stories, Workflow Planning, optional Application Design and Units Generation — is performed by AI-DLC's own rules. This skill is the bridge that confirms readiness and hands control to AI-DLC.

## Pre-flight

1. **Verify AI-DLC is installed.** Run the detection logic from `aidlc-fde-bridge.md`. If installed paths are empty:
   > Tell the FDE: "AI-DLC is not installed. Run `/aidlc-install` first."
   > Stop.
2. **Verify discovery has not already completed via the local skill.** If `state.intake.discoveryComplete === true` AND the discovery artifact at `artifacts/discovery/intake-*.md` is **not** an AI-DLC pointer (i.e., its body contains the nine-question structure), then:
   > Tell the FDE: "Discovery has already completed using the local nine-question skill. Switching to AI-DLC mid-engagement is not supported per the bridge rule. The current engagement continues with the existing discovery artifact. To use AI-DLC, start a fresh engagement."
   > Stop.
3. **Verify state preconditions.** `aidlcInstalled === true`. `currentStage === "intent"` or `assess`. If `currentStage` is `transform` or beyond, ask the FDE if they want to roll back — Inception out of order is unusual.

## Procedure

1. Tell the FDE: "I will hand off to AI-DLC's Inception phase. AI-DLC will ask its own structured questions and capture verbatim answers under `aidlc-docs/audit.md`. The Requirements Analysis, optional User Stories, Workflow Planning, optional Application Design, and optional Units Generation stages will produce artifacts under `aidlc-docs/inception/`. Expect 30–90 minutes depending on the depth AI-DLC chooses (minimal / standard / comprehensive)."
2. Construct the kickoff prompt. The exact phrase that activates AI-DLC's workflow per the upstream README is **"Using AI-DLC, ..."** followed by the FDE's stated intent. Suggest a phrasing tailored to this engagement, e.g.:

   > "Using AI-DLC, capture the requirements and design for {customer}'s {primaryWorkload} workload."

   The agent should suggest this exact line and ask the FDE to confirm or adjust before sending it.

3. Wait for the FDE to type or confirm the prompt. Once they do, the AI-DLC rules take over.
4. **Do not interfere** with AI-DLC's flow. The agent's role during Inception is to follow AI-DLC's rules verbatim — including its mandatory verbatim audit log, structured multiple-choice question format, and explicit user-confirmation gates. FDE-program-level rules continue to apply only insofar as they do not contradict AI-DLC's rules; if conflict arises, AI-DLC wins for the duration of the phase (the bridge documents this at priority 87).
5. Watch for AI-DLC's stage-completion messages. AI-DLC's Inception phase has multiple stages:
   - **Requirements Analysis** — always runs
   - **User Stories** — optional, AI-DLC decides based on depth
   - **Workflow Planning** — always runs
   - **Application Design** — optional
   - **Units Generation** — optional

   At each stage gate, record a lightweight FDE decision entry:

   **After Requirements Analysis sign-off:**
   ```json
   {"ts":"<iso>","actor":"fde","kind":"aidlc-requirements-approved","detail":{"artifactsAt":"aidlc-docs/inception/requirements/","evidence":{"source":"aidlc-audit","auditPath":"aidlc-docs/audit.md"}}}
   ```

   **After User Stories (if generated):**
   ```json
   {"ts":"<iso>","actor":"fde","kind":"aidlc-user-stories-generated","detail":{"artifactsAt":"aidlc-docs/inception/user-stories/","evidence":{"source":"aidlc-audit","auditPath":"aidlc-docs/audit.md"}}}
   ```

   **After Workflow Planning (final mandatory stage):**
   ```json
   {"ts":"<iso>","actor":"fde","kind":"aidlc-inception-complete","detail":{"artifactsAt":"aidlc-docs/inception/","evidence":{"source":"aidlc-audit","auditPath":"aidlc-docs/audit.md","auditTimestamp":"<iso from audit log>"}}}
   ```

   Only the last entry (`aidlc-inception-complete`) signals that Inception is fully done. Do NOT write `aidlc-inception-complete` at Requirements sign-off — that is only the first gate.

6. Write a thin kickoff-receipt artifact at `artifacts/aws-aidlc/inception-kickoff-{timestamp}.md` linking to the AI-DLC inception artifacts. This is informational; it is not the source of truth.
7. Tell the FDE the next step: "Run `/aidlc-sync` to mirror AI-DLC's requirements into FDE intake state. Then run `/aidlc-construction` to begin the Construction phase."

## Done when

- AI-DLC's Inception phase is fully complete (Workflow Planning or later stage signed off).
- `aidlc-docs/inception/requirements/**` exists.
- AI-DLC's `aidlc-state.md` shows Inception phase as complete.
- FDE's `state/history.jsonl` has an `aidlc-inception-complete` decision entry (not just `aidlc-requirements-approved`) citing the AI-DLC audit log.
- The kickoff receipt exists.

## What this skill does NOT do

- **Does not duplicate AI-DLC's questions.** All elicitation is owned by AI-DLC's Requirements Analysis rule.
- **Does not write into `aidlc-docs/`.** AI-DLC owns that tree; this skill only reads from it and writes into `artifacts/aws-aidlc/`.
- **Does not advance the FDE pipeline stage automatically.** Stage advance happens when FDE's planner re-evaluates exit criteria and finds them satisfied. Run `ace plan` after Inception to see the updated activation graph.

## Anti-patterns this skill rejects

- **Calling `/aidlc-inception` while AI-DLC is uninstalled.** The pre-flight check refuses with a pointer to `/aidlc-install`.
- **Mid-engagement switch from local discovery to AI-DLC discovery.** The pre-flight refuses; the bridge documents that discovery surface is sticky per engagement.
- **Skipping AI-DLC stage gates.** AI-DLC enforces "DO NOT PROCEED until user confirms" at every stage. This skill respects all of those gates and never advances on the FDE's behalf.

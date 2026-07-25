---
id: sync-to-fde-intake
name: Sync AI-DLC Inception to FDE Intake
description: Reads AI-DLC's Inception artifacts under `aidlc-docs/inception/requirements/` and mirrors the verbatim values into FDE's `state/current.yaml` `intake.*` fields so FDE programs (AIM, RAI, App Builder, etc.) can read intake without parsing AI-DLC documents. Idempotent â-" re-running on a synced state detects this and does nothing.
trigger:
  kind: command
  phrase: "/aidlc-sync"
outputs:
  - name: sync-receipt
    path: artifacts/aws-aidlc/sync-{timestamp}.md
    kind: document
---

## Objective

Bridge AI-DLC's Inception artifacts to FDE's intake state. FDE programs (AIM, responsible-ai, resilience, ai-operations, ai-native-app-builder) read from `state.intake.*` to evaluate applicability rules and to prefill artifact templates. They are not aware of `aidlc-docs/`. This skill reads AI-DLC's verbatim requirements and copies the relevant fields into the intake, leaving AI-DLC's documents as the source of truth.

## Pre-flight

1. **Verify AI-DLC is installed.** Per the bridge detection. Refuse with `/aidlc-install` pointer if not.
2. **Verify Inception is complete.** `aidlc-docs/inception/requirements/**` must exist and AI-DLC's `aidlc-state.md` must show Requirements Analysis as approved.
3. **Verify no conflict with prior local discovery.** If `state.intake.discoveryComplete === true` AND the discovery artifact at `artifacts/discovery/intake-*.md` is the local nine-question variety (not an AI-DLC pointer), refuse: "Local discovery has already populated intake. Mid-engagement switch is not supported."

## Procedure

1. Read AI-DLC's requirements artifacts. The exact file structure depends on the AI-DLC release version, but the canonical paths are:
   - `aidlc-docs/inception/requirements/` (one or more requirements files)
   - `aidlc-docs/inception/user-stories/` (if AI-DLC produced stories)
   - `aidlc-docs/inception/application-design/` (if AI-DLC produced design)
   - `aidlc-docs/aidlc-state.md` (state file with stage approvals)
   - `aidlc-docs/audit.md` (verbatim user input)

2. Extract the fields FDE intake needs. The mapping (each field is verbatim from AI-DLC; never inferred):

   | FDE intake field | Source in AI-DLC artifact |
   |---|---|
   | `intake.primaryUser` | Requirements section describing the primary user / persona |
   | `intake.primaryDecision` | Requirements section describing the primary decision the system supports |
   | `intake.todayWithoutTool` | Requirements section describing the baseline (manual process today) |
   | `intake.failureModeImpact` | Risk assessment in Requirements Analysis or Workflow Planning |
   | `intake.dataCeiling` | Data classification in Requirements (synthetic / de-identified / live PHI / etc.) |
   | `intake.fundingSponsor` | Stakeholder section in Requirements |
   | `intake.businessOutcome` | Business outcome / KPI section in Requirements |
   | `intake.successDefinition` | Acceptance criteria summary in Requirements |
   | `intake.killCriteria` | Risk assessment / kill criteria in Workflow Planning |
   | `intake.discoveryComplete` | Set to `true` once all of the above are populated |

3. **Populate fields verbatim.** Do not paraphrase. If AI-DLC's requirements file says "End-of-day reviewer at the regional clinical operations centre", that is the verbatim value of `intake.primaryUser`. If a field is not present in AI-DLC's artifacts, set the intake field to `null` and add it to the parked list.

4. **Update `state/current.yaml`:**
   - Mirror the fields per the table above.
   - Set `intake.discoveryComplete: true` only if all required fields are populated. If any are parked, set `intake.discoveryComplete: false` and `intake.parkedFields: [<field-names>]`.
   - Set `intake.discoverySource: "aidlc"` to record which surface produced the intake.

5. **Write the thin pointer artifact at `artifacts/discovery/intake-{timestamp}.md`** that satisfies the `discovery` program's `discovery-complete` exit criterion. Content per `aidlc-handoff.md` template (now `aidlc-fde-bridge.md`):

   ```markdown
   # Discovery â-" handed off to AI-DLC

   **Engagement:** {customer}
   **Discovery surface:** AI-DLC Inception
   **AI-DLC artifacts:** aidlc-docs/inception/
   **AI-DLC state file:** aidlc-docs/aidlc-state.md
   **AI-DLC audit log:** aidlc-docs/audit.md
   **Synced at:** {iso-timestamp}
   **Source-of-truth:** aidlc-docs/inception/requirements/

   This engagement uses AI-DLC for workload-level discovery.
   Verbatim user input is captured in AI-DLC's audit log.
   FDE intake fields are mirrored in state/current.yaml under intake.*.

   Parked fields (if any): <list>
   ```

6. **Append a decision entry to `state/history.jsonl`:**
   ```json
   {
     "ts":"<iso>",
     "actor":"fde",
     "kind":"discovery-complete",
     "detail":{
       "discoverySource":"aidlc",
       "artifact":"artifacts/discovery/intake-{ts}.md",
       "aidlcInceptionAt":"aidlc-docs/inception/requirements/",
       "parkedFields":[],
       "evidence":{
         "source":"aidlc-audit",
         "auditPath":"aidlc-docs/audit.md",
         "auditTimestamp":"<iso from audit log of latest Inception approval>"
       }
     }
   }
   ```

7. **Write the sync receipt at `artifacts/aws-aidlc/sync-{timestamp}.md`** documenting which fields were populated, which were parked, and the AI-DLC source path for each.


8. **Re-resolve and re-render (MANDATORY).** After syncing intake fields:
   - Call `fde_patch_intention` with the updated intake fields (regulated, aim scores, production info) to update the loaded intention.
   - Call `fde_resolve` to re-evaluate program activation rules against the new intake. New programs may activate (e.g., `responsible-ai` if `intake.regulated === true`, `resilience` if `intake.aim.operations <= 2`, `agentpath` if `intake.aim.platform >= 3`).
   - Call `fde_render` with the engagement directory to write any newly-activated program steering and skills into `.kiro/steering/` and `.kiro/skills/`.
   - Report to the FDE which programs were added or removed by the re-resolution.

9. **Tell the FDE the next steps:**
   - "Discovery is complete. Run `ace plan` to see the updated activation graph based on the new intake fields."
   - "Run `/aidlc-construction` to begin Construction."
   - If any fields are parked: "These fields were parked: `<list>`. They block downstream programs that need them. Re-run `/aidlc-sync` after AI-DLC has updated the requirements to clear the parked list."

## Done when

- `state.intake.discoveryComplete` is `true` (or explicitly `false` with parked fields documented).
- `state.intake.discoverySource` is `"aidlc"`.
- The pointer artifact at `artifacts/discovery/intake-*.md` exists.
- The sync receipt exists.
- A `discovery-complete` decision entry is in `state/history.jsonl` citing the AI-DLC audit log.

## Idempotency

Re-running `/aidlc-sync` after a successful sync:
1. Re-reads AI-DLC's requirements (in case they changed since the last sync).
2. If the intake fields differ from current state, updates them and appends a new decision entry of kind `discovery-resynced`.
3. If nothing has changed, exits with "No changes detected since last sync at {ts}."

The decision-trail is preserved across re-syncs; previous values are not erased from `state/history.jsonl`.

## Anti-patterns this skill rejects

- **Inferring intake values that AI-DLC's requirements do not explicitly state.** If AI-DLC didn't capture it, the field is parked. FDE never makes up intake.
- **Paraphrasing AI-DLC's verbatim text into shorter intake values.** The point of the verbatim audit log is preserved by mirroring exact strings.
- **Marking `discoveryComplete: true` when fields are parked.** Parked is a `false` state â-" it tells downstream programs they cannot read certain fields yet.
- **Writing into `aidlc-docs/`.** The sync only reads from AI-DLC's tree; it never writes there.

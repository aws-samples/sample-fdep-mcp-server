---
id: facilitate-working-backwards
name: "Facilitate Working-Backwards Inputs"
description: "Run a working-backwards session for a single AI capability. Outputs a press release and a customer FAQ."
trigger:
  kind: command
  phrase: "/facilitate-working"
outputs:
  - name: artifact
    path: artifacts/facilitate-working-backwards-{timestamp}.md
    kind: document
---


## Objective

Run a working-backwards session for a single AI capability. Outputs a press release and a customer FAQ. This skill is one of several in **AI Product Lifecycle**; agents executing this skill should also surface related skills from the same program if the customer's situation calls for them.

## Procedure

1. **Set scope.** Confirm with the workload owner what one piece of work is in scope for this skill. Push back on "do everything" - this skill is one focused unit of value.
2. **Gather inputs.** Pull the relevant intention fields, AIM scores, and prior artefacts. State which fields are missing and either ask the customer or flag them as gaps.
3. **Execute the work.** Follow the program-specific procedure. Capture every input, every decision, every gap.
4. **Produce the artefact.** Render to the program template. Every section gets content; `TBD` entries are findings.
5. **Confirm sign-off.** The workload owner and the relevant compliance / engineering / product voice review the artefact and sign off (email counts).

## Done when

- The artefact exists at the documented path.
- All sections are populated.
- Sign-off is captured.
- The artefact is linked from the workload's runbook or owner's working folder.

## Anti-patterns

- "We'll fill this in later" - capture the gap as a finding instead.
- Compressing the discovery conversation to save time - the artefact's value is the conversation it forces.
- Treating this as a deliverable for AWS - the artefact belongs to the customer.


## Handoff to App Building

The working-backwards output directly feeds into `ai-native-app-builder`:

| Working-backwards output | Feeds into |
|--------------------------|-----------|
| Press release (what the product does) | `workload.primaryDescription` in the intention → routes app type selection |
| Customer FAQ (pain points) | Requirements for AI-DLC Inception (if `aidlc` goal active) |
| KPI taxonomy | Acceptance criteria for PoC/MVP/Production (`app-level` steering) |
| Target customer persona | UI design decisions in Layer 5 (frontend) |

Sequence when both programs are active:
```
/facilitate-working-backwards → defines WHAT to build and WHY
    ↓
fde_patch_intention → updates workload.primaryDescription with press release summary
    ↓
/build-app → ai-native-app-builder uses the description to route app type and layers
```

If `aws-aidlc` is also active, the working-backwards output feeds into AI-DLC Inception's Requirements Analysis stage as structured input.

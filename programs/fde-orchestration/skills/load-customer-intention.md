---
id: load-customer-intention
name: "Load Customer Intention"
description: "Validate the intention YAML, surface missing fields, prompt the FDE for clarifications."
trigger:
  kind: command
  phrase: "/load-customer"
outputs:
  - name: artifact
    path: artifacts/load-customer-intention-{timestamp}.md
    kind: document
---


## Objective

Validate the intention YAML, surface missing fields, prompt the FDE for clarifications. This skill is one of several in **FDE Orchestration Layer**; agents executing this skill should also surface related skills from the same program if the customer's situation calls for them.

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

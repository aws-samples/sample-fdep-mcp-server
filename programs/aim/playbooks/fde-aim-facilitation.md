# FDE Playbook — AIM Facilitation

**Audience:** You, the FDE. This is a human-only runbook — AI harnesses do not load it.

## Before the session

- Block the session at **4 hours**. AIM is a 6-perspective executive workshop covering 31 capabilities; a 90-minute meeting gets you a partial picture and misleading routing.
- Required attendees:
  - The executive sponsor (CIO, CTO, Chief AI Officer, or equivalent)
  - One platform / data lead (knows what's deployed)
  - One business-line leader (knows what outcomes matter)
  - One practitioner — engineer, data scientist, or ops lead (knows what actually happens day-to-day)
- Read the customer's public AI announcements, press releases, and analyst reports. Note what they claim about their AI posture — the gap between claim and practice is where the assessment finds value.
- Pre-fill a hypothesis sheet with your expected tier per perspective from desk research. You'll be right about half the time. The wrong half teaches you what the customer is hiding.
- If the Johari Window data exists for this account, cross-reference your hypotheses against it before the session. Blind spots the customer won't tell you about may be visible in AWS engagement data.

## During the session

Walk the six perspectives in this order:

1. **Business** (reframes everything else — start here)
2. **People**
3. **Governance**
4. **Platform**
5. **Security**
6. **Operations**

For each perspective:

- Lead with an open question, not a checklist. Examples:
  - Business: "What does it mean for your organization to be AI-native?"
  - People: "Walk me through the last AI-touched change that shipped to production."
  - Governance: "Who signs off on a new AI feature going live? What artifacts do they sign?"
  - Platform: "If a new team wanted to deploy a model tomorrow, what path do they take?"
  - Security: "What happens when a prompt injection is reported? Who investigates?"
  - Operations: "Tell me about the last time an AI system misbehaved in production."
- Capture **verbatim quotes**. Paraphrases lose nuance. The customer's words become evidence in the written assessment.
- Assign the tier 1–5 using the rubric in the `aim-framework` steering file.
- Probe for counter-evidence: "Is there a team or business unit where this looks different?" Heterogeneity matters.

## After the session

- Run `/aim-assess` in the engagement workspace to produce the written assessment from your notes.
- Share a draft with the sponsor within 48 hours. Do not wait.
- The roadmap (`/aim-roadmap`) is a **separate session**. Never combine assessment + roadmap in one meeting — customers cannot absorb both on the same day and you will under-prioritize the roadmap.

## Pitfalls to watch for

- **Over-scoring.** Customers self-rate optimistically. Ask for evidence every time. "You said Tier 4 for Governance — which policy document codifies that?"
- **Perspective bleed.** Platform and Operations blur together. Platform = *what you build on*. Operations = *what happens after deployment*. Security and Governance blur too: Governance = *rules*, Security = *enforcement*.
- **Executive airbrushing.** The sponsor describes the target state; the practitioner describes the actual state. You need both in the room for this reason.
- **Weakest-link arithmetic.** The overall tier is the **minimum** across perspectives, not the average. Customers who want a Tier 3 rating will argue for averaging. Don't.
- **Premature routing.** Don't announce downstream program recommendations during the session. Write the assessment first, let the FDE toolkit's planner route based on the scores, and present the routing with its reasoning in a follow-up meeting.

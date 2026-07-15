# FDE Playbook: Facilitating a Responsible AI Review


This playbook is for the forward-deployed engineer running the RAI review session with a customer. Skill files (`run-rai-review`, `design-rai-guardrails`, `produce-model-card`, `redteam-deployment`, `configure-content-safety`) describe what an agent does. This playbook describes what *you* do.

## Before the session

1. Confirm scope. ONE workload per review. Push back politely if the customer wants to "review all our AI" - that is a portfolio review, a different conversation.
2. Confirm attendees. Mandatory: workload owner, a compliance / legal voice. Recommended: a senior engineer who can speak to the implementation, an end-user representative, the security on-call.
3. Confirm time. 90 minutes minimum, 2 hours preferred. Anything shorter rushes the privacy / fairness sections, which are the most contested.
4. Pre-read. Send the customer the five-dimension steering file 24 hours ahead.
5. Surface the AI Maturity Assessment outputs if AIM was already run; the governance tier shapes how aggressive your findings should be.

## In the session

1. **5 min:** ground rules. This is not an audit. The output is a working document the customer co-owns. Findings are not blame.
2. **75 min:** walk the five dimensions. 15 minutes each.
   - For each dimension, ask "what controls are in place?", then "what's the evidence?", then "what would happen if X failed?".
   - Stop the customer when "we plan to" answers come up - that is a finding, not a control.
3. **10 min:** rating sign-off. Walk through your draft ratings in front of the room. Negotiate where the customer disagrees - the customer's risk appetite matters.

## After the session

1. Within 24 hours: email the draft review artifact to all attendees.
2. Within 1 week: signed-off final.
3. Within 30 days: re-check progress on every high-risk finding's mitigation.

## Red flags

- The customer is the only person who can answer privacy questions. Insist on a compliance / legal voice; reschedule if necessary.
- "We can't share that internally" - the workload's owner cannot describe the controls. That is the finding.
- The conversation pivots to "well what does the regulator actually require" - park it. Document the gap, not the regulatory interpretation.

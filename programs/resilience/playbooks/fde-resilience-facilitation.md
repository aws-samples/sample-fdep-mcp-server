# FDE Playbook - Resilience Facilitation

**Audience:** FDE running resilience engagements.

## Before the session

1. **Confirm the workload is in production** (or about to be). Resilience work on a PoC is premature.
2. **Request an architecture diagram** ahead of time. You need to see the AI dependencies before the session.
3. **Block 2 hours minimum.** Blast radius mapping alone takes 90 minutes for a system with 5+ AI dependencies.
4. **Required attendees:** Platform lead (knows the infra), AI/ML lead (knows the models), SRE/Ops lead (knows the monitoring).

## During the session

1. **Open with failure stories.** Ask: "Tell me about the last time your AI system misbehaved in production. What happened? How did you find out? How long did it take to fix?" This surfaces the real resilience posture faster than any checklist.

2. **Walk the dependency graph.** For each AI component: "What happens if this dies right now?" Follow the cascade.

3. **Challenge assumptions.** Customers overestimate their detection speed. Ask: "How would you know within 5 minutes if your model started hallucinating?" If the answer is "users would tell us" — that's Tier 1.

4. **Document as you go.** Fill the blast radius template live in the session.

## After the session

1. Share the blast radius map within 24 hours.
2. Schedule the chaos day (within 30 days).
3. Follow up on metric instrumentation (within 2 weeks).

## Red flags

- No monitoring beyond CloudWatch default metrics — they need custom AI metrics.
- "We haven't had any incidents" — they probably have, they just didn't detect them.
- Single points of failure with no fallback — especially common for model endpoints.

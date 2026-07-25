---
id: ai-plc-framework
description: "AI Product Lifecycle framework from discovery to delivery"
inclusion: auto
match: "artifacts/pdlc/**"
priority: 75
---

# AI-PLC Framework

The velocity mismatch: developers are 3Ã— faster with AI assistants, but product managers still use manual, multi-week processes for discovery and specification. Net: teams ship faster in the middle of the lifecycle and nowhere else.

## The five PDLC stages

1. **Insight** — customer research synthesis, signal detection, opportunity identification
2. **Definition** — user stories, acceptance criteria, non-functional requirements
3. **Design** — UX specification, interaction flows, system design reviews
4. **Build** — implementation, testing, code review
5. **Release** — deployment, instrumentation, adoption measurement

Current AI tooling disproportionately helps stage 4 (Build). AI-PLC is about stages 1“3 and stage 5.

## What AI unlocks per stage

- **Insight**: support-ticket clustering, user-interview synthesis, review-mining, competitive scans
- **Definition**: first-draft user stories from research, acceptance-criteria generation, NFR checklists
- **Design**: low-fi flow generation, component-library-aware specs
- **Release**: instrumentation-first specs, auto-generated onboarding, adoption analytics

## How the FDE toolkit uses this

AI-PLC activates when:
- `intent.includes('ai-plc')`
- AIM Business score ≤ 2 AND the customer has a product-management function
- The customer has high dev velocity but is missing launch dates

Pair with AIDLC (for the engineering side), AIM (entry point).

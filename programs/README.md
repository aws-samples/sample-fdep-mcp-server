# Programs

Each subdirectory is a self-contained enablement program. A program is a `program.yaml` manifest plus markdown artifacts (`skills/`, `steering/`, `templates/`, `playbooks/`, `references/`).

Programs self-activate based on the customer's intention using the DSL resolver.

## Catalog (9 programs)

| Program | Directory | Purpose | Source |
|---------|-----------|---------|--------|
| [AI Native App Builder](ai-native-app-builder/) | `ai-native-app-builder/` | Builds AI-native applications on AWS using the AI Native multi-layer architecture with 26 reference files | — |
| [AWS AI-DLC](aws-aidlc/) | `aws-aidlc/` | AI-Driven Development Lifecycle — three-phase methodology (Inception → Construction → Operations) | [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) |
| [AIM](aim/) | `aim/` | AI Maturity Assessment across 6 perspectives, tier-appropriate roadmap | [AWS Gen AI Maturity Model](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-gen-ai-maturity-model/) |
| [AgentPath](agentpath/) | `agentpath/` | Agentic AI architecture decisions, HITL design, guardrail catalog | [AWS Agentic AI Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agent-patterns.html) |
| [Responsible AI](responsible-ai/) | `responsible-ai/` | Governance, guardrails, RAI reviews, model cards, red-team exercises | [AWS Responsible AI](https://aws.amazon.com/ai/responsible-ai/) |
| [AI Operations](ai-operations/) | `ai-operations/` | AI Business Operating Manual, incident response, AI CoE | [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-operationalizing-agentic-ai/) |
| [AI-PLC](ai-plc/) | `ai-plc/` | AI Product Lifecycle — working backwards, KPI taxonomy | [aws-samples/sample-ai-plc](https://github.com/aws-samples/sample-ai-plc) |
| [Resilience](resilience/) | `resilience/` | Blast radius mapping, graceful degradation, chaos engineering, resilience metrics | [AWS Well-Architected Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/) |
| [FDE Orchestration](fde-orchestration/) | `fde-orchestration/` | Meta-program: coordinates all other programs, manages engagement lifecycle | — |

## Adding a New Program

See [documentation/ADD-A-PROGRAM.md](../documentation/ADD-A-PROGRAM.md) for the full guide. In short:

1. Create a directory under `programs/`
2. Add `program.yaml` with activation rules
3. Add `skills/*.md` and `steering/*.md`
4. The resolver picks it up automatically on next load

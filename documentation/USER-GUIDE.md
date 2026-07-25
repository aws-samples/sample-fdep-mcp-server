# FDE Delivery Kit User Guide

## What is the FDE Delivery Kit?

The FDE Delivery Kit is an MCP server that helps forward-deployed engineers set up AI-powered development environments for customers. You describe a customer's situation — their industry, AI maturity, goals — and the kit automatically activates the right programs, applies industry-specific overlays, and renders configuration files for their agent platform.

Think of it as: **one intention file in → fully configured agent workspace out.**

### Required companion: AWS MCP Server

The FDE Delivery Kit renders *configuration* — steering files, skills, references. When your agent acts on those (deploying CDK stacks, calling Bedrock, writing to S3), it needs the **AWS MCP Server** for AWS API access.

| Server | Role |
|--------|------|
| **fdep-mcp** (this kit) | Engagement setup: load intention → resolve programs → render artifacts |
| **aws-mcp** | Execution: deploy infrastructure, call AWS APIs, manage resources |

Both should be configured in your MCP client. See the [Quick Start](QUICKSTART.md) for the config snippet.

---

## Core Concepts

### Intentions

An intention describes a customer's observable state:

```yaml
customer: any-bank
industry: financial-services
regulated: true
goals: [build, aidlc]
aim:
  business: 2
  governance: 1
  security: 3
  overall: 2
```

The kit uses this to decide which programs activate and what configuration to generate.

### Programs

Programs are coherent outcome areas. Each one brings skills (what the agent can do), steering (rules the agent follows), and references (patterns the agent consults).

| Program | What it does |
|---------|-------------|
| **aim** | AI Maturity assessment across 6 perspectives, produces tier-appropriate roadmap |
| **ai-native-app-builder** | Builds AI-native apps on AWS using a multi-layer architecture with tested patterns |
| **aws-aidlc** | AI-Driven Development Lifecycle — structured phases (Inception → Construction → Operations) |
| **responsible-ai** | Governance frameworks, guardrails, RAI reviews, model cards, red-team exercises |
| **agentpath** | Agentic architecture design, human-in-the-loop patterns, guardrail catalogs |
| **ai-operations** | AI Business Operating Manual, incident response, AI Bill of Materials |
| **ai-plc** | AI Product Development Lifecycle — KPI taxonomy, working backwards, prototype measurement |
| **resilience** | Fault tolerance, blast radius mapping, chaos engineering, graceful degradation |
| **fde-orchestration** | Meta-layer that ties programs together, manages engagement lifecycle |

Programs self-activate based on the intention. You don't manually select them.

### Lenses

Lenses are industry overlays that add specialized guidance on top of programs:

| Lens | Adds |
|------|------|
| **financial-services-lens** | PCI-DSS steering, SOX model risk, separation of duties, regulatory reporting |
| **healthcare-lens** | HIPAA PHI handling, SaMD guidance, PHI access logging |
| **life-sciences-lens** | GxP compliance, clinical data integrity, computerized system validation |
| **games-industry-lens** | Player safety, content moderation, live-ops resilience |
| **manufacturing-lens** | Industrial AI safety, IT/OT boundary, sensor data governance |
| **public-sector-lens** | Digital sovereignty, citizen AI transparency, data residency |

Lenses activate automatically when the intention's `industry` matches. See [Lenses documentation](LENSES.md) for full details.

### Adapters

Adapters render program content into platform-native formats. The same programs produce different file structures depending on your agent platform:

| Platform | Where files go |
|----------|---------------|
| Kiro | `.kiro/steering/`, `.kiro/skills/` |
| Claude | `.claude/CLAUDE.md` (monolithic) |
| Cursor | `.cursor/rules/*.mdc` |
| Copilot | `.github/copilot-instructions.md` |
| Codex | `AGENTS.md` |

All 13 platforms are supported simultaneously — render to multiple targets in a single call.

---

## How Programs Activate

Each program declares activation rules using a simple predicate DSL:

```yaml
applicability:
  - when: "intent.includes('build')"
    weight: 90
  - when: "intake.regulated === true"
    weight: 70
  - when: "aimTier <= 3"
    weight: 60
```

When you load an intention, the resolver evaluates every program's rules against it. Programs whose rules match get activated — the highest-weight matching rule determines the program's priority in the engagement.

**Example:** If you load an intention with `goals: ["build", "aidlc"]` and `regulated: true`:
- `ai-native-app-builder` activates (matches `intent.includes('build')`)
- `aws-aidlc` activates (matches `intent.includes('aidlc')`)
- `responsible-ai` activates (matches `intake.regulated === true`)
- `fde-orchestration` always activates

---

## Typical Engagement Flow

### 1. Bootstrap a workspace

Ask your agent: *"Initialize the FDE Delivery Kit in this workspace"*

This calls `fde_init_workspace` and places orchestration steering so the agent knows how to manage engagements.

### 2. Create an engagement

Ask: *"Create an engagement for acme-corp, healthcare industry, goals are build and aidlc, regulated, AIM tier 2"*

The agent calls:
1. `fde_load_intention` — validates and stores the intention
2. `fde_resolve` — determines which programs activate
3. `fde_render` — writes all artifacts to the workspace

### 3. Work with the activated programs

After rendering, your workspace has steering files that guide the agent and skills it can invoke. For example, with `aws-aidlc` active:

- `/aidlc-install` — install AI-DLC rules
- `/build-app` — start building an AI app with tested patterns
- `/run-rai-review` — conduct a Responsible AI review

### 4. Resume later

If you restart your agent session, it can resume:

```
fde_get_engagement_context({ engagementDir: "/path/to/workspace" })
```

This rehydrates the intention and resolution so you can continue where you left off.

---

## What Gets Rendered

After `fde_render`, your workspace contains:

```
my-project/
├── .kiro/
│   ├── steering/              # Rules the agent follows
│   │   ├── ai-native-app-builder-consult-references.md
│   │   ├── ai-native-app-builder-layer-methodology.md
│   │   ├── aws-aidlc-no-simulated-data.md
│   │   └── ...
│   └── skills/                # Capabilities the agent can invoke
│       ├── ai-native-app-builder-build-aws-app/SKILL.md
│       ├── aws-aidlc-start-inception/SKILL.md
│       └── ...
├── state/
│   ├── intention.json         # Persisted intention for resume
│   ├── resolution.json        # Which programs activated and why
│   ├── current.yaml           # Current engagement stage
│   └── history.jsonl          # Append-only decision audit log
├── .fde-manifest.json         # Reference index (tells agent what to read before coding)
└── README.md                  # Engagement overview
```

---

## The Reference System

Programs ship **reference files** — tested AWS architecture patterns that agents must consult before generating code. The `.fde-manifest.json` file tells the agent which references exist and when to read them:

```json
{
  "references": [
    {
      "file": "references/layer-5-ai-app-creation.md",
      "skillId": "build-aws-app",
      "category": "frontend",
      "readBefore": "writing UI/React code"
    },
    {
      "file": "references/layer-4-ai-workflow.md",
      "skillId": "build-aws-app",
      "category": "ai-pipeline",
      "readBefore": "writing agent/model/workflow code"
    }
  ]
}
```

The agent calls `fde_get_skill(skillId, file)` to read a reference before generating code in that category. This ensures generated code follows tested patterns rather than relying on model memory.

---

## AIM Assessment

The AI Maturity (AIM) assessment scores a customer across 6 perspectives:

| Perspective | What it measures |
|-------------|-----------------|
| Business | AI strategy alignment, KPI definition, ROI tracking |
| People | Team readiness, skills, organizational change |
| Governance | Policies, approval workflows, model risk management |
| Platform | Reusable infrastructure, MLOps, data pipelines |
| Security | Data classification, access controls, red-teaming |
| Operations | Monitoring, incident response, runbooks |

Each perspective is scored 1–5. The overall tier (minimum across perspectives) drives which programs activate and at what depth. Lower tiers get more foundational guidance; higher tiers get advanced patterns.

Run an assessment:
```
fde_aim_assess({ intentionId: "<id>", mode: "runtime" })
```

---

## Goals Reference

| Goal | Programs activated | Use when |
|------|-------------------|----------|
| `build` | ai-native-app-builder, agentpath, ai-plc | Building an AI-native application on AWS |
| `aidlc` | aws-aidlc + ai-native-app-builder + agentpath | Following AI-DLC methodology for structured development |
| `responsible-ai` | responsible-ai | Adding governance, guardrails, compliance |
| `gen-ai-rollout` | aim + agentpath + ai-operations + ai-plc | Enterprise-wide Gen AI adoption |
| `resilience` | resilience | Improving fault tolerance and operational excellence |
| `prototyping` | ai-plc + ai-native-app-builder | Quick prototypes and proofs of concept |

Combine goals for richer engagements: `["build", "aidlc", "responsible-ai"]` activates the app builder with lifecycle methodology and governance overlays.

---

## Industry Overlays

When `industry` is set in the intention, matching lenses activate automatically:

**Financial Services** (`industry: "financial-services"`):
- Model risk governance (SR 11-7 alignment)
- PCI-DSS data handling for AI systems
- SOX compliance for model outputs
- Separation of duties between dev/model/deploy
- Regulatory reporting templates

**Healthcare** (`industry: "healthcare"`):
- HIPAA PHI handling in AI pipelines
- Software as Medical Device (SaMD) guidance
- PHI access logging requirements

**Life Sciences** (`industry: "life-sciences"`):
- GxP compliance (GLP, GCP, GMP) for AI systems
- Clinical data integrity (ALCOA+, 21 CFR Part 11)
- Computerized system validation (GAMP 5 aligned)

**Gaming / Entertainment** (`industry: "entertainment"`):
- Player safety and content moderation
- Live-ops resilience (zero-downtime, latency budgets)
- Minor protection (COPPA)

**Manufacturing** (`industry: "manufacturing"`):
- Industrial AI safety (IT/OT boundary, safety classification)
- Sensor data governance and lineage
- Edge vs cloud processing decisions

**Public Sector** (`industry: "public-sector"`):
- Digital sovereignty (data residency, sovereign key management)
- Citizen AI transparency (disclosure, right to human review)
- Algorithmic impact assessments

---

## Extending the Kit

### Add a new program

Create a directory under `programs/` with:
- `program.yaml` — manifest with activation rules
- `skills/*.md` — agent capabilities
- `steering/*.md` — agent guidance

See [Adding a Program](ADD-A-PROGRAM.md) for the full guide.

### Add a new platform adapter

Add an entry to `adapters/manifest.json` and create `adapters/<id>/adapter.ts`.

See [Adding an Adapter](ADD-AN-ADAPTER.md) for the six touch points.

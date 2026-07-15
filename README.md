# Partner FDE — Delivery Kit

An intention-driven harness for forward-deployed engineers. Drop one intention file describing a customer (industry, AIM scores, cloud posture, regulatory context, production AI inventory, goals). The kit evaluates declarative activation predicates, layers an industry lens (financial services or healthcare), and renders the resulting program catalog as native artifacts for **thirteen agentic platforms** at once.

---

## Quick Start

### Prerequisites

- **Node.js 20+**
- **AWS MCP Server** — required for building applications with FDE programs (provides AWS API access for CDK deployments, Bedrock, S3, etc.)

Configure the AWS MCP server alongside the FDE kit in your MCP client:

```json
{
  "mcpServers": {
    "fdep-mcp": {
      "command": "node",
      "args": ["/path/to/fdep-kit/bin/fdep-mcp.mjs"]
    },
    "aws-mcp": {
      "command": "uvx",
      "args": ["mcp-proxy-for-aws@latest", "https://aws-mcp.us-east-1.api.aws/mcp"]
    }
  }
}
```

> **Note:** The FDE kit itself makes no AWS calls — it renders configuration files locally. The AWS MCP server is needed by your agent when it acts on the rendered skills (deploying CDK stacks, creating Bedrock resources, etc.).

### Setup

```bash
git clone <your-repo-url> fdep-kit
cd fdep-kit
npm install
npm run build
```

Restart your MCP client. Ask the agent: *"List the FDEP programs"* — done.

---

## MCP Tools

The MCP server (`bin/fdep-mcp.mjs`) exposes the full toolkit as MCP tools for any compatible agent client:

**Exposed tools:** `fde_list_programs`, `fde_list_lenses`, `fde_load_intention`, `fde_resolve`, `fde_render`, `fde_aim_assess`, `fde_get_skill`, `fde_get_steering`, `fde_patch_intention`, `fde_get_engagement_context`, `fde_init_workspace`, `fde_install_assets`.

Typical workflow: `fde_init_workspace` → `fde_load_intention` → `fde_resolve` → `fde_render`.

---

## The Five Primitives

| Primitive | What it is | Where it lives |
|---|---|---|
| **Intention** | Schema-validated object describing the customer's observable state | Loaded via `fde_load_intention` tool |
| **Program** | Coherent outcome area with skills, steering, exit criteria, activation predicate | `programs/<id>/` |
| **Lens** | Industry overlay that composes with programs (adds steering, overrides exit criteria) | `lenses/<id>/` |
| **Adapter** | Per-platform renderer; deterministic file emission | `adapters/<id>/` |
| **MCP server** | Thin facade over the resolver — exposes the toolkit as MCP tools | `core/src/mcp/`, `bin/fdep-mcp.mjs` |

---

## What's in the Catalog

**9 programs:**

| Program | Purpose | Based on |
|---------|---------|----------|
| [`ai-native-app-builder`](programs/ai-native-app-builder/) | Build AI-native apps on AWS with multi-layer architecture | 26 tested reference patterns |
| [`aws-aidlc`](programs/aws-aidlc/) | AI-Driven Development Lifecycle (Inception → Construction → Operations) | [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) |
| [`aim`](programs/aim/) | AI Maturity Assessment across 6 perspectives | [AWS Gen AI Maturity Model](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-gen-ai-maturity-model/) |
| [`agentpath`](programs/agentpath/) | Agentic AI architecture decisions, HITL, guardrails | [AWS Agentic AI Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agent-patterns.html) |
| [`responsible-ai`](programs/responsible-ai/) | Governance, RAI reviews, model cards, red-team | [AWS Responsible AI](https://aws.amazon.com/ai/responsible-ai/) |
| [`ai-operations`](programs/ai-operations/) | AI Operating Manual, incident response, AI CoE | [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-operationalizing-agentic-ai/) |
| [`ai-plc`](programs/ai-plc/) | Product Development Lifecycle, KPI taxonomy | [aws-samples/sample-ai-plc](https://github.com/aws-samples/sample-ai-plc) |
| [`resilience`](programs/resilience/) | Blast radius, graceful degradation, chaos engineering | [AWS Well-Architected Reliability](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/) |
| [`fde-orchestration`](programs/fde-orchestration/) | Meta-program: coordinates all programs, manages lifecycle | — |

**6 industry lenses:**

| Lens | Industry | Based on |
|------|----------|----------|
| [`financial-services-lens`](lenses/financial-services-lens/) | Financial services | [AWS WA Financial Services Lens](https://docs.aws.amazon.com/wellarchitected/latest/financial-services-industry-lens/welcome.html) |
| [`healthcare-lens`](lenses/healthcare-lens/) | Healthcare | [AWS WA Healthcare Lens](https://docs.aws.amazon.com/wellarchitected/latest/healthcare-industry-lens/healthcare-industry-lens.html) |
| [`life-sciences-lens`](lenses/life-sciences-lens/) | Pharma / Biotech | [AWS WA Life Sciences Lens](https://docs.aws.amazon.com/wellarchitected/latest/life-sciences-lens/life-sciences-lens.html) |
| [`games-industry-lens`](lenses/games-industry-lens/) | Gaming / Entertainment | [AWS WA Games Industry Lens](https://docs.aws.amazon.com/wellarchitected/latest/games-industry-lens/games-industry-lens.html) |
| [`manufacturing-lens`](lenses/manufacturing-lens/) | Manufacturing | [AWS WA Modern Industrial Data Lens](https://docs.aws.amazon.com/wellarchitected/latest/modern-industrial-data-technology-lens/modern-industrial-data-technology-lens.html) |
| [`public-sector-lens`](lenses/public-sector-lens/) | Government / Public sector | [AWS Digital Sovereignty Lens](https://aws.amazon.com/blogs/architecture/announcing-the-aws-digital-sovereignty-well-architected-lens/) |

**13 platform adapters** — `kiro`, `claude`, `copilot`, `cursor`, `codex`, `cline`, `continue`, `aider`, `windsurf`, `zed`, `chatgpt-custom-gpt`, `gemini-code-assist`, `mcp`.

Adapters bootstrap from a declarative [`adapters/manifest.json`](adapters/manifest.json) — adding a platform is a data change plus one adapter module.

---

## Repository Layout

```
fdep-kit/
├── bin/fdep-mcp.mjs        # MCP server entry point (stdio transport)
├── core/                   # Loader, resolver, renderer, state, MCP handlers, security
├── schemas/                # JSON Schemas for intention, lens, program, skill, steering
├── adapters/               # 13 platform-native renderers + manifest.json + _shared/
├── programs/               # 9 enablement programs
├── lenses/                 # 6 industry overlays
├── pipelines/              # Pipeline stage definitions
├── documentation/          # Guides, references, lens docs
└── scripts/                # Validation and utility scripts
```

---

## Documentation

| Document | Audience | Purpose |
|---|---|---|
| [User Guide](documentation/USER-GUIDE.md) | All users | Programs, lenses, activation logic, engagement flow |
| [Program Catalog](documentation/PROGRAMS.md) | All users | Detailed reference for all 9 programs with skills, activation rules, and stages |
| [Industry Lenses](documentation/LENSES.md) | All users | 6 industry lenses with AWS Well-Architected references |
| [Quick Start](documentation/QUICKSTART.md) | Engineers, FDEs | MCP setup, first engagement in 5 minutes |
| [MCP Tool Reference](documentation/MCP-TOOLS.md) | Developers | Detailed parameters, examples, error handling for all 12 tools |
| [Adding a Program](documentation/ADD-A-PROGRAM.md) | Program authors | Authoring activation predicates and lens overlays |
| [Adding an Adapter](documentation/ADD-AN-ADAPTER.md) | Platform integrators | Six touch points for a new harness |
| [Invariants](documentation/INVARIANTS.md) | Contributors | 10 testable correctness properties |

---

## Security

| Layer | What it does | What it does NOT do |
|---|---|---|
| Filesystem | Reads its own catalog; writes only to the directory you specify | No reads/writes outside those two paths |
| Network | Zero outbound network calls | No AWS APIs, no telemetry, no phone-home |
| Secrets | Never touches `.env`, credentials, or key files | No secrets in rendered output |
| Dependencies | 4 pinned packages (`ajv`, `ajv-formats`, `handlebars`, `yaml`) | No native modules, no post-install scripts |

The MCP server runs over **stdio** (local process, no listening ports). All tool operations are deterministic pure functions over the on-disk catalog.

---

## License

MIT No Attribution (MIT-0) License — see [LICENSE](LICENSE) for details.

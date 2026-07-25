# Partner FDE — Delivery Kit

An MCP server that helps forward-deployed engineers **build AI-native applications on AWS** from tested architecture patterns. Describe a customer's situation (industry, goals, AI maturity), and the kit activates the right programs, applies industry-specific lenses, and guides the agent through a structured delivery — from requirements through working code and deployment.

The kit doesn't just configure an agent workspace — it drives actual application development using 26 verified reference patterns (CDK stacks, Python agents, Bedrock configuration, React UI) and the AWS AI-DLC methodology (Inception → Construction → Operations). Programs interleave during delivery: architecture decisions feed requirements, requirements feed code generation, RAI reviews produce guardrail configs that get implemented, resilience patterns get deployed.

---

## What You Get

For a typical `build + aidlc` engagement (e.g., "build a claims processing agent for an insurance company"), the kit drives the agent to produce:

| Deliverable | How it's built |
|-------------|---------------|
| **CDK infrastructure** | VPC, Lambda, DynamoDB, S3, Cognito — from tested infrastructure patterns |
| **AI agent** | Strands Agents SDK with Bedrock — from agent architecture references |
| **Knowledge base** | Bedrock KB + OpenSearch Serverless — from data layer patterns |
| **React frontend** | Chat UI with citations, HITL queue — from UI implementation patterns |
| **Guardrails** | Bedrock Guardrails (PII, grounding, content) — from RAI review findings |
| **Monitoring** | CloudWatch GenAI + AgentCore observability — from observability patterns |
| **Resilience** | Circuit breakers, retry, graceful degradation — from resilience patterns |
| **Deployment** | AgentCore Runtime deploy — from deployment patterns |

All code is generated from **version-specific, tested reference patterns** — not from model memory. The agent reads `.fde-manifest.json` to know which reference to consult before writing each component.

### Delivery flow (programs interleave):

```
/facilitate-working-backwards  →  defines WHAT to build and success KPIs
/design-agent                  →  selects architecture pattern (agent topology, HITL, guardrails)
/aidlc-inception               →  captures detailed requirements using AI-DLC methodology
/build-app                     →  generates infrastructure + agent + UI from layer references
/rai-review                    →  validates safety, produces guardrail configuration
/map-blast-radius              →  documents failure modes and recovery
/aidlc-operations              →  deploys with monitoring, incident response, production readiness
```

**Industry lenses** (financial-services, healthcare, life-sciences, games, manufacturing, public-sector) automatically overlay regulatory and domain-specific guidance onto active programs when the customer's industry matches.

---

## How It Works — Loop Engineering

Most agent toolkits are pipelines: configure once, execute linearly. The FDE Kit runs **delivery loops** where each program's output enriches the system and feeds the next:

```
Load intention → Resolve programs → Build
        ↑                                 ↓
   Re-resolve ← Patch intention ← Discover
        ↓
Implement findings → Ship
```

Three mechanisms make this work:

**1. Shared state mutation** — Programs call `fde_patch_intention` as they discover things. When `ai-plc` working-backwards produces "build a claims processing agent", it patches the intention's `workload.primaryDescription`. Downstream programs see enriched context without being told.

**2. Artifact handoffs** — Every skill has explicit handoff routing. RAI review findings become guardrail specs → the builder implements them as Bedrock Guardrails. Blast radius maps become degradation policies → the builder implements circuit breakers. Output from one program is input to the next.

**3. Re-resolve cycles** — After `sync-to-fde-intake` or state transitions, the system calls `fde_resolve` again. New programs can activate mid-engagement based on what was discovered (e.g., discovering `regulated: true` activates `responsible-ai` at weight 95).

The result: the agent doesn't just follow a plan — it refines the plan as it builds. Each iteration produces working code, not documents about what to build.

---

## Quick Start

### Prerequisites

- **Node.js 22+** (LTS)
- **AWS MCP Server** — required for building applications with FDE programs (provides AWS API access for CDK deployments, Bedrock, S3, etc.)

### Setup

```bash
git clone <your-repo-url> fde-kit
cd fde-kit
npm install
npm run build
```

### MCP Client Configuration

Configure the FDE kit and AWS MCP server in your MCP client config:

<details>
<summary><b>macOS / Linux</b></summary>

**Kiro:** `~/.kiro/settings/mcp.json`
**Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Cursor:** `.cursor/mcp.json` in your project

```json
{
  "mcpServers": {
    "fdep-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/fde-kit/bin/fdep-mcp.mjs"]
    },
    "aws-mcp": {
      "command": "uvx",
      "args": ["mcp-proxy-for-aws@latest", "https://aws-mcp.us-east-1.api.aws/mcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Windows (PowerShell)</b></summary>

**Kiro:** `%USERPROFILE%\.kiro\settings\mcp.json`
**Claude Desktop:** `%APPDATA%\Claude\claude_desktop_config.json`
**Cursor:** `.cursor\mcp.json` in your project

```json
{
  "mcpServers": {
    "fdep-mcp": {
      "command": "node",
      "args": ["C:\\Users\\<username>\\path\\to\\fde-kit\\bin\\fdep-mcp.mjs"]
    },
    "aws-mcp": {
      "command": "uvx",
      "args": ["mcp-proxy-for-aws@latest", "https://aws-mcp.us-east-1.api.aws/mcp"]
    }
  }
}
```

> **Note:** Use double backslashes (`\\`) in JSON paths on Windows, or forward slashes (`/`) which also work.

</details>

<details>
<summary><b>Ubuntu / WSL</b></summary>

**Kiro:** `~/.kiro/settings/mcp.json`
**Claude Desktop (via WSL):** Access from Windows side at `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fdep-mcp": {
      "command": "node",
      "args": ["/home/<username>/fde-kit/bin/fdep-mcp.mjs"]
    },
    "aws-mcp": {
      "command": "uvx",
      "args": ["mcp-proxy-for-aws@latest", "https://aws-mcp.us-east-1.api.aws/mcp"]
    }
  }
}
```

If `uvx` is not installed, install `uv` first:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

</details>

> **Note:** The FDE kit itself makes no AWS calls — it renders configuration files locally. The AWS MCP server is needed by your agent when it acts on the rendered skills (deploying CDK stacks, creating Bedrock resources, etc.).

Restart your MCP client. Ask the agent: *"List the FDE programs"* — done.

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

**13 platform adapters** — render to whichever platform the FDE uses. Specify one or more targets in `fde_render`:

`kiro`, `claude`, `copilot`, `cursor`, `codex`, `cline`, `continue`, `aider`, `windsurf`, `zed`, `chatgpt-custom-gpt`, `gemini-code-assist`, `mcp`

Adapters bootstrap from a declarative [`adapters/manifest.json`](adapters/manifest.json) — adding a platform is a data change plus one adapter module.

---

## Repository Layout

```
fde-kit/
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
| [Adding an Adapter](documentation/ADD-AN-ADAPTER.md) | Platform integrators | Six touch points for a new adapter |
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

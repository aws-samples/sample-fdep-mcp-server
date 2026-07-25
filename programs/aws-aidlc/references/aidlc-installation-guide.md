# AWS AI-DLC — Installation Guide (Per Platform)

The `/aidlc-install` skill walks the FDE through this guide. The content here is a condensed version of [the AWS Labs README](https://github.com/awslabs/aidlc-workflows#platform-specific-setup) tailored to the engagement layout.

## Prerequisites

- One of the supported coding agents installed: Kiro, Amazon Q Developer IDE Plugin, Cursor IDE, Cline VS Code, Claude Code CLI, GitHub Copilot in VS Code, OpenAI Codex.
- Network access to download the latest release zip from `https://github.com/awslabs/aidlc-workflows/releases/latest` (or a local copy of the zip if offline).
- Write access to the engagement directory.

## Step 1 — Download the release zip

Download the latest release `ai-dlc-rules-v<version>.zip` to a folder **outside** the engagement (e.g., `~/Downloads`). Extract it. The result is an `aidlc-rules/` folder with two subdirectories:

- `aws-aidlc-rules/` — the core workflow rules
- `aws-aidlc-rule-details/` — detailed rules referenced by the core workflow

## Step 2 — Place the rules per platform

The agent reads the platform from `state.aidlcPlatform` (set during the install skill's pre-flight). The exact paths follow.

### Kiro

```bash
mkdir -p .kiro/steering
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rules .kiro/steering/
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details .kiro/
```

Result: `.kiro/steering/aws-aidlc-rules/` + `.kiro/aws-aidlc-rule-details/`.

### Amazon Q Developer IDE Plugin

```bash
```

### Cursor (Project Rules — recommended)

```bash
mkdir -p .cursor/rules

cat > .cursor/rules/ai-dlc-workflow.mdc << 'EOF'
---
description: "AI-DLC (AI-Driven Development Life Cycle) adaptive workflow for software development"
alwaysApply: true
---

EOF
cat ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md >> .cursor/rules/ai-dlc-workflow.mdc

mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

### Cline (`.clinerules` — recommended)

```bash
mkdir -p .clinerules
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md .clinerules/
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

### Claude Code (project root — recommended)

```bash
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md ./CLAUDE.md
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

### GitHub Copilot

```bash
mkdir -p .github
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md .github/copilot-instructions.md
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

### OpenAI Codex (AGENTS.md)

```bash
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md ./AGENTS.md
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

## Step 3 — Verify the install

The `/aidlc-install` skill re-runs the detection logic from `aidlc-fde-bridge.md` after placement. The detection passes when **at least one** of the platform paths from that file resolves.

### Manual verification per platform

- **Kiro IDE:** open the steering files panel; confirm an entry for `core-workflow` under `Workspace`. Or via `kiro-cli`, run `/context show` and confirm entries for `.kiro/steering/aws-aidlc-rules`.
- **Cursor:** Cursor Settings → Rules → Project Rules; confirm `ai-dlc-workflow` is listed.
- **Cline:** Rules popover under the chat input; confirm `core-workflow.md` is listed.
- **Claude Code:** start a session in the engagement directory and ask "What instructions are currently active in this project?" — Claude should describe the AI-DLC three-phase workflow.
- **GitHub Copilot:** Configure Chat → Chat Instructions; confirm `copilot-instructions` is listed. Or type `/instructions` in the chat input.
- **Codex:** start a session and ask "Using AI-DLC, analyze the project?" or "Using AI-DLC, what workflow do you see?" — Codex should describe the three-phase workflow.

## Step 4 — Use AI-DLC

After install, every prompt that begins with "Using AI-DLC, ..." activates the workflow. The agent will display a custom welcome message on first use and walk through Workspace Detection.

For FDE engagements, the next step is `/aidlc-inception` which constructs the canonical prompt with the engagement context filled in.

## Version control recommendations

Per the upstream README:

```gitignore
# Should be version controlled
CLAUDE.md
AGENTS.md
.kiro/steering/
.kiro/aws-aidlc-rule-details/
.cursor/rules/
.clinerules/
.github/copilot-instructions.md
.aidlc-rule-details/

# Optional — exclude
.claude/settings.local.json
```

The FDE patch's discovery program does not modify .gitignore; the FDE handles version-control hygiene at engagement creation.

## Common installation issues

- **Wrong rule details path** — file encoding or platform mismatch causes the rules to load but rule details to fail. Symptom: AI-DLC starts the workflow but errors "rule detail file not found." Fix: re-check the directory layout for the platform.
- **UTF-8 encoding** — Windows users with non-UTF-8 defaults can corrupt the markdown files. Ensure UTF-8 encoding when editing.
- **Stale session** — rules placed mid-session don't load until the agent starts a new chat. Restart the chat session after install.
- **Cursor "Apply Intelligently" too aggressive** — for Cursor, ensure the `description` is set in frontmatter and the rule is enabled in settings. For very large rule files, split into focused rules.

## Offline / air-gapped install

If the engagement environment cannot reach GitHub, an FDE can supply a local zip of the AI-DLC release. The `/aidlc-install` skill accepts a local path as an alternative to the latest-release URL. The skill records the version explicitly in the receipt.

## Uninstalling AI-DLC

To uninstall:
- Remove the `aws-aidlc-rules/`, `aws-aidlc-rule-details/`, `.aidlc-rule-details/`, `CLAUDE.md` (if it was used for AI-DLC), `AGENTS.md` (if it was used for AI-DLC), `.github/copilot-instructions.md` (if it was used for AI-DLC), and `.clinerules/` (if it contained only AI-DLC).
- Set `state.aidlcInstalled: false` in `state/current.yaml`.
- Append a decision entry of kind `aidlc-uninstalled` with `evidence` citing the FDE's verbatim acknowledgement.
- Remove the `aws-aidlc` program from the active set if desired.

After uninstall, the bridge falls back to the local discovery skill. Any prior `aidlc-docs/` content remains as a read-only artifact.

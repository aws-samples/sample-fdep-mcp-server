---
id: install-aidlc
name: Install AWS AI-DLC
description: Walks the FDE through installing AWS Labs' aidlc-workflows in the engagement workspace, verifies the install, and records the installation in engagement state. Idempotent — re-running on an installed engagement detects this and skips.
trigger:
  kind: command
  phrase: "/aidlc-install"
outputs:
  - name: aidlc-install-receipt
    path: artifacts/aws-aidlc/install-{timestamp}.md
    kind: document
---

## Objective

Get AWS Labs' [aidlc-workflows](https://github.com/awslabs/aidlc-workflows) installed in the engagement, with the rules in the right place for the platform in use, and record the installation so other AI-DLC skills can pre-flight-check without re-detecting.

## Pre-flight

1. Detect platform from the engagement directory:
   - `.kiro/` present → Kiro
   - `.cursor/` present → Cursor
   - `.clinerules/` present → Cline
   - `.claude/` present → Claude Code
   - `.github/copilot-instructions.md` parent path present → GitHub Copilot
   - None of the above + `AGENTS.md` writable → OpenAI Codex
   - Multiple → ask the FDE which one to install for; default to Kiro if both `.kiro/` and `.claude/` exist
2. Detect prior install per `aidlc-fde-bridge.md` "Detection" section. If installed already, skip to the receipt step and record an idempotent re-install.

## Procedure

1. Tell the FDE: "I will install AWS Labs AI-DLC into this engagement. The rules become available as steering / instructions for the agent. AI-DLC is open-source under MIT-0; installation places ~30KB of markdown rules under your platform's standard location. Confirm to proceed."
2. Wait for explicit confirmation (`yes`, `proceed`, `go`, or equivalent typed by the FDE). If declined, abort and tell the FDE no changes were made.
3. **Install all rule files using the bulk install tool.** Call `fde_install_assets` which copies all AI-DLC rules directly to the correct platform paths in a single operation — no file-by-file retrieval needed:

   ```
   fde_install_assets(programId="aws-aidlc", engagementDir="<workspace-root>", target="<platform>")
   ```

   Where `<platform>` is one of: `kiro`, `claude`, `cursor`, `copilot`, `codex`, `cline`, `continue`, `aider`, `windsurf`, `zed`, `chatgpt-custom-gpt`, `gemini-code-assist`

   This installs:
   - Core workflow rule
   - All common rule-details (11 files)
   - Inception phase rules (7 files)
   - Construction phase rules (6 files)
   - Operations phase rules (1 file)
   - Extension rules (security, resiliency, testing — 6 files)
   - VERSION file

   The tool places files in the correct platform-specific paths automatically (e.g., `.kiro/steering/aws-aidlc-rules/` for Kiro, `.cursor/rules/` for Cursor).

   > **Fallback:** If `fde_install_assets` is unavailable (e.g., older server version), retrieve files individually using `fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/...")` for each file listed in `references/aidlc-installation-guide.md`.

4. Place the retrieved content into the platform-specific paths per `references/aidlc-installation-guide.md`. The skill **delegates** the actual placement to the FDE if the agent does not have shell-execution capability — present the exact commands and wait for confirmation that they ran.
5. Verify installation by re-running the detection logic in step 2 of pre-flight. If the detection paths are now satisfied, proceed; if not, surface the failure and stop.
6. **MERGE** into `state/current.yaml` (do NOT overwrite the file — preserve all existing fields):
   - Add field `aidlcInstalled: true`
   - Add field `aidlcVersion: <captured from VERSION file>`
   - Add field `aidlcInstalledAt: <iso timestamp>`
   - Update field `updatedAt: <same iso timestamp as aidlcInstalledAt>`

   ⚠️ **Critical:** The existing fields (`customer`, `intent`, `intake`, `aimTier`, `currentStage`, `decisions`, `startedAt`) MUST remain untouched. Read the file first, add the three new fields, refresh `updatedAt`, then write it back. Never rewrite the entire file from scratch.
7. Append a decision entry to `state/history.jsonl`:
   ```json
   {"ts":"<iso>","actor":"fde","kind":"aidlc-installed","detail":{"version":"<v>","platform":"<p>","evidence":{"source":"chat","userInput":"<verbatim confirmation string>"}}}
   ```
8. Write the receipt artifact at `artifacts/aws-aidlc/install-{timestamp}.md` containing:
   - Version installed
   - Platform detected
   - Install paths (which directories were touched)
   - Verification result
   - The exact next-step instruction: "Run `/aidlc-inception` to begin AI-DLC's Requirements Analysis."

## Done when

- `state.aidlcInstalled` is `true`.
- The detection logic in `aidlc-fde-bridge.md` returns positive.
- A receipt artifact exists.
- The FDE has been told what to run next.

## Failure modes

- **Platform ambiguous** — multiple platform directories exist. Resolution: ask the FDE, default to Kiro.
- **Version not specified, network unavailable** — surface the error, ask the FDE for the local zip path.
- **Verification fails after placement** — the install commands ran but detection paths are still empty. Most likely cause: rules were extracted to the wrong subdirectory. Surface the expected vs actual paths from `aidlc-installation-guide.md` and ask the FDE to re-run.
- **FDE declines confirmation in step 2** — abort, no state changes, no artifacts.

## Anti-patterns this skill rejects

- **Auto-running install commands without explicit FDE confirmation.** The install touches the FDE's project structure; consent is non-negotiable.
- **Assuming a successful install without re-running detection.** "I copied the files" is not the same as "the agent can read the rules." Verify before recording state.
- **Recording the install decision without an evidence string.** The decision-entry's `evidence` field cites the FDE's verbatim confirmation per `discovery-first-gate.md` rule 3.

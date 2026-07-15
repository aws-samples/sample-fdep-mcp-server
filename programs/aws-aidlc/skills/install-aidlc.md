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
3. **Retrieve all rule files from the FDE MCP server using `fde_get_skill`.** Do NOT download from GitHub or generate from memory. The FDE MCP bundles a validated, version-locked copy. Call `fde_get_skill` with `skillId="install-aidlc"` and the `file` parameter for each asset:

   **Core workflow (always installed):**
   ```
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rules/core-workflow.md")
   ```

   **Common rule-details (always installed):**
   ```
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/process-overview.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/session-continuity.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/terminology.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/welcome-message.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/workflow-changes.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/question-format-guide.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/depth-levels.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/error-handling.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/overconfidence-prevention.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/ascii-diagram-standards.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/common/content-validation.md")
   ```

   **Inception phase rules:**
   ```
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/inception/workspace-detection.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/inception/requirements-analysis.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/inception/user-stories.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/inception/application-design.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/inception/workflow-planning.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/inception/units-generation.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/inception/reverse-engineering.md")
   ```

   **Construction phase rules:**
   ```
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/construction/functional-design.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/construction/infrastructure-design.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/construction/nfr-requirements.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/construction/nfr-design.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/construction/code-generation.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/construction/build-and-test.md")
   ```

   **Operations phase rules:**
   ```
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/operations/operations.md")
   ```

   **Extensions (install based on engagement needs):**
   ```
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/extensions/security/baseline/security-baseline.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/extensions/security/baseline/security-baseline.opt-in.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/extensions/resiliency/baseline/resiliency-baseline.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/extensions/resiliency/baseline/resiliency-baseline.opt-in.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/extensions/testing/property-based/property-based-testing.md")
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/aws-aidlc-rule-details/extensions/testing/property-based/property-based-testing.opt-in.md")
   ```

   **Version file:**
   ```
   fde_get_skill(skillId="install-aidlc", file="assets/aidlc-rules/VERSION")
   ```

4. Place the retrieved content into the platform-specific paths per `references/aidlc-installation-guide.md`. The skill **delegates** the actual placement to the FDE if the agent does not have shell-execution capability — present the exact commands and wait for confirmation that they ran.
5. Verify installation by re-running the detection logic in step 2 of pre-flight. If the detection paths are now satisfied, proceed; if not, surface the failure and stop.
6. Update `state/current.yaml`:
   - Set `aidlcInstalled: true`
   - Set `aidlcVersion: <captured from VERSION file>`
   - Set `aidlcInstalledAt: <iso timestamp>`
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

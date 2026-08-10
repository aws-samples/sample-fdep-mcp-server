# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2026-08-10

### Fixed
- Workspace Detection no longer misclassifies FDE Delivery Kit infrastructure (.kiro/, state/, .fde-manifest.json) as existing customer code — prevents false brownfield classification
- AI-DLC install step (`/aidlc-install`) uses explicit merge semantics to prevent state/current.yaml data loss during installation
- `updatedAt` field is now explicitly refreshed during AI-DLC install state update for consistent behavior

### Added
- Worked engagement examples in USER-GUIDE.md: healthcare AI app (build + aidlc + regulated) and maturity assessment (gen-ai-rollout)
- Merge-only state management rule (#5) in aidlc-fde-bridge.md — codifies that state/current.yaml must never be rewritten from scratch
- FDE infrastructure exclusion list in core-workflow.md Workspace Detection step

## [0.5.0] - 2026-07-30

### Added
- Initial public release of FDE Delivery Kit
- MCP server with 12 tools (load_intention, resolve, render, install_assets, etc.)
- Program catalog: fde-orchestration, ai-native-app-builder, aws-aidlc, aim, responsible-ai, resilience, ai-operations, agentpath
- Multi-platform adapter support (Kiro, Claude, Cursor, Copilot, Codex, Cline, Continue, Aider, Windsurf, Zed, Gemini Code Assist, ChatGPT Custom GPT)
- AIM assessment with per-perspective scoring
- State management with checksum integrity verification and replay-from-history
- Lens overlays for industry-specific augmentation
- Reference system with .fde-manifest.json index

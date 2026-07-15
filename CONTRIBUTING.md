# Contributing to FDE Kit

Thank you for your interest in contributing to the FDE (Forward-Deployed Engineer) Kit.

## How to Contribute

### Reporting Issues

Open a GitHub issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node.js version, MCP client)

### Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-improvement`)
3. Make your changes
4. Run the checks: `npm run build && npm run typecheck`
5. Commit with a descriptive message
6. Open a Pull Request

### What to Contribute

We welcome contributions in these areas:

| Area | Examples |
|------|----------|
| **New programs** | See [Adding a Program](documentation/ADD-A-PROGRAM.md) |
| **New adapters** | See [Adding an Adapter](documentation/ADD-AN-ADAPTER.md) |
| **Industry lenses** | New overlays for retail, manufacturing, public sector, etc. |
| **Bug fixes** | Schema issues, rendering bugs, encoding problems |
| **Documentation** | Guides, examples, clarifications |
| **Reference patterns** | Tested AWS architecture patterns for the multi-layer model |

### Code Style

- TypeScript strict mode (`noImplicitAny`, `noUnusedLocals`, etc.)
- No new runtime dependencies without discussion
- Programs are data, not code — add programs via YAML + markdown, not TypeScript
- Follow existing patterns in similar files

### Commit Messages

Follow conventional commits:
```
feat: add new resilience skill for circuit breakers
fix: correct path validation on Windows with UNC paths
docs: update QUICKSTART with Cursor setup instructions
chore: pin ajv-formats to 3.0.1
```

### Testing Your Changes

```bash
npm run build        # Compile TypeScript
npm run typecheck    # Type-check without emitting
npm run test         # Run test suite (if tests exist)
```

For program changes, verify activation by running:
```
fde_load_intention → fde_resolve
```
and confirming your program appears in the resolved graph.

## Code of Conduct

This project follows the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct). Please report unacceptable behavior to opensource-codeofconduct@amazon.com.

## Security

If you discover a security vulnerability, please do **not** open a public issue. Instead, follow the [AWS Vulnerability Reporting](https://aws.amazon.com/security/vulnerability-reporting/) process.

## License

By contributing, you agree that your contributions will be licensed under the MIT-0 License.

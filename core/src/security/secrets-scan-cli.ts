#!/usr/bin/env node
/**
 * CLI entry for the secrets scanner.
 *
 *   npm run scan:secrets                         # scans process.cwd()
 *   npm run scan:secrets -- src lib              # scans only the given paths
 *   npm run scan:secrets -- --intention file.yml # structured scan of one
 *                                                  intention YAML / JSON file
 *
 * Prints file-tree findings as:
 *     <path>:<line>: [<rule>] <snippet>
 *
 * Prints intention findings as:
 *     <path>:<line?>:<field>: [<pattern>] <snippet>
 *
 * Exits 1 if any findings are reported, 0 otherwise.
 */

import { scanForSecrets, scanIntentionFile } from "./secrets.js";

function main(): void {
  const args = process.argv.slice(2);

  // Extract --intention <path> occurrences first. Multiple --intention
  // flags are supported and each is scanned in turn.
  const intentionPaths: string[] = [];
  const passthrough: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--intention") {
      const next = args[++i];
      if (next === undefined) {
        // eslint-disable-next-line no-console
        console.error("✗ --intention requires a path argument");
        process.exit(2);
      }
      intentionPaths.push(next);
    } else if (a.startsWith("--intention=")) {
      intentionPaths.push(a.slice("--intention=".length));
    } else {
      passthrough.push(a);
    }
  }

  if (intentionPaths.length > 0) {
    runIntentionMode(intentionPaths);
    return;
  }

  runTreeMode(passthrough);
}

function runTreeMode(paths: string[]): void {
  const scanPaths = paths.length > 0 ? paths : [process.cwd()];
  const findings = scanForSecrets(scanPaths);

  for (const f of findings) {
    // eslint-disable-next-line no-console
    console.log(`${f.filePath}:${f.line}: [${f.rule}] ${f.snippet}`);
  }

  if (findings.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `\n✗ ${findings.length} potential secret(s) found in scanned paths.`,
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`✓ No secrets detected in: ${scanPaths.join(", ")}`);
  process.exit(0);
}

function runIntentionMode(paths: string[]): void {
  let total = 0;
  for (const p of paths) {
    const result = scanIntentionFile(p);
    for (const f of result.findings) {
      const linePart = f.line !== undefined ? `${f.line}` : "?";
      // eslint-disable-next-line no-console
      console.log(
        `${p}:${linePart}:${f.field}: [${f.pattern}] ${f.snippet}`,
      );
    }
    total += result.findings.length;
  }

  if (total > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `\n✗ ${total} potential secret(s) found in intention file(s).`,
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`✓ No secrets detected in: ${paths.join(", ")}`);
  process.exit(0);
}

main();

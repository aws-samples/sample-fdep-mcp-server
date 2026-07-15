#!/usr/bin/env node
/**
 * CLI entry for the content-portability linter.
 *
 * Usage:
 *   portability-scan-cli                              # scans ./programs
 *   portability-scan-cli programs other               # scans each given root as programs
 *   portability-scan-cli --programs programs          # same, explicit flag
 *   portability-scan-cli --lenses lenses              # scans each lens dir under ./lenses
 *   portability-scan-cli --programs programs --lenses lenses
 *
 * Multiple `--programs` and `--lenses` flags are supported; each accepts
 * a directory path.
 *
 * Prints findings as:
 *     <path>:<line>: [<term>] <rule>
 *
 * Exits 1 if any findings are reported, 0 otherwise.
 */

import { resolve } from "node:path";
import {
  scanForPortabilityViolations,
  scanLensesForPortability,
} from "./portability.js";

interface ParsedArgs {
  programs: string[];
  lenses: string[];
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const programs: string[] = [];
  const lenses: string[] = [];
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--programs" || a === "--program") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`Missing value for ${a}`);
      }
      programs.push(next);
      i++;
    } else if (a === "--lenses" || a === "--lens") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`Missing value for ${a}`);
      }
      lenses.push(next);
      i++;
    } else if (a.startsWith("--programs=")) {
      programs.push(a.slice("--programs=".length));
    } else if (a.startsWith("--lenses=")) {
      lenses.push(a.slice("--lenses=".length));
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else if (a.startsWith("--")) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      positional.push(a);
    }
  }

  // Positional args (back-compat) are treated as program roots when no
  // `--programs` or `--lenses` flag has been given.
  if (programs.length === 0 && lenses.length === 0 && positional.length > 0) {
    programs.push(...positional);
  } else if (positional.length > 0) {
    // If mixed, append positional to programs for predictability.
    programs.push(...positional);
  }

  // Default: scan ./programs when nothing was specified at all.
  if (programs.length === 0 && lenses.length === 0) {
    programs.push("programs");
  }

  return { programs, lenses };
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(
    [
      "Usage: portability-scan-cli [--programs <dir>]... [--lenses <dir>]... [<dir>...]",
      "",
      "Scans program and lens content for disallowed customer-specific terms",
      "declared in <root>/.portability.yaml.",
      "",
      "Flags may be repeated. Positional args (if any) are scanned as program roots.",
    ].join("\n"),
  );
}

function main(): void {
  let args: ParsedArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${(err as Error).message}`);
    process.exit(2);
  }

  let total = 0;

  for (const root of args.programs) {
    const absRoot = resolve(root);
    const findings = scanForPortabilityViolations(absRoot);
    for (const f of findings) {
      // eslint-disable-next-line no-console
      console.log(`${f.filePath}:${f.line}: [${f.term}] ${f.rule}`);
    }
    total += findings.length;
  }

  for (const root of args.lenses) {
    const absRoot = resolve(root);
    const diagnostics = scanLensesForPortability(absRoot);
    for (const d of diagnostics) {
      // eslint-disable-next-line no-console
      console.log(`${d.path}: [${d.pattern}] ${d.message}`);
    }
    total += diagnostics.length;
  }

  const scanned = [
    ...args.programs.map((r) => `programs=${r}`),
    ...args.lenses.map((r) => `lenses=${r}`),
  ].join(", ");

  if (total > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `\n✗ ${total} portability violation(s) found. Use generic placeholders instead of customer-specific names.`,
    );
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.log(`✓ No portability violations found in: ${scanned}`);
    process.exit(0);
  }
}

main();

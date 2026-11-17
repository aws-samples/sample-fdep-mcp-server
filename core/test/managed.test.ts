import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeManaged, type RenderReport } from "../src/renderer/managed.js";

const newReport = (): RenderReport => ({ written: [], skipped: [], conflicts: [] });

describe("writeManaged", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fde-managed-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const cases = [
    { name: "plain file", v1: "# Engagement\n\n5 programs\n", v2: "# Engagement\n\n7 programs\n" },
    {
      name: "frontmatter file",
      v1: "---\ninclusion: always\n---\n# Rule\n\nold body\n",
      v2: "---\ninclusion: always\n---\n# Rule\n\nnew body\n",
    },
  ];

  for (const { name, v1, v2 } of cases) {
    it(`overwrites an untouched ${name} when the rendered content changes`, () => {
      writeManaged({ path: "doc.md", content: v1 }, dir, newReport());

      const report = newReport();
      writeManaged({ path: "doc.md", content: v2 }, dir, report);

      expect(report.written).toEqual(["doc.md"]);
      expect(report.conflicts).toEqual([]);
      expect(readFileSync(join(dir, "doc.md"), "utf8")).toContain(v2.split("\n").at(-2));
    });

    it(`keeps a hand-edited ${name} and reports a conflict`, () => {
      writeManaged({ path: "doc.md", content: v1 }, dir, newReport());
      const target = join(dir, "doc.md");
      const edited = readFileSync(target, "utf8") + "hand edit\n";
      writeFileSync(target, edited, "utf8");

      const report = newReport();
      writeManaged({ path: "doc.md", content: v2 }, dir, report);

      expect(report.written).toEqual([]);
      expect(report.skipped).toEqual(["doc.md"]);
      expect(report.conflicts).toEqual([{ targetPath: "doc.md", reason: "hash-mismatch" }]);
      expect(readFileSync(target, "utf8")).toBe(edited);
    });
  }

  it("re-renders identical content idempotently", () => {
    writeManaged({ path: "doc.md", content: "same\n" }, dir, newReport());
    const first = readFileSync(join(dir, "doc.md"), "utf8");

    const report = newReport();
    writeManaged({ path: "doc.md", content: "same\n" }, dir, report);

    expect(report.written).toEqual(["doc.md"]);
    expect(readFileSync(join(dir, "doc.md"), "utf8")).toBe(first);
  });
});

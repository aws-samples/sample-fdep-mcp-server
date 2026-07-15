import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")), "..");
const L = await import(
  pathToFileURL(path.join(ROOT, "core", "dist", "core", "src", "intention", "loader.js")).href
);

const md = fs.readFileSync(path.join(ROOT, "docs-src", "entry-prompt.md"), "utf8");
const m = md.match(/schemaVersion: "1"[\s\S]*?updatedAt:[^\n]*/);
if (!m) {
  console.error("Could not find example YAML in entry-prompt.md");
  process.exit(1);
}
const tmp = path.join(ROOT, ".tmp-intention.yaml");
const captured = m[0].replace(/\r/g, "");
fs.writeFileSync(tmp, captured);
console.log("--- captured YAML ---\n" + captured + "\n---------------------");
try {
  const itn = L.loadIntention(tmp, path.join(ROOT, "schemas"));
  console.log("VALID intention. customer:", itn.customer, "| goals:", itn.goals.join(","));
} catch (e) {
  console.error("INVALID:", e.message);
  if (e.diagnostics) {
    for (const d of e.diagnostics) {
      console.error("  -", d.field ?? "(root)", ":", d.message);
    }
  }
  process.exit(1);
} finally {
  fs.unlinkSync(tmp);
}

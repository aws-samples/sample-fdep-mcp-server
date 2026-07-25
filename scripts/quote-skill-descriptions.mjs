import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

let fixed = 0;
for (const p of walk("programs")) {
  const c = fs.readFileSync(p, "utf8");
  const fmEnd = c.indexOf("\n---", 4);
  if (!c.startsWith("---") || fmEnd < 0) continue;
  const fm = c.slice(0, fmEnd);
  const body = c.slice(fmEnd);

  // Find each line starting with `description:` or `name:` and ensure value
  // is wrapped in double quotes (unless already quoted).
  const fmFixed = fm.replace(/^(description|name):\s*(.*)$/gm, (m, key, val) => {
    val = val.trimEnd();
    if (val.startsWith('"') && val.endsWith('"')) return `${key}: ${val}`;
    if (val.startsWith("'") && val.endsWith("'")) return `${key}: ${val}`;
    // Escape any embedded double quotes
    const escaped = val.replace(/"/g, '\\"');
    return `${key}: "${escaped}"`;
  });

  if (fm !== fmFixed) {
    fs.writeFileSync(p, fmFixed + body);
    fixed++;
    console.log(`fixed: ${p}`);
  }
}
console.log(`\n${fixed} files fixed`);

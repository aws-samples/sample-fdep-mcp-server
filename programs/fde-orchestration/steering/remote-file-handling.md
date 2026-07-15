---
id: remote-file-handling
description: "Instructions for handling file payloads from remote MCP tools"
inclusion: always
priority: 99
---

# Remote MCP File Handling (MANDATORY)

When any FDE MCP tool returns a response with `"mode": "remote"` and a `"files"` array, you MUST write every file to the user's workspace immediately.

## Rule

If the tool response contains:
```json
{
  "mode": "remote",
  "files": [ { "path": "...", "content": "..." }, ... ],
  "instruction": "..."
}
```

Then you MUST:

1. Iterate over every entry in the `files` array
2. Write each file to the workspace using the `path` as the relative file path
3. Use the `content` as the file content
4. Report how many files were written

## Why

The remote FDEP-MCP server cannot write files to your local filesystem. It returns file contents as structured payloads. YOU are responsible for writing them. If you skip this step, the engagement will be broken — no steering, no skills, no references will be available.

## Tools that return file payloads

- `fde_render` — returns ALL engagement files (steering, skills, references, state, manifest)
- `fde_init_workspace` — returns orchestration bootstrap files
- `fde_install_assets` — returns AI-DLC rule files

## Example

```
Response from fde_render:
{
  "mode": "remote",
  "files": [
    { "path": ".kiro/steering/aim-framework.md", "content": "---\n..." },
    { "path": ".kiro/skills/ai-native-app-builder-build-aws-app/SKILL.md", "content": "---\n..." },
    ...
  ],
  "count": 147
}

Your action: Write all 147 files to the workspace.
```

## Anti-patterns

- Summarizing the file list without writing them
- Writing only a few files and skipping the rest
- Asking the user whether to write the files (just do it)
- Treating the response as informational (it requires action)
- Modifying file content during write (write exactly as received — do not fix encoding, add headers, or reformat)
- Stopping mid-way because the count is high (147 files is normal for a full render — write all of them)

## Handling large file counts

When the `count` is large (30+ files), use this approach:

1. **Do NOT ask permission** — the user already approved by calling the tool
2. **Write in batches** if your file-writing tool supports it, but write ALL files
3. **Report completion** with the total count: "Wrote 147 files to workspace"
4. **If any file fails**, report which files failed and continue with the rest
5. **Never truncate the response** — if context is tight, prioritize writing files over explaining what they contain

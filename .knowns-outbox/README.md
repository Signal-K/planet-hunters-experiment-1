# Landnam Knowns Outbox

Use this directory only when an agent is sandboxed inside this child repo and cannot write to the parent Navigation Knowns project.

Write proposed task, doc, memory, or context updates as small Markdown or JSON files. Do not create a live .knowns project here.

Parent-capable agents collect these files from the Navigation repo with:

```bash
make knowns-outbox-collect
```

After collection, accepted updates must still be applied to the canonical parent .knowns project using Knowns MCP tools or CLI commands.

> **Note:** Landnam has fully migrated from Godot to Next.js/React. Godot-era tasks in `.knowns/tasks/` and Godot-era docs in `.knowns/docs/` should be archived. See `proposal-archive-godot-tasks.md` and `proposal-purge-godot-docs.md` in this directory.

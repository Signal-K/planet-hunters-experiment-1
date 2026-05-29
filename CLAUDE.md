<!-- LANDNAM PROJECT REQUIREMENTS START -->
# Landnam Project Requirements

## Godot Scene Authoring Is Scene-First

GDScript files are for functionality. They must not be used as a substitute for authoring scenes.

When creating or changing a Godot scene, put the scene structure in the `.tscn` file: nodes, containers, labels, buttons, text content, layout, anchors, exported resources, and editor-visible defaults belong in the scene so it can be viewed and edited in the Godot editor.

Do not create an empty `.tscn` with a root node and then build the visible UI in `_ready()` or helper methods. That pattern is prohibited for static or known UI because it makes scenes unreadable, uneditable, and bug-prone.

Use `.gd` scripts only for behavior: signal handlers, state changes, data loading, validation, navigation, animation triggers, and binding runtime data into existing scene nodes. Runtime node creation is acceptable only for genuinely dynamic repeated content, such as rendering an arbitrary number of rows from player data, and should use preauthored child scenes/resources when practical.

Before finishing any task that creates a scene, verify the `.tscn` contains the meaningful node tree and static UI/text, and that the attached script is not constructing that static UI in code.

## UI Blocks Need Dedicated Layout Segments

Every persistent UI block/component type must have a defined layout segment before it is placed on screen. Use `UILayout.gd` zones or scene-owned container lanes for headers, content, footers, overlays, tutorial cards, modals, action bars, widgets, and repeated panels. Do not float cards, tutorial panels, debug widgets, or action controls over arbitrary content without reserving space for them.

When adding a new overlay or persistent panel, define how it coexists with the rest of the screen at desktop, tablet, and mobile widths. If the tutorial coach or another overlay is visible, the underlying screen must either reserve a sidecar/body segment for it or explicitly suspend/hide the conflicting UI. Before finishing UI work, verify the relevant blocks do not overlap actionable content.

## Testing Must Leave Fresh Player State

When testing or playing the Godot game, use an isolated test profile whenever possible: the Docker sandbox, a temporary `GODOT_USER_DIR`, or Godot's `--user-data-dir` pointing at a disposable directory. Do not run test playthroughs against the user's normal playable save unless the user explicitly asks for that.

After any test run, manual play session, scripted playthrough, or change that touches saved game behavior, leave the game in a fresh-start state for the user. Fresh means the next normal play session starts from the beginning with the default 10,000,000,000 franc balance, no completed/active/returned missions, default rocket state, default construction/tutorial/first-time mechanic state, and no stale `user://` progress files from the test.

Prefer the existing reset paths when cleanup is needed: `AppController.full_factory_reset()` for in-game reset behavior and `AppControllerPersistence.reset_all()` or an isolated user-data directory for persisted files. Before finishing, verify the reset or state isolation when practical. If it cannot be verified, say that clearly.

## Production Exports Must Be Fresh

Any production export, deploy, release, or versioned build must be generated from the current `scene/` source. If Godot scene files, scripts, or exported assets changed, rebuild the web export before shipping by using the existing export pipeline, and run the export freshness verification when available. Do not publish stale `game/` or `electron-dist/godot-web` output after changing the Godot project.

<!-- LANDNAM PROJECT REQUIREMENTS END -->

<!-- KNOWNS GUIDELINES START -->

@KNOWNS.md

**CRITICAL: You MUST read and follow `KNOWNS.md` in the repository root before doing any work. It is the canonical source of truth for all agent behavior in this project.**

## Canonical Guidance

- Knowns is the repository memory layer for humans and the AI-friendly working layer for agents.
- The source of truth for repo-level agent guidance is `KNOWNS.md`.
- Read `KNOWNS.md` first whenever the runtime supports reading repository files.
- Load behavior, memory policy, and workflow rules from `KNOWNS.md`; treat this file only as a compatibility entrypoint.
- If this file and `KNOWNS.md` differ, follow `KNOWNS.md`.

## Minimum Rules

- Use Knowns as the canonical system for tasks, docs, templates, and workflow state.
- Never manually edit Knowns-managed task or doc markdown.
- Search first, then read only relevant docs and code.
- Use `search` for discovery; use MCP `retrieve` tool when a workflow needs structured context with citations. Fall back to CLI `knowns retrieve` if MCP is unavailable.
- For code context retrieval, prefer MCP tools over CLI: use `code({ action: "search" })` first, then `code({ action: "symbols" })`, then `code({ action: "deps" })`. Treat CLI `knowns code ...` as fallback for manual inspection or debugging.
- Plan before implementation unless the user explicitly overrides that workflow.
- Validate before considering work complete.
- Use memory tools: `memory({ action: "list" })` at session start, `memory({ action: "add" })` after tasks for reusable knowledge.
- Proactively capture durable memory based on `KNOWNS.md` memory rules; do not wait for an explicit user instruction to save memory when scope and durability are clear.

## Quick Reference

```bash
knowns doc list --plain               # List docs
knowns task list --plain              # List tasks
knowns task <id> --plain              # View task
knowns doc "<path>" --plain --smart  # View doc
knowns search "query" --plain        # Search docs/tasks
knowns retrieve "query" --json      # Retrieve structured context pack (CLI fallback)
```

<!-- KNOWNS GUIDELINES END -->

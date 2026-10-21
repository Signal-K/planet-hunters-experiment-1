---
name: scene-studio
description: Author and verify Landnam scene scripts, sandbox Things, presets, and mission flows in Scene Studio.
---

# Landnam Scene Studio

Start with `node scripts/studio.mjs where <ticket or files>` and `node scripts/studio.mjs focus <scenes> --ticket SSL-123`. Read the scene script, feedback, and scene instructions named in `AGENTS.md` before editing.

Use the sandbox stage for independent scene checks. `[[things]]` describe what can be present; `[[presets]]` name useful combinations and state what to do, what should happen, and what must not. Put multi-scene work in `shared/authoring/flows/` and verify each named preset exists.

Author source TOML, not generated runtime files. Run `node scripts/authoring.mjs check` after authoring changes. When a scene task is delivered, mark addressed feedback and record proof in Linear. Keep sandbox and preset support honest: it is web-stage only until native parity exists.

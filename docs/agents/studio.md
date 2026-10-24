# Scene Studio and live preview

Part of the Landnam agent instructions; `AGENTS.md` (repo root) is the entry point and wins on conflict. Read for scene work.

## Scene Studio (every scene as a script, with Liam's feedback)

`http://localhost:4320/game/studio` (dev only, no login) shows any scene and setup in the real game, with the native snapshot beside it. Each scene is a script, `shared/authoring/scenes/<scene>.toml`, and Liam's notes live beside it. Full guide: `shared/authoring/README.md`.
- At the start of a task run `node scripts/studio.mjs where <ticket or files>` and then `node scripts/studio.mjs focus <scenes> --ticket SSL-123`, so it is clear what scenes you are in. The edit hook keeps it current after that. Open the editor on them with `node scripts/studio.mjs open <scene>`.
- Before changing a scene, read its script, `shared/authoring/feedback/<scene>.toml` and `shared/authoring/instructions/scenes/<scene>*.md` (`node scripts/studio.mjs briefs` lists scenes with open notes). Liam's pins are requirements. A pin marked `wrong` is a standing rule: never bring it back, even once `resolved`. A pin marked `keep` must not change. Objects with `status = "proposed"` are elements he drew for you to build.
- `mode = "fix"`: follow the notes exactly. `mode = "explore"`: he does not know what will look good, so propose at least two genuinely different directions, each fixing every wrong pin, say which traits of his inspiration you borrowed, and show all three viewports. Never answer with a variation of what he rejected.
- When you deliver, set `status = "addressed"` in the feedback file, set `status = "implemented"` on proposed objects you built, and put the handoff in Linear as usual.
- Scene objects and the two compiled missions are authored in TOML. After editing `shared/authoring/**` run `node scripts/authoring.mjs check` (compile writes the runtime files for web and native; CI fails when they are stale). Never hand-edit `shared/scenes/base-world.json`, `shared/missions/*.json` or `AuthoredMissions.generated.swift`.
- Studio scenes use the sandbox stage by default: it removes campaign gates, help, balance and event chrome unless a Thing enables them. Put every independent setup in `[[things]]` and a named, instructed combination in `[[presets]]`.
- Put multi-scene walkthroughs in `shared/authoring/flows/`. Select a flow in Studio to visit its scenes and presets in sequence. Sandbox Things and flows are web-stage only; native snapshots remain legacy checkpoint proof.

## Live preview in the editor (Simple Browser)

Liam watches agent work in the Cursor/VS Code Simple Browser on `http://localhost:4320` (`make up`). Next dev HMR reloads it on every save. To make it also show the page you are editing:
- Claude Code: automatic, a PostToolUse hook in `.claude/settings.json` runs `scripts/preview-target.mjs` on every edit.
- Codex, Cursor and others (no hook): after editing a screen or component, run `node scripts/preview-target.mjs <edited file or /game/route>`. Do this when you start on a screen and whenever you switch to another one.
- Liam opens `http://localhost:4320/game/hub?follow=1` once (`?follow=0` stops it). `web/components/dev/DevFollow.tsx` (dev only) then navigates that tab to the last previewed route via `/api/dev/follow`.
- Every screen and every Hub-only state must be reachable by URL: a gameplay screen is a `/game/<screen>` route (`web/lib/game-screens.ts`), and Hub overlays take query params (`/game/hub?menu=1`, `?building=<kind>`, read in `HubScreen.tsx`). A new scene or overlay must be deep-linkable and added to the map in `scripts/preview-target.mjs`; never make it reachable only by clicking through ephemeral state.
- Use the same dev server for quick checks (`node scripts/dev-check.mjs`, see `testing.md`); scripted or long runs use the test stack (`make test-up`, :4321). Do not run `make up`/`make down` when `:4320` is healthy.

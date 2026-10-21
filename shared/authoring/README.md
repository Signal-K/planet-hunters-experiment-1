# Landnam authoring

Every scene and mission is a plain text script in this folder. You can read and edit it in Cursor, open it in the **Scene Studio** to see it running with no login, and leave plain-language notes that every agent reads. Web and native read the same files.

## Open the Studio

Start the dev stack (`make up`; the first time after pulling this, run `make web-deps` once so the Docker web container gets the TOML parser), then open <http://localhost:3001/game/studio>. In Cursor use `Cmd+Shift+P`, then **Simple Browser: Show**. It is built to sit in half a window next to a chat or a script: one fluid column, no fixed panes, light or dark to match your system (More, then Theme).

- **Pick a scene** with the first button or `Ctrl/Cmd+K`. Pick a setup with the second (every stage fixture for that screen is listed). Pick a device size at the right.
- **Review** (default): type what is wrong in the box and press Add note, or pin it on the preview. Mark things to keep. Add inspiration (paste a screenshot). Choose **Fix exactly** or **Give me options**, then **Copy brief for an agent** and paste it into the chat.
- **Edit**: draw UI elements and move or resize objects on the preview, change properties, see the TOML with problems marked on their lines. Undo and redo work for every change.
- **Data** (in the scene picker): the base world and the missions. Saving recompiles what web and native load.
- `?follow=1` on the URL makes the Studio jump to whatever scene an agent says it is working in.

Native appears beside web for phone sizes once a snapshot exists: `scripts/native-shots.sh hub-phone` renders one from the iOS Simulator (snapshots are phone only today).

## The files

| Path | What it is |
| --- | --- |
| `scenes/<scene>.toml` | One script per scene (27, every route). Type, where it is implemented, how to open it, curated setups, and its game objects. |
| `feedback/<scene>.toml` | Your notes, pins (wrong and keep), inspiration and direction for that scene. Written by the Studio. Every agent reads it. |
| `feedback/refs/` | Inspiration screenshots, shrunk when added. |
| `instructions/persistent.md` | Rules for every scene. |
| `instructions/scenes/<scene>.md` and `.next.md` | Rules that stay true for one scene, and the brief for the next pass. |
| `worlds/base-world.toml` | **Source of truth** for the base world. Compiles to `shared/scenes/base-world.json`. |
| `missions/*.toml` | **Source of truth** for two canonical missions (a client contract and free mining). Compile to `shared/missions/authored-missions.json`. |
| `schema/*.schema.json` | The format of each file. Cursor's TOML extension (recommended in `.vscode/extensions.json`) uses it for completion, help and red squiggles through the `#:schema` line at the top of each file. |

Objects are a flat list with a `parent` link, the way Godot scenes are. `status = "proposed"` marks an element you drew for an agent to build.

## What is compiled and who reads it

`node scripts/authoring.mjs compile` writes these, and `check` fails (and CI fails) if any is stale:

- `shared/scenes/base-world.json` and `web/lib/world/base-world.json`: the base world. Web `lib/world` and native `LandnamCore/World` already load it, unchanged.
- `shared/missions/authored-missions.json`, `web/lib/data/authored-missions.json` and `native/LandnamCore/.../AuthoredMissions.generated.swift`: web `missions.ts` and native `AuthoredMissions.swift` build the two missions from these. Payout follows the fee curve and sequences follow the game's own constants.

Editing a mission or the world in the Studio, or in a text editor followed by `compile`, changes both platforms. A native app needs a rebuild to pick it up.

## Commands

```bash
node scripts/authoring.mjs check          # validate everything and fail on stale runtime files (CI runs this as a test)
node scripts/authoring.mjs compile        # write the runtime files
node scripts/authoring.mjs validate       # problems with file:line:column
node scripts/studio.mjs where SSL-345     # which scenes a ticket or files belong to
node scripts/studio.mjs changed           # scenes touched by uncommitted work
node scripts/studio.mjs focus hub --ticket SSL-345   # declare what you are working in (Studio and storyboard show it)
node scripts/studio.mjs briefs            # scenes with open notes from you
cd web && npm run test:file -- lib/authoring          # unit tests
cd web && SCENES_BASE_URL=http://localhost:3001 npx playwright test tests/scenes/studio.spec.ts
```

## Honest limits today

- Only the base world and two missions are compiled and consumed. The other scene scripts describe each screen and hold your notes and drawn proposals, but the screens are still React and SwiftUI. Migrating a screen to data-driven objects is the next step per scene, and these scripts are where its objects go.
- Dragging objects works for screen-space elements. World-space objects (buildings on the base) are edited in the inspector, not dragged.
- Native previews are phone-size snapshots from the iOS Simulator, not a live render. A shared runtime would remove that gap; the decision is open in SSL-642 and recorded in ZenNotes (`projects/landnam/decisions/scene-scripts-and-scene-studio`).
- The Studio is dev only. It is disabled outside `next dev`.

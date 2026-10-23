# Landnam authoring

Every scene and mission is a plain text script in this folder. You can read and edit it in Cursor, open it in the **Scene Studio** to see it running with no login, and leave plain-language notes that every agent reads. Web and native read the same files.

## Open the Studio

Start the dev stack (`make up`; the first time after pulling this, run `make web-deps` once so the Docker web container gets the TOML parser), then open <http://localhost:4320/game/studio>. In Cursor use `Cmd+Shift+P`, then **Simple Browser: Show**. The stage fills the available height and a single drawer sits beside it from 620px wide up. Below that, the drawer moves below the stage. Theme follows your system unless changed in More.

- **Pick a scene or mission** with the first button or `Ctrl/Cmd+K`. Pick a saved setup or campaign checkpoint with the next picker, and a device size beside it.
- **Setup** controls everything that can be brought into the sandbox scene. Switch objects and state on, set sliders, then save the combination as a named preset with instructions. Sandbox scenes suppress campaign context unless a setup requests it.
- **Objects** keeps the Hierarchy and Inspector together. **Notes** holds the composer, pins, inspiration, and the agent brief. **Project** opens the source inventory and files in Cursor.
- **Mission flows** are named sequences in `flows/`; select one from Missions and walk each scripted scene and preset in order.
- **Data** (in the scene picker): the base world and the missions. Saving recompiles what web and native load.
- `?follow=1` on the URL makes the Studio jump to whatever scene an agent says it is working in.
- **Open the script** (every Open in Cursor button, the Script menu and the source view) asks the dev server to open the file at the right line. Cursor's built-in browser will not follow `cursor://` links, and the dev server in Docker cannot launch an app, so a small helper on your machine does it: `make up` starts it (`node scripts/host-opener.mjs status | start | stop`; log in your temp folder as `landnam-host-opener.log`). It listens on `127.0.0.1:3098` only, answers only the Studio's server, and opens only files inside the repo. With the helper off, the button says so and offers Copy path and a plain `cursor://` link, which a normal browser follows. The file opens in the Cursor window you used last.

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
| `flows/*.toml` | A named mission walkthrough: scenes in order, their presets, and plain-language instructions. |
| `schema/*.schema.json` | The format of each file. Cursor's TOML extension (recommended in `.vscode/extensions.json`) uses it for completion, help and red squiggles through the `#:schema` line at the top of each file. |

Objects are a flat serialized scene graph with a `parent` link, matching the hierarchy used by game engines. `status = "proposed"` marks an element you drew for an agent to build.

## What is compiled and who reads it

`node scripts/authoring.mjs compile` writes these, and `check` fails (and CI fails) if any is stale:

- `shared/scenes/base-world.json` and `web/lib/world/base-world.json`: the base world. Web `lib/world` and native `LandnamCore/World` already load it, unchanged.
- `shared/missions/authored-missions.json`, `web/lib/data/authored-missions.json` and `native/LandnamCore/.../AuthoredMissions.generated.swift`: web `missions.ts` and native `AuthoredMissions.swift` build the two missions from these. Payout follows the fee curve and sequences follow the game's own constants.
- `shared/engine/authored-scenes.json`, `web/lib/engine/authored-scenes.json` and native `AuthoredScenes.generated.swift`: one validated object graph and mechanic ownership catalog for every route. `shared/engine/mechanics.json` records real domain source owners and known native gaps. Component names and mechanic references are checked, not interpreted as executable code.
- `layout = "host"` (the default) means the existing renderer still controls the object. `layout = "shared"` means a live adapter consumes its rectangle. `space = "parent"` makes that rectangle local to its parent; otherwise it is in the scene safe area. The Launchpad adapter renders the pad art, rocket, assembly scaffold and mission hotspot from the shared prefab subtree on both platforms. Its fused pad sprite is still legacy art, not independently editable tower/hangar art.
- The compiler validates the complete batch before writing any output. A bad scene cannot update web data while leaving Swift or missions behind. `node scripts/generate-game-map.mjs --check` also guards against unowned web systems/native systems and industry files, empty scene graphs and missing mechanic ownership. Native route gaps remain explicit rather than being disguised as parity.

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
cd web && SCENES_BASE_URL=http://localhost:4320 npx playwright test tests/scenes/studio.spec.ts
```

## Honest limits today

- All 27 existing routes have object/mechanic contracts, not 27 completed engine migrations. Studio's Project workspace distinguishes host-owned layout, shared geometry and missing native sources. The legacy route inventory is not a required player journey; routes can remain compatibility deep links when several scenes are composed into one experience.
- Dragging objects works for screen-space elements. World-space objects (buildings on the base) are edited in the inspector, not dragged.
- Native previews are phone-size snapshots from the iOS Simulator, not a live render. A shared runtime would remove that gap; the decision is open in SSL-642 and recorded in ZenNotes (`projects/landnam/decisions/scene-scripts-and-scene-studio`).
- The Studio is dev only. It is disabled outside `next dev`.
- Things, presets, and flows currently run in the web sandbox only. Native previews are phone snapshots for legacy campaign checkpoints.

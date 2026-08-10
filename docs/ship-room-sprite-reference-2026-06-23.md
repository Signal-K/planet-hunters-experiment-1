# Ship Room Sprite Reference

Date: 2026-06-23

## Goal

Update Landnam sprite generation for two rocket views:

- Closed exterior ship view: a complete side-view rocket/ship hull.
- Open interior view: a cutaway container layer with grid-aligned rooms placed inside it.

This follows the direction from the Pixel Starships references: the same ship can be shown as a regular exterior sprite or as an opened management view where rooms are readable as discrete modules.

## Reference Patterns

### Pixel Starships

Observed from the user-provided screenshots and public gameplay screenshots:

- Ships use a long horizontal side-view silhouette, often with exaggerated angular fins, stage protrusions, weapon mounts, and large engines.
- The exterior view hides interior rooms and reads as a complete vehicle.
- The interior/management view overlays visible room bays inside the hull. Rooms are rectangular, grid-aligned, and framed by bright cyan-blue borders.
- Room contents must read at small scale: cockpit chairs, engine machinery, storage racks, med/science gear, shield/control stations.
- The surrounding scene can be busy, but production sprites should stay isolated from HUD, asteroids, crew, and background.

Public reference checked:

- Pixel Starships gameplay screenshots on Keymailer and Aptoide show exterior combat/flight views with side-view hulls, asteroid-field backgrounds, HUD chrome, and large readable ship silhouettes.

### Starbound Ship Interiors

Starbound is not the target style, but its ship interiors clarify the modular-room problem:

- The ship is a side-view cutaway with rooms laid out in decks.
- The hull remains visible as a container around room bays.
- Individual room modules are visually distinct through wall trim, equipment silhouettes, lights, and floor/ceiling rails.
- Room art must tile cleanly so adjacent modules do not fight each other.

Public reference checked:

- Starbound spaceship interior screenshots on MonsterVine, Roguey's Forum, Imgur, and Softonic show modular side-view interiors with rooms, corridors, hull shells, and engine/nose boundaries.

## Prompt Rules

Use separate prompt profiles instead of a single generic sprite suffix:

- `ship_exterior`: closed hull only, complete assembled vehicle, no visible rooms.
- `ship_container`: open/cutaway hull shell with empty grid bays and stage seams, no room equipment.
- `room_module`: individual rectangular interior room tile, no exterior hull.
- `part_icon`: existing catalog-part icon behavior.

Shared constraints:

- Side-view orthographic pixel-art sprite.
- Dark outline, readable silhouette, Landnam navy/steel/cyan/amber palette.
- Transparent or pure-black background only.
- No HUD, no crew, no text, no starfield/planet scene.
- Avoid tiny greebles that collapse on mobile.

## First Batch

The first generation batch should produce:

- `ship_sr1_exterior`: closed Tier 1 Explorer mining ship. The filename is retained as an asset compatibility key.
- `ship_sr1_cutaway_container`: open Explorer interior container, with 5-7 empty room bays. The filename is retained as an asset compatibility key.
- `room_cockpit_t1`: command/cockpit room module.
- `room_engine_t1`: engine/power room module.
- `room_cargo_bay_t1`: cargo/storage bay module.
- `room_mining_drill_t1`: mining equipment room module.

Draft outputs should land in `tools/sprites/output/_generated/`, then approved images can be promoted to stable runtime paths:

- `web/public/game/assets/ships/`
- `web/public/game/assets/ships/containers/`
- `web/public/game/assets/rooms/`

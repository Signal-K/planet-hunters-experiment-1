# Landnam Game — UI Kit

Mobile-first **landscape** recreation of the in-game surfaces shown in `assets/reference/`. Built as React + inline JSX (Babel) so the chrome is editable in the design tool. Mirrors the visual vocabulary in `colors_and_type.css` exactly.

## Screens

The kit ships one interactive index that lets you flip between the three reference screens:

- **Launchpad / Rocket Fabrication** — three-slot chassis / propulsion / drill picker with the canonical bottom progress bar. Pick a part to see the amber selection state. *(matches `rocket-fabrication.png`)*
- **Solar System Atlas** — concentric orbit rings, planet chips, bottom telemetry rail with current location / explored / unexplored counts. *(matches `solar-system.png`)*
- **Galaxy Map** — star-field with grid, search field at top, "SYSTEM TELEMETRY" footer panel, system-view CTA. *(matches `galaxy-map.png` + `stellar-os.png`)*

## Components

| File | Component(s) | Used by |
| --- | --- | --- |
| `Chrome.jsx` | `<Stage>`, `<TopBar>`, `<BottomBar>`, `<Seg>`, `<Button>` | every screen |
| `Slot.jsx` | `<SlotCard>` | Launchpad |
| `Telemetry.jsx` | `<TelemetryRow>`, `<TelemetryItem>` | atlas footers |
| `Atlas.jsx` | `<OrbitMap>`, `<PlanetGlyph>`, `<StarMap>`, `<StarDot>` | atlas + galaxy |
| `Launchpad.jsx` | `<LaunchpadScreen>` | screen |
| `SolarSystem.jsx` | `<SolarSystemScreen>` | screen |
| `Galaxy.jsx` | `<GalaxyScreen>` | screen |
| `App.jsx` | `<App>` (screen switcher) | index |

These are pixel-mirror recreations of the reference screenshots, not production logic — read the Godot scenes in `signal-k/planet-hunters-experiment-1` (`scene/Scenes/UI/LaunchWizard.tscn`, `space_map.tscn`, etc.) for real behaviour.

## Canvas

Design canvas is `1920×1080` (landscape). The `<Stage>` wrapper auto-scales to fit any viewport via `transform: scale()` so the kit is checkable on a phone.

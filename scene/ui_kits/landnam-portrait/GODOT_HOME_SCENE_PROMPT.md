# Claude Code Prompt — Earth Base Home Scene (Godot)

> Paste the block below into Claude Code from the root of the
> `planet-hunters-experiment-1` Godot project. It rebuilds the **Earth Base
> home scene** (`Scenes/Earth/earth_base_1.tscn` + `earth_base_1.gd`) to match
> the portrait mobile design produced in the Landnam design system.
>
> It references the project's real systems (`DS.gd`, `AppController`,
> `SafeAreaUI`, existing panels) so the result is wired in, not a mockup.

---

## PROMPT

```
You are working in the Planet Hunters / Star Sailors Godot 4.5 project
(GL Compatibility renderer, mobile-first portrait, 1080×1920 design res).

GOAL
Rebuild the Earth Base home scene (res://Scenes/Earth/earth_base_1.tscn and its
script res://Scripts/.../earth_base_1.gd) to match the attached portrait design.
It is a single full-screen Control in PORTRAIT, scaling via the existing
SafeAreaUI autoload. Reuse DS.gd for ALL colors, font sizes, radii and spacing —
do not hardcode hex values. Reuse existing panels (LaunchWizard, ControlStationPanel,
SatelliteStationPanel, MenuPanel, SpaceMap) for navigation targets.

Read first:
- res://Scripts/UI/DS.gd                 (design tokens — source of truth)
- res://Scripts/Systems/AppController.gd (scene routing + game state)
- res://Scripts/UI/SafeAreaUI.gd         (safe-area scaling)
- res://Scenes/Earth/earth_base_1.tscn   (current scene to replace)
- res://Scenes/UI/MenuPanel.tscn         (Game Menu — opened by Base nav)
- res://Scenes/UI/SpaceMap/space_map.tscn (Atlas nav target)

SCENE STRUCTURE (node tree, back → front)
CanvasLayer "Home"
└─ Control "Root" (full rect, anchors 0–1)
   ├─ TextureRect "Backdrop"        : Earth1.png (res://assets/Backdrops/Earth1.png),
   │                                  STRETCH_KEEP_ASPECT_COVERED, centered.
   │                                  A composed landscape: sky band (top ~32%),
   │                                  distant mountains, forest mid, soil bottom.
   ├─ Node2D "SkyFX"                : ambient star field + cloud drift (see ENV).
   ├─ ColorRect "TopScrim"          : vertical gradient shader, rgba(6,9,15) 0.85→0
   │                                  over the top 120px (legibility for HUD).
   ├─ Control "TitleBlock" (top-left, margin 28,40)
   │   ├─ Label "Eyebrow"  : "EARTH BASE · LV {level}", DS.F_LABEL, DS.PRIMARY,
   │   │                      letter_spacing tracked, uppercase.
   │   └─ Label "Title"    : "Earth Base", DS.F_TITLE, Oxanium Bold, DS.TEXT.
   ├─ Control "HUD" (top-right, margin 28,40)
   │   ├─ PanelContainer "FrancsChip" : gold pill, "▲ {francs}", DS amber.
   │   └─ PanelContainer "JobsChip"   : amber pill, "{jobs} JOBS" + status dot.
   ├─ PanelContainer "ProgressionCard" (below title, contextual — see CARDS)
   ├─ Node2D "Structures"           : three interactive buildings (see STRUCTURES).
   ├─ Control "SoilSection" (bottom band, ~180px tall, see SOIL)
   ├─ Label "TapHint"               : "TAP A BUILDING", pill, above soil line,
   │                                  fades/pulses; hidden once a building tapped.
   └─ Control "RadialNav" (bottom-center — see NAV).

ENVIRONMENT (SkyFX)
- 55 ambient star dots placed procedurally in the upper 92% of the sky half,
  radius 0.6–2px, opacity 0.3–0.9, each twinkling (Tween loop on modulate.a,
  random 1.6–4.4s period). Seed the RNG so layout is stable across frames.
- Cloud drift: 2–3 soft white cloud sprites translating left→right across the
  sky, wrapping, 48–80s per pass, opacity 0.5–0.85.
- Animated environment events (port from current earth_base_1.gd if present):
  night-sky filter, star field toggle, sky map, cloud drift. Keep these hooks.

STRUCTURES (interactive, sit ON the ground line, never overlapping)
Each is a TextureButton (or Control + Area2D) with: a base sprite, a gentle bob
(Tween position.y ±2px, 5s loop), hover = scale 1.04 + brightness, pressed =
scale 0.99, and a soft ground-shadow ellipse beneath. Above each, a small glass
label pill (rgba(8,12,22,0.7), blur not required) with a status dot + NAME + sub.
  • Satellite Station — LEFT.  Chip "SATELLITE". Status SCANNING (green) / OFFLINE.
                        Tap → SatelliteStationPanel. (Locked < L5 → greyed.)
  • Launchpad        — CENTER, largest. Chip "LAUNCHPAD".
                        Status READY (green) / IN FLIGHT (amber, when mission active).
                        Tap → LaunchWizard / Build flow.
  • Control Station  — RIGHT (only shown after M1 complete + built).
                        Chip "CONTROL", sub "{jobs} JOBS" (amber). Tap → ControlStationPanel.
Use DS.STATUS_OK / DS.STATUS_WARN for the status dots.

SOIL SECTION (bottom band)
- Dark brown band (DS surface-dark tone) drawn over the painted soil, with a
  dashed surface divider line at the top.
- Faint horizontal strata lines; a few glowing ore-vein clusters (iron #d97150,
  silicon #b9d8ff, gold #ffd166) with soft radial halos.
- A "SUBSURFACE" label pill (right).
- A buried "MARKET" room chip (left), LOCKED until 4 missions complete; shows a
  lock glyph + "MARKET · L5". On unlock, becomes tappable → marketplace.

PROGRESSION CARD (contextual — show ONE, hide when Tutorial Coach overlay visible)
Priority order, each a tappable card with eyebrow + title + CTA pill:
  1. Mission in flight/at target/returning → "Mission In Progress" / Resume Mission
  2. Rocket on pad awaiting launch          → "Launch Ready on Pad" / Open Launchpad
  3. Debrief pending                        → "Mission Debrief Ready" / Open Debrief
  4. M1 complete, Control not built         → "Build Control Station" / Build Control Station
  5. M1+ complete, no active mission        → "Next Mission Available" / Open Launchpad
Read these conditions from AppController/game state. Left accent bar uses the
card's status color (DS.PRIMARY / amber / DS.STATUS_OK).

NAVIGATION
Portrait (phone): RADIAL nav. A round hub button at bottom-center; on tap it
fans 4 satellite buttons on a ~150° upward arc (stagger 45ms, spring ease),
hub glyph rotates to an ✕ when open, idle pulse ring when closed. Buttons:
  • Base     → open MenuPanel (Game Menu overlay)
  • Atlas    → SpaceMap
  • Build    → Build Flow overlay
  • Missions → Launchpad (disabled if Control Station build required)
Landscape (desktop/tablet): same 4 actions as a fixed bottom TAB BAR instead of
the radial. Switch on viewport aspect (SafeAreaUI can report orientation).

GAME MENU (MenuPanel, opened by Base)
Modal sheet, title "PLANET HUNTERS / Base of Operations". Header: Logbook ·
Discoveries · Close. Sections: Stats (francs + completed missions), Cargo
(mineral inventory), Mission Requirements (conditional), Settings (Practice
Mining, Replay Tutorial, Skip Tutorial [conditional], Dialogue On/Off, Reset
Progress [destructive amber]), Debug (editor builds only). Logbook & Discoveries
open their own overlays. Reuse the existing MenuPanel if present; otherwise build
to this spec.

DEFERRED POPUPS (show once per save, via AppController flags)
Starter Rocket 2 Unlock (after M1) · Free Operations Unlock (after all 4 authored
missions) · Emergency Loan Offer (when conditions met) · Classification Consensus
Notification (when results arrive). Wire the triggers; reuse existing overlay
scenes (StarterRocket2UnlockOverlay, FreeOpsUnlockOverlay, EmergencyLoanOfferDialog,
ClassificationConsensusNotification).

STYLE RULES
- ALL color/size/radius/spacing from DS.gd. No magic numbers for color.
- Oxanium for display/UI text, Turret Road for any mono/telemetry labels.
- Uppercase + letter-spacing for instrument labels & status pills; Title Case
  for headlines; sentence case for body/dialog. No emoji in HUD (use shape+color).
- Buttons: flat panel style, subtle top highlight, no heavy bevel; pressed = dim
  + slight shrink; hover = +6% brightness.
- Min on-device font 14px; nothing smaller.

DELIVERABLES
1. Updated earth_base_1.tscn + earth_base_1.gd implementing the above.
2. Any new reusable sub-scenes: Structure.tscn (parametric building), RadialNav.tscn,
   ProgressionCard.tscn, SoilSection.tscn — each small and self-contained.
3. Keep existing AppController signals/state intact; only add what's needed.
4. Run the project headless or in-editor to confirm no parse/script errors, then
   summarize what changed and list any TODOs you stubbed.

Do not invent new gameplay. Match the design; where a value isn't specified, pick
the closest DS token. Ask me only if a referenced node/scene/script is missing.
```

---

### Notes for whoever runs this
- The design reference is the portrait prototype in this design system at
  `ui_kits/landnam-portrait/` — open `index.html` to see the target look, and read
  `screens-pre.jsx` (`HubScreen`, `SoilCrossSection`, `ProgressionCard`, `GameMenu`)
  + `chrome.jsx` (`RadialMenu`) for exact layout, colors and interaction timing.
- Real building/part art lives in `assets/parts/` and the backdrop in
  `assets/scenes/` (mirrors of the repo's `scene/assets/Backdrops/Earth1.png` and
  `scene/assets/Rooms/generated_parts_512/`).
- Color/type tokens map 1:1 to `colors_and_type.css` in this project, which itself
  mirrors `DS.gd`.

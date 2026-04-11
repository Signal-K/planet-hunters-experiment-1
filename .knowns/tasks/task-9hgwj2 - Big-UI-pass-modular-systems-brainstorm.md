---
id: 9hgwj2
title: Big UI pass + modular systems brainstorm
status: in-progress
priority: high
labels:
  - ui
  - design
  - brainstorm
  - architecture
  - citizen-science
createdAt: '2026-04-02T11:52:15.355Z'
updatedAt: '2026-04-11T03:59:33.313Z'
timeSpent: 0
assignee: '@me'
---
# Big UI pass + modular systems brainstorm

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit the current game UI and structure, identify modularization opportunities, and synthesize a product direction that keeps citizen science central while making the experience more sandboxy, expandable, and engaging. Ground recommendations in existing game-design and specification docs plus current implementation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Current UI problems, inconsistencies, and modularization opportunities are documented
- [ ] #2 A concrete proposed modular UI/system architecture is defined for the main gameplay surfaces
- [ ] #3 A gameplay brainstorm is produced that keeps citizen science central while increasing creativity, sandbox potential, and long-term engagement
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit live UI surfaces (Earth base, launchpad, scanner, control station, mining, debrief, shell) against shared style/layout primitives and current screenshots.
2. Consolidate a modular UI architecture: reusable shells, cards, nav, status strips, action bars, overlay patterns, and safe-area/layout contracts.
3. Implement the first big UI pass on the highest-friction surfaces, prioritising consistency, readability, mobile fit, and shared component reuse.
4. Verify with existing UX tour/screenshots/tests and capture any residual risks or follow-up tasks.
5. Produce a product-direction brainstorm grounded in current Knowns docs/tasks: expand sandbox/creative play while keeping citizen science inseparable from progression.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started UI foundation: shared glass surface helpers plus launchpad/debrief readability pass.

✓ UI pass: scanner shell + list/detail dark-glass alignment; shared Earth nav helper/layout reused by base scenes, debrief, and space map

✓ UX tour run: confirmed launchpad header/widget overlap and bottom-nav clipping in space map + debrief; patched shared nav height/layout math and reserved launchpad top-left widget space

✓ UI pass: control station + new mission moved to shared dark-glass shell/cards; launch rows converted to reusable panel cards; full UX tour rerun clean (36 screenshots, 0 issues)

✓ UI pass: menu, subcontractors, mining practice, rocket selector, mission tracker, launchpad helper panels, asteroid preview, and support overlays aligned to shared glass shell; full UX tour rerun clean (36 screenshots, 0 issues)

✓ Reset-all fix: AppController now clears loan/runtime state, mission log, subcontractor progression, mechanic intro flags, intro splash flag, and narrative session cache; added reset helpers for mission log and subcontractors

✓ Reset-all corrected to restore fresh-player defaults: starter balance back to 10B, app-controller config wipe + scene reboot to Earth base, runtime mission/subcontractor state written directly to fresh defaults; added sync regression test covering reset flow (run_sync_tests: 7/7 pass)

✓ Moved Control Station out of Mission 1 and into a new Mission 2 build step: added persisted control_station_built state + migration/backfill, removed pre-instantiated ControlStation from earth_base_1.tscn, dynamically spawn/hide it from earth_base_1.gd, gated New Mission until built, added base build card CTA, darkened ControlStationPanel empty/card surfaces to fix pale text-on-light rendering; validated with run_tutorial_tests 7/7, run_sync_tests 7/7, run_mission_e2e_flow_tests 3/3, run_narrative_paths_tests 13/13

✓ Launchpad layout pass: removed the full-scene dark shell from LaunchpadSelectorPanel, shifted the status/launch dock out of the center lane, widened the clear pad gap, darkened selector panel defaults + contractor/target cards, and stopped completed-step section tinting from washing cards into pale white states; validated with run_tutorial_tests 7/7

✓ Launchpad coach moved to center lane in earth_launchpad; hardened launchpad template defaults + dark-card briefing styling; normalized selector muted text to on-dark; validated with git diff --check, tutorial 7/7, mission e2e 3/3, sync 7/7

✓ Launchpad selector root moved off VBoxContainer into manual free-layout geometry (v5); narrowed right rail + compact header/step rail. Fixed selector runtime type regression from Control root. Converted emergency loan dialog, base progression cards, and debrief/control-station templates to dark-glass defaults. Added headless-safe launchpad snapshot helper. Validated with git diff --check, tutorial 7/7, mission e2e 3/3, structure 27/27.
## Panel Redesign — 5 UI surfaces (branch: claude/redesign-control-panel-siBXM)
Redesigned all 5 panels scene-first (layout/colors/fonts in .tscn, scripts handle only data injection):

**1. ClassificationConsensusNotification** (dark sci-fi modal)
- Extends BaseDialogLayer; TargetClassificationCard template for each result
- Status bar: BUFFER_STATE / SYNCHRONIZING... / PROTOCOL_V_9.2 ●
- EXP_GAINED + RANK_STATUS row, ACKNOWLEDGE_RESULTS CTA
- Screenshot: user://ux_screenshots/panel_redesign/01_01_classification_results.png
- Task ref: #12x898

**2. MiningAcademyDialog** (light two-column)
- Left: trophy icon + pilot rank + debrief text
- Right: accuracy %, resources, last score stats card; training note with left-border accent
- BACK TO GAME button (dark teal)
- Screenshot: user://ux_screenshots/panel_redesign/02_02_mining_academy.png

**3. MechanicIntroOverlay** (light two-column)
- HeaderBar protocol label + coord label
- Left: overview + 2 stat cards + numbered steps
- Right: SchematicPanel with gear circle + stability/thermal ProgressBars
- ACKNOWLEDGE + COMMENCE BRIEFING buttons
- Screenshot: user://ux_screenshots/panel_redesign/03_03_mechanic_intro.png

**4. ControlStationPanel** (light dashboard + dark sidebar)
- Dark green sidebar with 5 nav icon buttons
- Light main area with horizontal mission cards (IN-ORBIT cyan badge / RETURNING green badge)
- Globe placeholder + FLEET OPERATIONAL status bar
- Screenshot: user://ux_screenshots/panel_redesign/04_04_control_station.png
- Task ref: #xh84lt

**5. FreeOpsUnlockOverlay** (full-screen light grid)
- TopBar telemetry readouts; SYSTEM STATE: UNRESTRICTED_ACCESS header
- 2×3 grid: SectorsCard, QueuesCard, AssetCard, GaugeCard (dark), PartnersCard, TelemetryCard
- LOGS + START RUN 🚀 buttons in BottomBar
- Screenshot: user://ux_screenshots/panel_redesign/05_05_free_operations.png
- Task ref: #ogipov

All 5 panels: PanelRedesignTour.tscn confirms 5/5 screenshots, 0 issues.
Dual-instance consensus test: run_consensus_dual_test.sh confirms PILOT_ALPHA+PILOT_BETA both receive notification simultaneously (exit 0 each).
<!-- SECTION:NOTES:END -->


---
id: 5ierg4
title: Fix ux-tour failures and perform scene/script hygiene sweep
status: in-progress
priority: high
labels:
  - godot
  - cleanup
  - ux-tour
  - tech-debt
createdAt: '2026-03-28T04:40:26.281Z'
updatedAt: '2026-04-02T11:40:30.838Z'
timeSpent: 0
assignee: '@me'
---
# Fix ux-tour failures and perform scene/script hygiene sweep

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Address all issues surfaced by make ux-tour, remove or disable broken UX-tour blockers, audit oversized GDScript and duplicate/dead scene candidates, and move UI/button structure out of runtime code into scene files where appropriate. Context: @doc/specs/godot-hygiene-sweep-plan @doc/dev/scene-vs-script-refactoring-guide @doc/specs/in-scene-button-handbook
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 make ux-tour completes without current blocking errors and key UX-tour issues are either fixed or explicitly downgraded to non-blocking warnings
- [ ] #2 High-confidence runtime-created UI/button nodes are moved to scene files or documented as intentionally dynamic
- [ ] #3 Oversized/duplicate/dead scene or script candidates are identified, with safe removals/refactors completed or follow-up recommendations documented
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit recurring UI hygiene issues across active scenes: oversized translucent docks, runtime-built UI/dialogs, placeholder empty states, and panels relying on scroll/overflow to fit.
2. Refactor high-confidence runtime-built UI into .tscn-backed scenes for overlays/splashes/dialogs still created in code, starting with Earth base overlays, intro/mechanic overlays, and remaining debrief/preview shells.
3. Normalize active panel layouts across launchpad, control, satellite, menu, preview, and detail flows so side docks are bounded, center content remains visible, and empty states use proper scene/card composition.
4. Run targeted screenshot/test validation and fix-forward until the recurring issue class is removed or safely documented as intentionally dynamic.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-03-28
- Disabled missing ziva_agent GDExtension in Docker UX tour temp copy so Godot imports/runs cleanly on Linux.
- Restored first-visit tutorial coach runtime and removed Launchpad missing-button warning.
- Moved TutorialCoachOverlay CTAs and SidescrollMining handbook UI from runtime-created nodes into .tscn scenes.
- Moved LaunchHUD ownership into earth_launchpad.tscn instead of instancing from LaunchpadScene.gd.
- Fixed rocket_transit stylebox misreferences, AsteroidDetail image helper parent type, MissionDebriefV2 button/title naming, and mining label overlap.
- Latest completed ux_report dropped to 4 issues; subsequent reruns showed those debrief/mining issues cleared and exposed RocketSelector anchor warning plus handbook-button overlap, both now patched.
- Remaining work: capture one final fully completed make ux-tour report after the last two patches, then close task if clean.

✓ ux-tour now passes with 0 issues
✓ Launchpad title + mining handbook overlap + asteroid detail overflow fixed
✓ Added web mobile PWA touch-control detection for mining on-screen controls

✓ Debrief compacted into icon-led card layout with no vertical scroll in ux-tour
✓ Shared Nebula panel/button surfaces lightened across the game
✓ Early starter contractor orders reduced to realistic mining quantities

→ Working Creative ticket ex77py: Satellite Station populated anomaly list design implementation

✓ Creative ex77py: Satellite Station scan summary card + populated anomaly card hierarchy implemented; ux-tour still 0 issues

✓ Satellite Station redesigned to a light scan-console theme; Phase 6 ux screenshot no longer blocked by scanner intro overlay; cleaned DB <null> placeholders; guarded Supabase async callback against freed-scene race

✓ RocketSelector dialogs moved from runtime-created .gd nodes into RocketSelectorOverlay.tscn; created Creative tickets 514sxa (Control Station), qya25w (Launchpad mission setup), mrtgdj (Earth base post-debrief progression); Supabase callback guard patched after async null-instance error

✓ UX tour green after scene-shell cleanup + Supabase callback guard

✓ Pushed 4f0d5e8; new Creative tickets: 8lg606, 1e0tq9, eyvohz

✓ Early-game economy retuned: M2 full mine+scrap now ~1.2x SR2; onboarding payout calibration now applied in MissionDebriefV2.
✓ Archived unreferenced scene/template/example assets to scene/Archive instead of deleting: FrancIcon, hud, StyledPanelBase, ControlStationOrbitingRow, ControlStationMissionHighlightCard, ControlStationRoadmapCard, earth_base_example.
✓ Updated stale structure/mining tests to match current mission/scanner progression and single-run early-economy target. Validation: run_mining_tests + run_structure_tests pass in Docker.

✓ Moved MechanicIntroOverlay, PlanetHuntersIntroSplash, and level-up notification shells into scene-owned .tscn files; scripts now bind content/behavior only.
✓ Moved SatelliteStation build/info dialogs into earth_base_1.tscn; removed runtime dialog creation from SatelliteStation.gd.
✓ Validation: run_structure_tests passes after scene-backed overlay/dialog refactor.

✓ Moved AsteroidPreview fuel-depletion salvage/retry dialog into asteroid_preview.tscn; script now binds message + button behavior only.
✓ Moved SpaceMap solar/stars toggle into space_map.tscn; removed runtime toggle button construction from SpaceMap.gd.
✓ Validation: run_structure_tests passes after AsteroidPreview + SpaceMap scene-backed UI extraction.

✓ Debrief templates moved into scenes: MissionDebriefSummaryCard, MissionDebriefSectionCard, MissionDebriefPayoutCard; MissionDebriefV2 now binds scene-owned summary/goal/cargo/payout cards
✓ GameNavigationMenu root shell moved into scene: GameNavigationMenuRoot.tscn; script now instantiates/wires scene-owned backdrop/panel/header/buttons
✓ Validation: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd (24 passed)

✓ GameNavigationMenu overlays moved to scene shell: GameNavigationOverlay.tscn now owns backdrop/panel/header/subtitle/scroll/close chrome for logbook + discoveries
✓ GameNavigationMenu.gd now binds scene-owned overlay nodes instead of building both overlays from scratch
✓ Validation: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd (24 passed)

✓ Earth base popup batch moved to scenes: StarterRocket2UnlockOverlay, FreeOpsUnlockOverlay, EmergencyLoanOfferDialog, ClassificationConsensusNotification
✓ Earth base nav background + progression cards moved to scene-owned structure; EarthBaseActionCard template now backs mission/star-map cards
✓ Validation: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd (24 passed)

✓ Launchpad selector repeated card shells moved to scenes: LaunchpadContractorCard + LaunchpadTargetInfoCard now back contractor selection and target-info UI
✓ GameNavigationMenu stats/progress cards moved to scenes: GameMenuStatsCard + GameMenuProgressCard
✓ Validation: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd (24 passed)

✓ GameNavigationMenu inventory + mission-requirement rows now reuse ResourceValueRow scene template
✓ Launchpad open-operation mode picker now reuses scene-owned LabelActionRow shell instead of raw HBox/Button construction
✓ Validation: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd (24 passed)

✓ GameNavigationMenu unlock list now reuses MenuUnlockHeader/MenuUnlockItem scene templates
✓ Launchpad mission briefing now uses scene-owned LaunchpadMissionBriefingCard template instead of code-built briefing shell
✓ Validation: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd (24 passed)

✓ Fixed repeated dark-panel contrast issue: added dark-surface text helpers in PanelStyle and dark-surface detection in UIConsistencyEnforcer
✓ TutorialCoachOverlay now uses explicit high-contrast dark-panel typography; dark Earth-base popups and dark launchpad cards updated to match
✓ Validation: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd (24 passed)

✓ Launchpad stage widened to near full-width; contractor dock widened; rocket dock pushed to display edge; structure tests green

✓ Launchpad now runs base Earth scene init and has shared bottom nav; added bottom nav shell to Space Map and Mission Debrief; mining/travel scenes left untouched; structure tests green

✓ Normalized shared bottom nav to Earth-base sizing/full-width anchoring; launchpad now uses scene-owned NavBackground; reset-all hardened with AppController/UIManager fallbacks

✓ Launchpad selector rebuilt around floating left/right docks + centered bottom action rail; removed outer selector shell border; using full viewport rect for placement
<!-- SECTION:NOTES:END -->


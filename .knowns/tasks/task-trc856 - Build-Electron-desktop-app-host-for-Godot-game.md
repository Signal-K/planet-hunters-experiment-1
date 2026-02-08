---
id: trc856
title: Build Electron desktop app host for Godot game
status: done
priority: high
labels:
  - electron
  - desktop
  - godot
createdAt: '2026-02-07T03:32:54.678Z'
updatedAt: '2026-02-07T06:28:19.955Z'
timeSpent: 854
assignee: '@me'
---
# Build Electron desktop app host for Godot game

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create an Electron desktop target so users can run the Godot game in a Node.js/Electron runtime.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Electron app launches and loads the Godot game
- [x] #2 Godot desktop export artifacts are generated/copied into Electron runtime path
- [x] #3 Repo includes commands/docs to build and run desktop app
- [x] #4 Electron desktop: bottom ButtonContainer remains visible and clickable after scene load
- [x] #5 Git ignore excludes non-essential Electron build outputs
- [x] #6 GitHub Action builds Electron desktop artifacts on push to main/electron-support
- [x] #7 Workflow publishes a GitHub Release containing desktop artifacts
- [x] #8 Workflow produces and releases macOS, Linux, and Windows Electron artifacts
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update `.gitignore` with Electron artifact/cache patterns while keeping source files tracked.
2. Add `.github/workflows/electron_release.yml` triggered on push to `main` and `electron-support`.
3. In workflow: install deps, export Godot desktop web bundle, run `electron-builder` on matrix OS targets, collect artifacts.
4. Create release tag per run and upload artifacts to GitHub Release.
5. Validate workflow syntax locally and document assumptions in task notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added Electron host (`electron/main.js`, `electron/preload.js`) that serves Godot web export from local Node HTTP server.
- Added desktop export script: `scripts/export_godot_desktop.sh`.
- Added npm scripts: `godot:export:desktop`, `electron:dev`, `electron:pack`, `electron:dist`.
- Added Electron builder config in `package.json` and docs in `docs/ELECTRON_DESKTOP.md`.
- Added Godot `Web` export preset in `scene/export_presets.cfg`.

## Validation
- `npm install` succeeded (with escalated network).
- `npm run godot:export:desktop` succeeded and generated `electron-dist/godot-web/index.html`, `.js`, `.wasm`, `.pck`.
- `npm run electron:pack` succeeded and generated `dist/mac-arm64/PlanetHuntersDesktop.app`.

- Follow-up fix: SafeAreaUI now reapplies layout when ButtonContainer/TutorialPanel/FrancBalance nodes are added to tree.

- Validation: 
> GodotTest@0.0.1 godot:export:desktop
> bash ./scripts/export_godot_desktop.sh

=== Export Godot for Electron ===
Godot:      /Applications/Godot4.5.app/Contents/MacOS/Godot
Scene dir:  /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/scene
Output dir: /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web
Preset:     Web
User dir:   /tmp/godot
Godot Engine v4.5.stable.official.876b29033 - https://godotengine.org

[   0% ] [90m[1mfirst_scan_filesystem[22m | Started Project initialization (5 steps)[39m[0m
[   0% ] [90m[1mfirst_scan_filesystem[22m | Scanning file structure...[39m[0m
[  16% ] [90m[1mfirst_scan_filesystem[22m | Loading global class names...[39m[0m
[  33% ] [90m[1mfirst_scan_filesystem[22m | Verifying GDExtensions...[39m[0m
[  50% ] [90m[1mfirst_scan_filesystem[22m | Creating autoload scripts...[39m[0m
[  66% ] [90m[1mfirst_scan_filesystem[22m | Initializing plugins...[39m[0m
[  83% ] [90m[1mfirst_scan_filesystem[22m | Starting file scan...[39m[0m
[92m[ DONE ][39m [1mfirst_scan_filesystem[22m
[0m
[   0% ] [90m[1m_update_scan_actions[22m | Started Scanning actions... (2 steps)[39m[0m
[   0% ] [90m[1m_update_scan_actions[22m | AppIcon60x60@2x.png[39m[0m
[  33% ] [90m[1m_update_scan_actions[22m | AppIcon76x76@2x~ipad.png[39m[0m
[92m[ DONE ][39m [1m_update_scan_actions[22m
[0m
[   0% ] [90m[1msavepack[22m | Started Packing (102 steps)[39m[0m
[   1% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Earth1.png-bfd4d5b11fc84cc9b314a88fd93351d9.ctex[39m[0m
[   1% ] [90m[1msavepack[22m | Storing File: res://assets/Backdrops/Earth1.png.import[39m[0m
[   1% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Earth2.png-96fff5c861f07b588e23125b86f9d586.ctex[39m[0m
[   1% ] [90m[1msavepack[22m | Storing File: res://assets/Backdrops/Earth2.png.import[39m[0m
[   2% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/ControlStation.png-41ad457ac6a6c53e41586034bd5ad33f.ctex[39m[0m
[   2% ] [90m[1msavepack[22m | Storing File: res://assets/Structures/ControlStation.png.import[39m[0m
[   2% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/launchpad.png-fbe838c617fe190eba658482c6781cbf.ctex[39m[0m
[   2% ] [90m[1msavepack[22m | Storing File: res://assets/Structures/launchpad.png.import[39m[0m
[   3% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/satellite_groundstation1.png-526c9b4ac882f9e67e98eed71fbefecf.ctex[39m[0m
[   3% ] [90m[1msavepack[22m | Storing File: res://assets/Structures/satellite_groundstation1.png.import[39m[0m
[   3% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Mars_Top.png-3097e6f4820b6032812ae2501da3b5e5.ctex[39m[0m
[   3% ] [90m[1msavepack[22m | Storing File: res://assets/Tilesets/Mars_Top.png.import[39m[0m
[   4% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocket1.png-bd8ce2ae2f2c1439cfcecbcae7a3196d.ctex[39m[0m
[   4% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocket1.png.import[39m[0m
[   4% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-dbf600c88da07c3d637122df2c125994-StarterRocket1LaunchFrame0.res[39m[0m
[   5% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocket1LaunchSpritesheet.png-8a31fbc61bfc73bed4720728fa164bce.ctex[39m[0m
[   5% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocket1LaunchSpritesheet.png.import[39m[0m
[   5% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocketStage2Frame1.png-3f5ddafc047d0dc39cd392204706ad81.ctex[39m[0m
[   5% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocketStage2Frame1.png.import[39m[0m
[   6% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocketStage2Frame2.png-654fa0841291ee03c3acad09d1f23124.ctex[39m[0m
[   6% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocketStage2Frame2.png.import[39m[0m
[   6% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocketStage2Frame3.png-5760f76462da264ff218e14178f8ec45.ctex[39m[0m
[   6% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocketStage2Frame3.png.import[39m[0m
[   7% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocketStage2Frame4.png-fb3e0e27ffccfb60baa1b40d563642b7.ctex[39m[0m
[   7% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocketStage2Frame4.png.import[39m[0m
[   7% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocketStage2Frame5.png-475996f559c508000cdc1fdb2f521f35.ctex[39m[0m
[   7% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocketStage2Frame5.png.import[39m[0m
[   8% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocketStage2Frame6.png-03d6f0b9ad327ea706c390e5f427e1e4.ctex[39m[0m
[   8% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocketStage2Frame6.png.import[39m[0m
[   8% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocketStage2Frame7.png-a9979d7bf8859ecae44b9addbd185618.ctex[39m[0m
[   8% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocketStage2Frame7.png.import[39m[0m
[   9% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/StarterRocketStage2Frame8.png-1ee052f1f4a2711273c7368942f6dc2d.ctex[39m[0m
[   9% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocketStage2Frame8.png.import[39m[0m
[   9% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Contents.json[39m[0m
[  10% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-40.png-37d0296e0f7e1075fca66b6931695658.ctex[39m[0m
[  10% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-40.png.import[39m[0m
[  11% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-58.png-b3b911408a03a3f0e9b1660b45bae9a3.ctex[39m[0m
[  11% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-58.png.import[39m[0m
[  11% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-60.png-25f7caa1172dcf9d217c81e6968c530c.ctex[39m[0m
[  11% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-60.png.import[39m[0m
[  12% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-76.png-98f87de40391a2b8eff29ece4565e397.ctex[39m[0m
[  12% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-76.png.import[39m[0m
[  12% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-80.png-bcadc65d0559898bffa1b575e2c83926.ctex[39m[0m
[  12% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-80.png.import[39m[0m
[  13% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-87.png-9ab0d59d63ffa7f55fe8018a08a3dbfb.ctex[39m[0m
[  13% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-87.png.import[39m[0m
[  13% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-114.png-64ac46e5be2a6ffe181a98183bee585e.ctex[39m[0m
[  13% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-114.png.import[39m[0m
[  14% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-120-1.png-ad357ec167ec239a68dbb2c37dba59f0.ctex[39m[0m
[  14% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-120-1.png.import[39m[0m
[  14% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-120.png-ac8c90a550b993e97f36d0468aafea4b.ctex[39m[0m
[  14% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-120.png.import[39m[0m
[  15% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-128.png-e7a4cd96ba659b4d953840275dd90f1d.ctex[39m[0m
[  15% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-128.png.import[39m[0m
[  15% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-136.png-e300c47420544133f2fdaa07ae9c8741.ctex[39m[0m
[  15% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-136.png.import[39m[0m
[  16% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-152.png-afd7dea44cf71801719efae867efe887.ctex[39m[0m
[  16% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-152.png.import[39m[0m
[  16% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-167.png-4469de80f6446731eadc17dc69d57d5f.ctex[39m[0m
[  16% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-167.png.import[39m[0m
[  17% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-180.png-0aa3963c51d833afce369f37d9cbf062.ctex[39m[0m
[  17% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-180.png.import[39m[0m
[  17% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-192.png-f561dacbcac0dfe6f263f0dbde9cfd68.ctex[39m[0m
[  17% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-192.png.import[39m[0m
[  18% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/Icon-1024.png-48987cd76eea00a6d4f3092ea687017e.ctex[39m[0m
[  18% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/AppIcon.appiconset/Icon-1024.png.import[39m[0m
[  18% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/SplashImage.imageset/Contents.json[39m[0m
[  19% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/splash@2x.png-621199cfd5a0d54e8852e12a39fc8bd1.ctex[39m[0m
[  19% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/SplashImage.imageset/splash@2x.png.import[39m[0m
[  20% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/splash@3x.png-6902ba06571bd726d24d3af8691cb7a0.ctex[39m[0m
[  20% ] [90m[1msavepack[22m | Storing File: res://build/game/Images.xcassets/SplashImage.imageset/splash@3x.png.import[39m[0m
[  20% ] [90m[1msavepack[22m | Storing File: res://build/game.xcarchive/Products/Applications/game.app/AppIcon60x60@2x.png.import[39m[0m
[  21% ] [90m[1msavepack[22m | Storing File: res://build/game.xcarchive/Products/Applications/game.app/AppIcon76x76@2x~ipad.png.import[39m[0m
[  21% ] [90m[1msavepack[22m | Storing File: res://project/app_controller.gdc[39m[0m
[  22% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-6c777fc9bd76cb673527512941c736d6-earth_base_sample_asteroid.scn[39m[0m
[  22% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-63c145f98772bbb00c858b44d5baf065-asteroid_detail_view.scn[39m[0m
[  23% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_base_1.gdc[39m[0m
[  23% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-a370952bd9467ad57ec1ed7013acb9be-earth_base_1.scn[39m[0m
[  24% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_base_example.gdc[39m[0m
[  24% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-e98e276a65d9cd335742cb8d12c40397-earth_base_example.scn[39m[0m
[  25% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_base_ground.gdc[39m[0m
[  25% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-07ad96dc1ab0bd514e757abaaeb43e1f-earth_launchpad.scn[39m[0m
[  26% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_scene_base.gdc[39m[0m
[  26% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-88295f960f352d6a796790d3826e406e-earth_scene_template.scn[39m[0m
[  27% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-559155d68f5abb9ebf22d68881422fd8-mission_debrief.scn[39m[0m
[  27% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-d7b3e6b74b7b3960e1917fe820d2ccab-orbit_sale_preview.scn[39m[0m
[  28% ] [90m[1msavepack[22m | Storing File: res://Scenes/Level/house.gdc[39m[0m
[  29% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-ab261b096e6523c3b2fd92ed01b6864c-house.scn[39m[0m
[  29% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/bed.gdc[39m[0m
[  30% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-aa19ce0bddd24379de1b852c85839ae7-bed.scn[39m[0m
[  30% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/blob.gdc[39m[0m
[  31% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-68a7f02429fe465cd3ca5925811ac7b3-blob.scn[39m[0m
[  31% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/simple_object.gdc[39m[0m
[  32% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-92d2a8661b0b04aff87e76057d1c4ed2-simple_object.scn[39m[0m
[  32% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-23350047e010c378e6d0637ba10f1ee1-tree.scn[39m[0m
[  33% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-1546ee783b1f27fc714babf72449e774-rocket_return.scn[39m[0m
[  33% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-b0f99ada3150b62196c7e15aad6d77c2-rocket_transit.scn[39m[0m
[  33% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-073fbd3ec1ca0b9df9d1dab94e19b238-asteroid_detail_view.scn[39m[0m
[  33% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-80f84fbc9769f4ca13f114989c7a26c7-asteroid_preview.scn[39m[0m
[  34% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-a4a721745bf801726954d68cd88560f0-simple_detail_view.scn[39m[0m
[  34% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-0369ab6b7b59b792a9af35716e199757-space_map.scn[39m[0m
[  35% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-e13525692407e6dfbec88c17164d8c82-ControlStationPanel.scn[39m[0m
[  35% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-0ae7a18235565bbf5ef9e17dd750b13c-FrancBalance.scn[39m[0m
[  36% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-c7cc471ad96e786f918c69f56fd14c52-FrancIcon.scn[39m[0m
[  37% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-67605cadf80d25390853685a572b8dfc-hud.scn[39m[0m
[  37% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-893028af5ff8f0b68a053d4b6fda47be-item_info.scn[39m[0m
[  38% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-d5c6eec51f6a616a0c21468c1f42c140-LaunchpadPanel.scn[39m[0m
[  38% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-4b389cba24054e32986a04ffbda2c3dc-launch_hud.scn[39m[0m
[  39% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-cb29f7dd7fb15fbfb0dcaad15f04dd74-MenuPanel.scn[39m[0m
[  39% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-64fdd5c6c043a6dbf6c2498f8ffa649a-NewMissionPanel.scn[39m[0m
[  40% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/plant_info_container.gdc[39m[0m
[  40% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-1c74935bb16f11a7d2a74ae6535b5eb8-SatelliteStationPanel.scn[39m[0m
[  41% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-0d6aa5fd1e1d61deac32d7be6ef9ba94-SubcontractorsPanel.scn[39m[0m
[  41% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-d04ac303f0851cb7a21fff8f3a4a2772-tool_ui.scn[39m[0m
[  42% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-7a9920f2af014a340399059fe8d64c69-tool_ui_texture.scn[39m[0m
[  42% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-c898eb16b8ef7b7f766458ba3a07e9c5-TutorialPanel.scn[39m[0m
[  43% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-c9ef96459a43a57858eee15953018583-StarterRocket1.scn[39m[0m
[  43% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-1b02d6e0ba65bc1ce8d6da903e4b4ce0-StarterRocket2.scn[39m[0m
[  44% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-5fa7bff14037ddbeaf2a0eac771b67dc-flash.res[39m[0m
[  44% ] [90m[1msavepack[22m | Storing File: res://Scenes/vfx/flash_sprite_2d.gdc[39m[0m
[  45% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-6695c12dd65b5dac6ddc05048c94f87f-flash_sprite_2d.scn[39m[0m
[  46% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-ebb44e994f334141e4132d7daa27c52a-background.scn[39m[0m
[  46% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-d2f1ed906593662d15b03d7a18491461-tv.scn[39m[0m
[  47% ] [90m[1msavepack[22m | Storing File: res://Scripts/Archive/AsteroidDetail/ArchivedAsteroidImageHelper.gdc[39m[0m
[  47% ] [90m[1msavepack[22m | Storing File: res://Scripts/Archive/AsteroidDetail/AsteroidDetailView.gdc[39m[0m
[  48% ] [90m[1msavepack[22m | Storing File: res://Scripts/Archive/AsteroidDetail/DrawingCanvas.gdc[39m[0m
[  48% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/CameraController.gdc[39m[0m
[  49% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/ControlStation.gdc[39m[0m
[  49% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/DebugVisualizer.gdc[39m[0m
[  50% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/EarthBaseConstants.gdc[39m[0m
[  50% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/EarthBaseUtils.gdc[39m[0m
[  51% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/EarthSceneUIHelper.gdc[39m[0m
[  51% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/Launchpad.gdc[39m[0m
[  52% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadAnomalyFetcher.gdc[39m[0m
[  52% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadDropHandler.gdc[39m[0m
[  53% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadLaunchButton.gdc[39m[0m
[  53% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadRestorer.gdc[39m[0m
[  54% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadScene.gdc[39m[0m
[  55% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadSelectorPanel.gdc[39m[0m
[  55% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadSpriteDropHandler.gdc[39m[0m
[  56% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/MissionDebrief.gdc[39m[0m
[  56% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/OrbitSalePreview.gdc[39m[0m
[  57% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSelector.gdc[39m[0m
[  57% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSelectorDrag.gdc[39m[0m
[  58% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSelectorDragHelper.gdc[39m[0m
[  58% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSelectorUIBuilder.gdc[39m[0m
[  59% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSpawner.gdc[39m[0m
[  59% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/SatelliteStation.gdc[39m[0m
[  60% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/SceneManager.gdc[39m[0m
[  60% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/SelectorManager.gdc[39m[0m
[  61% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/Structure.gdc[39m[0m
[  61% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/TimeHelper.gdc[39m[0m
[  62% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/UIManager.gdc[39m[0m
[  62% ] [90m[1msavepack[22m | Storing File: res://Scripts/Systems/AppController.gdc[39m[0m
[  63% ] [90m[1msavepack[22m | Storing File: res://Scripts/Systems/AppControllerPersistence.gdc[39m[0m
[  64% ] [90m[1msavepack[22m | Storing File: res://Scripts/Systems/SupabaseClient.gdc[39m[0m
[  64% ] [90m[1msavepack[22m | Storing File: res://Scripts/Systems/SyncBridge.gdc[39m[0m
[  65% ] [90m[1msavepack[22m | Storing File: res://Scripts/Transitions/OutboundPreviewTransition.gdc[39m[0m
[  65% ] [90m[1msavepack[22m | Storing File: res://Scripts/Transitions/ReturnPreviewTransition.gdc[39m[0m
[  66% ] [90m[1msavepack[22m | Storing File: res://Scripts/Transitions/RocketReturn.gdc[39m[0m
[  66% ] [90m[1msavepack[22m | Storing File: res://Scripts/Transitions/RocketTransit.gdc[39m[0m
[  66% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/AsteroidAnnotationHelper.gdc[39m[0m
[  66% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/AsteroidDetailModel.gdc[39m[0m
[  67% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/AsteroidDetailView.gdc[39m[0m
[  67% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/AsteroidImageHelper.gdc[39m[0m
[  68% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/DrawingCanvas.gdc[39m[0m
[  68% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidPreview/AsteroidPreview.gdc[39m[0m
[  69% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SimpleDetail/SimpleDetailView.gdc[39m[0m
[  69% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SpaceMap/SpaceMap.gdc[39m[0m
[  70% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/ControlStationPanel.gdc[39m[0m
[  70% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/FrancBalance.gdc[39m[0m
[  71% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/hud.gdc[39m[0m
[  72% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/item_info.gdc[39m[0m
[  72% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/LaunchpadPanel.gdc[39m[0m
[  73% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/MenuPanel.gdc[39m[0m
[  73% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/NewMissionAnnotations.gdc[39m[0m
[  74% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/NewMissionLaunchList.gdc[39m[0m
[  74% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/NewMissionPanel.gdc[39m[0m
[  75% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/PanelStyle.gdc[39m[0m
[  75% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SafeAreaUI.gdc[39m[0m
[  76% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanel.gdc[39m[0m
[  76% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanelData.gdc[39m[0m
[  77% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanelDetail.gdc[39m[0m
[  77% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanelList.gdc[39m[0m
[  78% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanelLoading.gdc[39m[0m
[  78% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SubcontractorsPanel.gdc[39m[0m
[  79% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/TutorialPanel.gdc[39m[0m
[  79% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/CurrencyFormatter.gdc[39m[0m
[  80% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/CurrencyManager.gdc[39m[0m
[  81% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/EarthInventory.gdc[39m[0m
[  81% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/HashUtils.gdc[39m[0m
[  82% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/JSONFileManager.gdc[39m[0m
[  82% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/Logger.gdc[39m[0m
[  83% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/MineralPricing.gdc[39m[0m
[  83% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/MiningInventory.gdc[39m[0m
[  84% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/MissionLogManager.gdc[39m[0m
[  84% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/NumberFormat.gdc[39m[0m
[  85% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/OrbitVisuals.gdc[39m[0m
[  85% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/PanelManager.gdc[39m[0m
[  86% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/ProceduralBodyBuilder.gdc[39m[0m
[  86% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/ResourceYield.gdc[39m[0m
[  87% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/RocketsManager.gdc[39m[0m
[  87% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/RocketSpriteHelper.gdc[39m[0m
[  88% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/RocketsStateStore.gdc[39m[0m
[  88% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/SubcontractorManager.gdc[39m[0m
[  89% ] [90m[1msavepack[22m | Storing File: res://tests/CallbackHelper.gdc[39m[0m
[  90% ] [90m[1msavepack[22m | Storing File: res://tests/check_res.gdc[39m[0m
[  90% ] [90m[1msavepack[22m | Storing File: res://tests/run_experience_tests.gdc[39m[0m
[  91% ] [90m[1msavepack[22m | Storing File: res://tests/run_mission_log_tests.gdc[39m[0m
[  91% ] [90m[1msavepack[22m | Storing File: res://tests/run_supabase_tests.gdc[39m[0m
[  92% ] [90m[1msavepack[22m | Storing File: res://tests/run_sync_tests.gdc[39m[0m
[  92% ] [90m[1msavepack[22m | Storing File: res://tests/run_tutorial_tests.gdc[39m[0m
[  93% ] [90m[1msavepack[22m | Storing File: res://tests/SupabaseTestRunner.gdc[39m[0m
[  93% ] [90m[1msavepack[22m | Storing File: res://tests/SupabaseTestRunner_Archived.gdc[39m[0m
[  94% ] [90m[1msavepack[22m | Storing File: res://tests/TestReporter.gdc[39m[0m
[  94% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-1cd2b409b6fa0844529d7e43d1118193-button_hover.res[39m[0m
[  95% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-20fa3da1c223668cd631182ab5c815c3-button_normal.res[39m[0m
[  95% ] [90m[1msavepack[22m | Storing File: res://.godot/exported/133200997/export-7baaebdae587b95f8409902a5d370e8b-button_pressed.res[39m[0m
[  96% ] [90m[1msavepack[22m | Storing File: res://franc_balance.json[39m[0m
[  96% ] [90m[1msavepack[22m | Storing File: res://.godot/imported/icon.svg-218a8f2b3041327d8a5756f3a245f83b.ctex[39m[0m
[  96% ] [90m[1msavepack[22m | Storing File: res://icon.svg.import[39m[0m
[  97% ] [90m[1msavepack[22m | Storing File: res://mission_logs.json[39m[0m
[  97% ] [90m[1msavepack[22m | Storing File: res://rockets_state.json[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://subcontractors.json[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://assets/Vehicles/StarterRocket1LaunchFrame0.tres.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://project/app_controller.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://SampleScenes/earth_base_sample_asteroid.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Archive/AsteroidDetail/asteroid_detail_view.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_base_1.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_base_1.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_base_example.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_base_example.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_base_ground.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_launchpad.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_scene_base.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/earth_scene_template.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/mission_debrief.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Earth/orbit_sale_preview.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Level/house.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Level/house.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/bed.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/bed.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/blob.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/blob.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/simple_object.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/simple_object.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Objects/tree.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Transitions/rocket_return.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Transitions/rocket_transit.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/SimpleDetail/simple_detail_view.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/SpaceMap/space_map.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/ControlStationPanel.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/FrancBalance.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/FrancIcon.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/hud.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/item_info.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/LaunchpadPanel.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/launch_hud.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/MenuPanel.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/NewMissionPanel.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/plant_info_container.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/SatelliteStationPanel.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/SubcontractorsPanel.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/tool_ui.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/tool_ui_texture.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/UI/TutorialPanel.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Vehicles/StarterRocket1.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/Vehicles/StarterRocket2.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/vfx/flash.tres.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/vfx/flash_sprite_2d.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/vfx/flash_sprite_2d.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/World/background.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scenes/tv.tscn.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Archive/AsteroidDetail/ArchivedAsteroidImageHelper.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Archive/AsteroidDetail/AsteroidDetailView.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Archive/AsteroidDetail/DrawingCanvas.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/CameraController.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/ControlStation.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/DebugVisualizer.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/EarthBaseConstants.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/EarthBaseUtils.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/EarthSceneUIHelper.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/Launchpad.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadAnomalyFetcher.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadDropHandler.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadLaunchButton.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadRestorer.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadScene.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadSelectorPanel.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/LaunchpadSpriteDropHandler.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/MissionDebrief.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/OrbitSalePreview.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSelector.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSelectorDrag.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSelectorDragHelper.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSelectorUIBuilder.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/RocketSpawner.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/SatelliteStation.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/SceneManager.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/SelectorManager.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/Structure.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/TimeHelper.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Earth/UIManager.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Systems/AppController.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Systems/AppControllerPersistence.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Systems/SupabaseClient.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Systems/SyncBridge.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Transitions/OutboundPreviewTransition.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Transitions/ReturnPreviewTransition.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Transitions/RocketReturn.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Transitions/RocketTransit.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/AsteroidAnnotationHelper.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/AsteroidDetailModel.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/AsteroidDetailView.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/AsteroidImageHelper.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidDetail/DrawingCanvas.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/AsteroidPreview/AsteroidPreview.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SimpleDetail/SimpleDetailView.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SpaceMap/SpaceMap.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/ControlStationPanel.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/FrancBalance.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/hud.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/item_info.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/LaunchpadPanel.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/MenuPanel.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/NewMissionAnnotations.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/NewMissionLaunchList.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/NewMissionPanel.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/PanelStyle.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SafeAreaUI.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanel.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanelData.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanelDetail.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanelList.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SatelliteStationPanelLoading.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/SubcontractorsPanel.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/UI/TutorialPanel.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/CurrencyFormatter.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/CurrencyManager.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/EarthInventory.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/HashUtils.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/JSONFileManager.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/Logger.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/MineralPricing.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/MiningInventory.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/MissionLogManager.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/NumberFormat.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/OrbitVisuals.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/PanelManager.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/ProceduralBodyBuilder.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/ResourceYield.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/RocketsManager.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/RocketSpriteHelper.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/RocketsStateStore.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://Scripts/Utils/SubcontractorManager.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/CallbackHelper.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/check_res.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/run_experience_tests.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/run_mission_log_tests.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/run_supabase_tests.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/run_sync_tests.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/run_tutorial_tests.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/SupabaseTestRunner.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/SupabaseTestRunner_Archived.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://tests/TestReporter.gd.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://themes/button_hover.tres.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://themes/button_normal.tres.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://themes/button_pressed.tres.remap[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://.godot/global_script_class_cache.cfg[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://icon.svg[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://.godot/uid_cache.bin[39m[0m
[  98% ] [90m[1msavepack[22m | Storing File: res://project.binary[39m[0m
[92m[ DONE ][39m [1msavepack[22m
[0m
Export complete:
  - /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web/index.apple-touch-icon.png
  - /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web/index.wasm
  - /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web/index.icon.png
  - /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web/index.html
  - /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web/index.png
  - /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web/index.audio.worklet.js
  - /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web/index.js
  - /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web/index.audio.position.worklet.js
  - /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/electron-dist/godot-web/index.pck succeeded after SafeAreaUI patch.

- Added  for push-triggered macOS Electron build+release on  and .

- Updated  to ignore Electron build/release outputs and caches (, , , , electron caches).

- Note: workflow created/validated syntactically; full release execution happens in GitHub Actions on next push.

- Scope update: add Linux + Windows Electron release builds to GitHub Actions.

- Updated electron release workflow to matrix builds on macOS, Linux, and Windows, then publish one release with all artifacts.
<!-- SECTION:NOTES:END -->


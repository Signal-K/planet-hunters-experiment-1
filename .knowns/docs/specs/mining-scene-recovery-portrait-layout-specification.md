---
title: Mining scene recovery + portrait layout specification
createdAt: '2026-03-06T23:34:48.437Z'
updatedAt: '2026-03-07T00:57:59.240Z'
description: >-
  Spec for fixing mining scene open issues, direct test entry, and portrait
  mobile reflow
tags:
  - spec
  - mining
  - godot
  - mobile
  - layout
---
# Mining Scene Recovery + Portrait Layout Specification

## Scope
- Recover Godot editor openability for mining-related scenes (starting with `res://Scenes/UI/MiningMinigame.tscn`).
- Guarantee direct developer access to side-scrolling mining test flow without full game/tutorial progression.
- Reorganize mining HUD/layout for portrait mobile web while preserving desktop usability.

## Non-Goals
- Rebalancing mining economy/difficulty.
- Full UI redesign outside mining flow.

## Functional Requirements
1. Scene-open reliability
- All ext_resource script/scene refs used by mining scenes resolve in-editor.
- Script parse/runtime errors from mining scene load path are removed.

2. Direct mining test entry
- At least one deterministic entry path from existing UI/dev controls into `SidescrollMining.tscn`.
- Entry path does not require tutorial completion or orbit progression.

3. Portrait mobile reflow
- In portrait orientation on mobile web, mining HUD stacks/repositions to keep critical controls visible:
  - Fire/interaction control
  - Fuel/heat/readouts
  - Exit/return control
- Touch targets remain usable and do not overlap core gameplay viewport.

## Validation
- Open affected scenes in Godot editor without load error dialogs.
- Trigger direct mining entry path and confirm scene starts immediately.
- Verify portrait layout manually in web/mobile viewport and ensure no blocking overlaps.


## Follow-up: HUD Density + Off-screen Risk
- Reduce in-run text volume and avoid duplicated instructional copy in mining HUD.
- Suppress external tutorial overlays while mining scene is active to avoid stacked guidance panels.
- Ensure room/status panels remain fully visible within viewport bounds (desktop and portrait mobile).


## Follow-up: Target-aware Visual Themes
- Mining scene color palette should adapt by target type (asteroid, planet, fallback).
- Palette adaptation applies to terrain texture/outline and scene background tint for coherent pixel-art look.

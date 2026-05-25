---
id: fmq4vk
title: 'Epic: Portrait Mode — Godot scene redesign for mobile'
status: todo
priority: high
labels:
  - portrait-mode
  - epic
  - mobile
  - react
  - design
createdAt: '2026-05-25T09:10:18.711Z'
updatedAt: '2026-05-25T09:16:30.936Z'
timeSpent: 0
---
# Epic: Portrait Mode — Godot scene redesign for mobile

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Redesign the existing Godot scenes to work in portrait orientation on mobile. No device rotation required. Same game, same flow (M1–M4 tutorial, mission loop, mining minigame), same Supabase/PostHog backend. The visual target is the Landnam portrait design system — dark navy command deck, Oxanium/Turret Road type, cyan/amber palette. Design reference (React prototype for visual spec): portrait/ directory in the repo.

Key changes:
1. Remove landscape-only orientation lock from the app wrapper
2. Redesign UILayout.gd zones for portrait (top HUD, scrollable center, bottom nav)
3. Adapt each major scene's node tree for portrait layout
4. Apply the design token palette (DS.gd / NebulaSciTheme.gd)
5. Docker + Playwright visual harness for regression testing

Scenes in scope: earth_base_1, ControlStationPanel, LaunchWizard, LaunchWizardMapStep, SidescrollMining, TutorialCoachOverlay.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->


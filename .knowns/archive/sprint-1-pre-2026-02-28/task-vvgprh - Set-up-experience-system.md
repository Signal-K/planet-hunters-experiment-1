---
id: vvgprh
title: Set up experience system
status: done
priority: medium
labels:
  - Experience
  - Research
  - Launch
  - Data
createdAt: '2026-01-25T01:36:27.595Z'
updatedAt: '2026-02-25T08:45:18.941Z'
timeSpent: 2225
assignee: '@Liam'
---
# Set up experience system

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Basically, a global system that allows users to unlock things.

To start with, the only thing that will be unlocked will be new rockets.

We'll say that launches, scans are the two types of things that add experience to the user's profile for now. Annotation and landing, mission completions etc can come later.

Speaking of, custom missions and generated missions (like in TSP, but in slightly more of a sandbox method) are something I'd like to explore later (probably next month).
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review Godot/RN state sync patterns (AppController, utils/godot.ts, AsyncStorage) and identify XP integration points (launch + scan).
2. Add experience state + persistence in Godot AppController, with helpers to add XP and evaluate rocket unlocks from a small config.
3. Wire XP awards into launch flow and scan completion, and update RocketsManager unlock list when thresholds reached.
4. Extend React Native shared state + sync queue to load/save experience (AsyncStorage) and push to Godot on game start.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Test

```js

test

```



Spec Reference: @doc/specs/level-progression-and-unlocks-specification
<!-- SECTION:NOTES:END -->


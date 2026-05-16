---
title: 'Godot Architecture Audit & Refactoring Roadmap'
description: Comprehensive audit of the Landnam Godot codebase with recommendations for state management and refactoring.
createdAt: '2026-05-14T00:32:05.378Z'
updatedAt: '2026-05-14T00:54:58.455Z'
tags:
  - project-landnam
  - godot
  - architecture
---

# Godot Architecture Audit & Refactoring Roadmap

## Executive Summary
This document outlines the architectural technical debt within the Landnam Godot project and proposes a multi-phase refactoring strategy to decentralize 'God Objects' and move toward a more robust, resource-based state management system.

## The Core Problem: Monolithic Governance
The current architecture relies on a 'Centralized Controller' pattern that has outgrown its utility.

### 1. AppController.gd (The God Object)
- **Problem**: It handles at least 6 distinct domains: UI Window Management, Tutorial State, Player Progression (XP/Level), Economy (Francs/Loans), Bridge Communication, and Scene Transitions.
- **Impact**: Any change to one system (e.g., adding a new currency type) requires modifying this 800-line file, increasing the risk of side effects.
- **Example**: `_ensure_tutorial_runtime()` and `_ensure_feedback_beacon()` live alongside `get_last_mining_result()`.

### 2. RocketsManager.gd (The Monolith)
- **Problem**: At 2700+ lines, it is a 'Kitchen Sink' for the mission system. It contains hardcoded Data Specs (Rocket types, distance bands), Mission Logic (Objective resolution), and Persistence (JSON file handling).
- **Impact**: Navigating or testing the mission logic is nearly impossible because it is deeply entwined with static data.

## Proposed Architectural Shifts

### Decision Point 1: Resource-Based vs. Singleton State
- **Option A (Current)**: Autoloads with primitive variables (`var experience_xp: int`).
- **Option B (Proposed)**: Custom `Resource` files (e.g., `PlayerProfile.res`).
- **Recommendation**: Move to **Option B**. Resources allow for built-in serialization, easy inspection in the editor, and 'Snapshot' captures for the React Native bridge.

### Decision Point 2: Signaling Strategy
- **Option A (Current)**: Direct signal connections (`AppController.counter_updated.connect(...)`).
- **Option B (Proposed)**: Global `EventBus` for cross-domain events.
- **Recommendation**: Use an **EventBus** for high-level events (e.g., `mission_completed`) and **Resource Signals** for data-specific changes.

## Refactoring Roadmap

### Phase 1: The Foundation (Non-Breaking)
- Implement `EventBus.gd` and `PlayerProfile.gd` (Resource).
- Create `PlayerManager.gd` (Autoload) to wrap the profile.
- **Goal**: Start mirroring state into Resources without breaking `AppController`.

### Phase 2: Domain Decentralization
- Extract **EconomyManager** (Francs/Loans) from `AppController`.
- Extract **TutorialManager** (Tutorial state/Runtime) from `AppController`.
- Extract **ExperienceManager** (XP/Progression) from `AppController`.
- **Goal**: Reduce `AppController` to a simple 'Traffic Controller' or eliminate it.

### Phase 3: Mission System Modularization
- Break `RocketsManager` into:
  - `MissionData`: Resources for mission definitions.
  - `RocketSpecs`: Static data resources.
  - `MissionService`: Logic for running/resolving missions.

### Phase 4: Sync Bridge Optimization
- Refactor `SyncBridge` to observe the `PlayerProfile` resource.
- Eliminate the redundant 'shadow state' in `SyncBridge` by making it a direct 'Reflector' of the truth held in the Godot Resources.

## Discussion Points for Review
1. **Tutorial Logic**: Should tutorials remain as dynamically injected nodes via `AppController`, or move to a more declarative, scene-based system?
2. **Local Persistence**: Do we stick with `.cfg` files (AppControllerPersistence) or move fully to Godot's binary `.res` serialization for speed and complexity?
3. **Bridge Redundancy**: How much logic should the Bridge perform vs. simply passing raw snapshots to React Native?


## User Decisions & Constraints (2026-05-14)
- **Decentralization**: Approved. Move logic out of AppController and RocketsManager.
- **Environment**: Target is **Web (Godot Export)** running inside a **Next.js PWA**.
- **Consistency**: High priority. State must be consistent across devices (implies strong sync with Supabase via the Web Bridge).

## Refined Strategy for Web/PWA
- **Persistence**: While Godot's `user://` on Web uses IndexedDB, the 'Source of Truth' for cross-device consistency must be the Supabase database.
- **Sync Strategy**: The Godot Resource state (`PlayerProfile`) will emit signals when changed. The `SyncBridge` (Web edition) will catch these and push to the Next.js wrapper via `JavaScriptBridge`.
- **Latency**: Use local Resources for immediate 'optimistic' UI feedback in Godot, with background sync to the PWA layer.

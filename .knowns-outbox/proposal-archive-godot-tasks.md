# Proposal: Archive all Godot-era Knowns tasks

## Context
Godot-to-Next.js migration is complete. All Godot source files have been removed from the Landnam repository. These tasks reference Godot-specific patterns that no longer exist.

## Required Actions

### 1. Archive these LAN-prefixed tasks to `.knowns/archive/tasks/`
Move each to archive with note: "Obsoleted by web migration — Godot removed"

Active tasks to archive:
- LANvzpwke — Scrap and redesign tutorial system from scratch
- LANaa6vht — Remove M4 dead code and non-v1 mission references
- LANi7qewb — Purge Scanner/Satellite Station from active codebase
- LANpcdjg5 — Fix M3 review overlay (ColorRect.new() / ModalBase.tscn)
- LANnledn7 — Fix ControlStation.gd UIManager discovery

Completed tasks to archive:
- LANr2shk5 — Godot Architectural Overhaul
- LANzbphjc — Modularize RocketsManager
- LANu5vh8s — Convert rebuilt Fabrication Bay
- gd6xvv — New players see pre-built game state (Godot save)
- wcutme — Portrait mode design system font sweep (Godot scene)
- LANh02n1m — Remove XP/level system from codebase
- LANbvf6kw — Refactor SyncBridge for Web/PWA Sync

### 2. Archive Godot-era docs to `.knowns/archive/docs/`
- godot-architecture-audit-refactoring-roadmap
- megadoc-2026-05-14
- landnam-galaxymap-mining-scenes-deleted-reference
- structures/mission-ideas-future-missions-deferred-spec
- structures/scanner-station-deferred-feature-spec
- structures/xp-level-system-deferred-feature-spec

### 3. Add confirmation note
A confirmation note has been added to the Landnam README and AGENTS.md stating that Landnam is 100% Node.js/Next.js with no Godot dependencies.

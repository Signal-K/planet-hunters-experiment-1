# Proposal: Purge all Godot references from Landnam docs

## Context
The Landnam project has fully migrated from Godot to Node.js/Next.js. All Godot source files have been removed. Documentation still references Godot mechanics.

## Required Actions

### 1. Audit `.knowns/docs/landnam/`
- Rewrite/remove Godot-specific docs: godot-architecture-audit, megadoc legacy sections, galaxymap-mining-scenes-reference
- Replace with web-architecture equivalents where appropriate

### 2. Audit Landnam-docs* files in `.knowns/docs/`
Search and rewrite references to:
- Godot-specific patterns: `.gd`, `.tscn`, `.godot`, `.import`
- Godot-era components: ControlStation.gd, RocketsManager, Fabrication Bay
- Godot editor workflows

### 3. Audit `.knowns/docs/organized/`, `Inbox/`, `Components/`, `Review_Needed/`
Search for Godot references and purge or archive.

### 4. Clean up `.knowns-bridge.json` / outbox
The outbox README has been updated to remove Godot workflow references.

### 5. Local changes already applied
- AGENTS.md: Godot Scene Authoring section replaced with web-only guidelines
- README.md: Godot prerequisites, test commands, and integration guide link removed; migration note added
- KNOWNS.snapshot.md: Godot tasks marked [archived]

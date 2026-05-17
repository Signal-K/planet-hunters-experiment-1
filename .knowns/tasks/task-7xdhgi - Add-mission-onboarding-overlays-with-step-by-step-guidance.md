---
id: 7xdhgi
title: Add mission onboarding overlays with step-by-step guidance
status: done
priority: high
labels:
  - project-landnam
  - missions
  - tutorial
  - ui
  - onboarding
  - ux
createdAt: '2026-02-25T08:19:31.836Z'
updatedAt: '2026-02-25T08:23:55.174Z'
timeSpent: 54
---
# Add mission onboarding overlays with step-by-step guidance

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create in-game overlay system that shows mission-specific onboarding when user starts each mission. Should break down mission objectives into digestible steps rather than wall of text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Overlay system created that triggers on mission start
- [ ] #2 Mission 1 onboarding: Build rocket → Launch → Mine → Return → Debrief
- [ ] #3 Mission 2 onboarding: Unlock L2 rocket → Launch to same target → Higher yield
- [ ] #4 Mission 3 onboarding: Build scanner → Scan asteroids → Select untargeted → Launch
- [ ] #5 Mission 4 onboarding: Unlock L3 rocket → Toggle to planets → Select planet → Launch
- [ ] #6 Mission 5 onboarding: Review contractors → Accept contract → Mine requested minerals
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary

Migrated all standalone markdown documentation files into knowns docs system with proper YAML frontmatter and folder organization.

## What Was Done

1. **Created knowns docs** for all standalone markdown files:
   - Supabase Authentication Setup (dev/)
   - Docker Setup Guide (dev/)
   - Docker Quick Start (dev/)
   - Electron Desktop Build (dev/)
   - Godot Integration Guide (dev/)
   - Nebula Theme Implementation (dev/)
   - Refactoring Plan (dev/)
   - User Flow and Citizen Science (game-design/)
   - Mission Improvement Plan (game-design/)

2. **Organized by folder**:
   - dev/ - Technical setup, integration, and development docs
   - game-design/ - Game design, missions, and user experience docs

3. **Added proper metadata**:
   - Descriptive titles and descriptions
   - Relevant tags for searchability
   - Folder organization for logical grouping

4. **Cleaned up**:
   - Removed original docs/*.md files
   - Removed root-level REFACTORING_PLAN.md and MISSION_IMPROVEMENT_PLAN.md
   - All documentation now centralized in .knowns/docs/

## Benefits

- Single source of truth for all documentation
- Searchable via knowns search
- Proper version control and metadata
- Consistent YAML frontmatter format
- Organized folder structure
<!-- SECTION:NOTES:END -->


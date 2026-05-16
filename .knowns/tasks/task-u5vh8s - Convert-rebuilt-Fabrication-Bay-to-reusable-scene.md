---
id: u5vh8s
title: Convert rebuilt Fabrication Bay to reusable scene-owned UI
status: in-progress
priority: medium
labels:
  - project-landnam
  - ui
  - launchpad
  - launchwizard
  - technical-debt
createdAt: '2026-05-13T06:44:58.915Z'
updatedAt: '2026-05-14T00:49:04.103Z'
timeSpent: 0
order: 1
---
# Convert rebuilt Fabrication Bay to reusable scene-owned UI

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the Stitch-aligned Fabrication Bay behavior settles, move the new dynamic rocket assembly controls into reusable .tscn templates so designers can edit the screen directly again without reintroducing the retired assembly implementation.

Related: #tbt6nd

Stitch mcp templates:
## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project
Title: Active Asteroid Explorer
ID: 6899183127080693921

## Screens:
1. Fabrication Bay — Unified Mission Flow (Landscape)
    ID: 92c1a66de31c4d4abb3a4c34a94bd4d1

2. Fabrication Bay — Unified Mission Flow (Landscape)
    ID: ebe85f90a37b43d584947be235f57dfd

Use a utility like `curl -L` to download the hosted URLs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fabrication Bay container and module tile templates live in .tscn scene files
- [ ] #2 LaunchWizard.gd binds state into the new scene-owned nodes instead of constructing the full Fabrication Bay tree
- [ ] #3 Obsolete rocket assembly templates and code paths remain removed
- [ ] #4 Focused LaunchWizard regression coverage exercises rocket selection and module rail rendering
<!-- AC:END -->


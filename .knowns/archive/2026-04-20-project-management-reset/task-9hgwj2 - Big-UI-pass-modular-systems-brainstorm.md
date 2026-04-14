---
id: 9hgwj2
title: Big UI pass + modular systems brainstorm
status: done
priority: high
labels:
  - ui
  - design
  - brainstorm
  - architecture
  - citizen-science
createdAt: '2026-04-02T11:52:15.355Z'
updatedAt: '2026-04-13T05:37:53.824Z'
timeSpent: 927925
assignee: '@me'
parent: q1jyo4
---
# Big UI pass + modular systems brainstorm

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit the current game UI and structure, identify modularization opportunities, and synthesize a product direction that keeps citizen science central while making the experience more sandboxy, expandable, and engaging. Ground recommendations in existing game-design and specification docs plus current implementation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Current UI problems, inconsistencies, and modularization opportunities are documented
- [x] #2 A concrete proposed modular UI/system architecture is defined for the main gameplay surfaces
- [x] #3 A gameplay brainstorm is produced that keeps citizen science central while increasing creativity, sandbox potential, and long-term engagement
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit live UI surfaces (Earth base, launchpad, scanner, control station, mining, debrief, shell) against shared style/layout primitives and current screenshots.
2. Consolidate a modular UI architecture: reusable shells, cards, nav, status strips, action bars, overlay patterns, and safe-area/layout contracts.
3. Implement the first big UI pass on the highest-friction surfaces, prioritising consistency, readability, mobile fit, and shared component reuse.
4. Verify with existing UX tour/screenshots/tests and capture any residual risks or follow-up tasks.
5. Produce a product-direction brainstorm grounded in current Knowns docs/tasks: expand sandbox/creative play while keeping citizen science inseparable from progression.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Closed via Sprint 6 audit/docs + implementation batch. Current UI problems and modularization opportunities documented in dev/active audits; major gameplay surfaces refit (launchpad, debrief, scanner, candidate detail, loan dialog, control station); sandbox/citizen-science product direction captured in Sprint 6 docs and flow updates.
<!-- SECTION:NOTES:END -->


---
id: 0h5ubk
title: Fix UX Screenshot Tour CI failure - missing .godot-bin dir for docker build
status: done
priority: high
labels:
  - bug,ci
createdAt: '2026-04-20T01:22:08.875Z'
updatedAt: '2026-04-20T01:23:04.728Z'
timeSpent: 44
assignee: '@Liam'
---
# Fix UX Screenshot Tour CI failure - missing .godot-bin dir for docker build

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The godot-ux-tour job in godot-ux-e2e.yml fails fast because Dockerfile.ux-tour has COPY .godot-bin/ /tmp/godot-cache/ but .godot-bin/ is gitignored and does not exist in CI workspace. Docker build errors immediately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 godot-ux-tour CI job passes without docker build error
- [x] #2 .godot-bin dir is created before docker build in workflow
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed by adding mkdir -p .godot-bin before docker build fallback in godot-ux-e2e.yml line 124. .godot-bin is gitignored so the COPY in Dockerfile.ux-tour failed immediately.
<!-- SECTION:NOTES:END -->


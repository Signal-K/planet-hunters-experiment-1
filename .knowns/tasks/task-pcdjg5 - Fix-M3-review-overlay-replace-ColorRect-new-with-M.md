---
id: pcdjg5
title: Fix M3 review overlay — replace ColorRect.new() with ModalBase.tscn
status: todo
priority: medium
labels:
  - project-landnam,godot,ui,cleanup
createdAt: '2026-05-14T10:30:12.368Z'
updatedAt: '2026-05-14T10:30:12.368Z'
timeSpent: 0
---
# Fix M3 review overlay — replace ColorRect.new() with ModalBase.tscn

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
LaunchWizard.gd:714-736 creates the M3 review overlay using ColorRect.new() instead of the existing ModalBase.tscn. This is the runtime UI creation anti-pattern.

Fix: instantiate ModalBase.tscn and use it as the overlay container.

Ref: landnam/audit/megadoc-2026-05-14 MEDIUM-04
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 M3 review overlay uses ModalBase.tscn as its container
- [ ] #2 No ColorRect.new() call remains in LaunchWizard.gd for overlay creation
<!-- AC:END -->


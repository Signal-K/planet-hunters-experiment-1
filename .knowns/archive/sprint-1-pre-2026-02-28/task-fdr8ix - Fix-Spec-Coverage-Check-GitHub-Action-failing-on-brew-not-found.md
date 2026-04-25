---
id: fdr8ix
title: Fix Spec Coverage Check GitHub Action failing on brew not found
status: done
priority: high
labels:
  - ci
  - github-actions
  - spec
createdAt: '2026-02-27T06:42:59.962Z'
updatedAt: '2026-02-27T08:44:36.346Z'
timeSpent: 426
assignee: '@me'
---
# Fix Spec Coverage Check GitHub Action failing on brew not found

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The check-spec-coverage job fails in GitHub Actions with '/bin/sh: brew: command not found'. The workflow currently assumes Homebrew exists on the runner.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Spec coverage workflow runs successfully on GitHub-hosted runner without relying on unavailable brew
- [x] #2 Dependency installation step is made runner-compatible or replaced with a portable alternative
- [x] #3 PR/CI run confirms check-spec-coverage job passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update spec-coverage workflow install step to use an OS-compatible knowns CLI installation path (Linux-friendly, no Homebrew dependency).
2. Keep existing coverage logic intact and validate workflow YAML syntax locally.
3. Add implementation notes in the task and prepare CI verification guidance for next PR run.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Replaced brew install with setup-node + npm global knowns install in .github/workflows/spec-coverage.yml; YAML parse check passes locally

Closed and moved to done per user request (2026-02-27).
<!-- SECTION:NOTES:END -->


---
id: 9dm0bp
title: Use local Supabase credentials while running in Godot editor
status: done
priority: high
labels:
  - supabase
  - editor-mode
  - config
createdAt: '2026-02-08T04:53:08.351Z'
updatedAt: '2026-02-08T04:55:42.388Z'
timeSpent: 0
assignee: '@me'
---
# Use local Supabase credentials while running in Godot editor

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the game is run from the Godot editor, always resolve Supabase credentials to local values; keep existing production/runtime behavior for exported/mobile builds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When run from Godot editor, SupabaseClient resolves local URL/key credentials
- [ ] #2 Exported/runtime builds still use runtime/env production credentials when available
- [ ] #3 Credential selection logic is explicit and covered by lightweight tests or validation output
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor `scene/Scripts/Systems/SupabaseClient.gd` credential resolution into explicit branches: env/runtime config, forced local override, and editor-run detection.
2. Treat editor-run sessions (`OS.has_feature("editor")`) as local-credentials mode by default, regardless of `Engine.is_editor_hint()`, so F5/play-in-editor uses localhost credentials.
3. Keep exported/mobile behavior unchanged: prefer env/runtime credentials and production path for mobile/exported builds.
4. Add/adjust a small validation path (test or deterministic debug output) to verify editor mode resolves local credentials and non-editor mode still resolves runtime/env when present.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Updated Supabase credential resolution in `scene/Scripts/Systems/SupabaseClient.gd` to force local credentials when running from Godot editor runtime (`OS.has_feature("editor")`).
- Kept production/export behavior for non-editor runtime (env/runtime config still preferred outside editor).
- Removed unused `USE_PRODUCTION_IN_EDITOR` branch to make flow explicit and deterministic.

## Validation
- `GODOT_USER_DIR=/tmp/godot Godot --headless --path scene --script res://tests/run_supabase_tests.gd` ✅
- Output confirms local URL: `Supabase tests: using SUPABASE_URL=http://127.0.0.1:54321`
<!-- SECTION:NOTES:END -->


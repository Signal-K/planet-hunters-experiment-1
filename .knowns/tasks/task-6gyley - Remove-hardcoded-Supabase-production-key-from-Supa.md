---
id: 6gyley
title: Remove hardcoded Supabase production key from SupabaseClient.gd
status: todo
priority: high
labels:
  - project-landnam,godot,security,supabase
createdAt: '2026-05-14T10:29:40.328Z'
updatedAt: '2026-05-14T10:29:40.328Z'
timeSpent: 0
---
# Remove hardcoded Supabase production key from SupabaseClient.gd

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SupabaseClient.gd:14 contains PROD_SUPABASE_KEY as a hardcoded full JWT in plain GDScript source. Anyone with the exported binary can extract it.

Fix: pass the key via JavaScript bridge from Next.js environment at runtime. Next.js reads from .env.local; Godot receives it via the existing JS bridge on app_ready, never bundled in GDScript.

Ref: landnam/audit/megadoc-2026-05-14 CRITICAL-05
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No Supabase key appears in any GDScript source file
- [ ] #2 Key is injected from Next.js env via JS bridge within 500ms of app_ready signal
- [ ] #3 Production auth still works end-to-end after change
<!-- AC:END -->


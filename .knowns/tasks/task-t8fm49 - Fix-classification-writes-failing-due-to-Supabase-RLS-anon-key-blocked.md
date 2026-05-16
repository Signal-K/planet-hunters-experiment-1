---
id: t8fm49
title: Fix classification writes failing due to Supabase RLS (anon key blocked)
status: todo
priority: low
labels:
  - project-landnam
  - supabase
  - rls
  - citizen-science
  - bug
createdAt: '2026-04-11T04:07:40.472Z'
updatedAt: '2026-05-14T00:00:00.000Z'
timeSpent: 0
assignee: '@Liam'
order: 8
---
# Fix classification writes failing due to Supabase RLS (anon key blocked)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
All player classifications (planet/not_planet verdicts + annotations) silently fail to save in Supabase because the anon key violates the RLS policy on the classifications table. Tested live against api.starsailors.space: POST returns 401 'new row violates row-level security policy'. Consequence: consensus system never has real data; ClassificationConsensus.check_for_updates() always returns empty. The game appears to work locally (local annotation JSON saved) but no data reaches the database.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST to classifications table succeeds from the game (anon or authenticated user)
- [ ] #2 ClassificationConsensus.check_for_updates() returns real rows from live data after a classification is submitted
- [ ] #3 At least one classification visible in Supabase after a full game run
- [ ] #4 author field populated with real user ID (or guest ID) rather than all-zeros UUID
- [ ] #5 Capture an identifier (device ID or IP) to track classification source, potentially linked with Posthog identifiers
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Live Diagnostic (2026-04-11)

### Supabase URL: https://api.starsailors.space (hlufptwhzkpkkjztimzo.supabase.co)

### 1. Anomaly fetch — WORKS
GET /rest/v1/anomalies?anomalySet=eq.tess&limit=2 → 200 OK
Returns 2 real TESS anomalies: id=21720215 (planet), id=57299130 (planet)

### 2. Lightcurve image — ACCESSIBLE
GET /storage/v1/object/public/anomalies/21720215/Sector1.png → 200 OK, 75,018 bytes
Real TESS lightcurve: TIC 21720215, Sector 79, shows transit dip ~BTJD 3490
Pre-annotated "Boxed" marker already present in image

### 3. Classification POST — FAILS (RLS violation)
POST /rest/v1/classifications with anon key → 401
Response: {"code":"42501","message":"new row violates row-level security policy for table \"classifications\""}
Payload: anomaly=21720215, classificationtype=tess-lightcurve, author=00000000-..., classificationConfiguration.verdict=planet

### 4. Classification read-back — EMPTY
GET /rest/v1/classifications?anomaly=eq.21720215 → 200, 0 rows
(RLS also hides rows from anon readers — consensus system sees nothing)

### Root cause
- SupabaseClient.post_json() uses the anon key for POST
- RLS on classifications table requires auth.uid() to be valid (not null/anon)
- author hardcoded as "00000000-0000-0000-0000-000000000000" — not a real Supabase auth UID
- The game has no authentication flow for users before classification

### Local annotation save — WORKS
- user://annotations/<anomaly_id>.json saved correctly
- user://annotations/<anomaly_id>-annotated.png composite saved correctly
- These are local-only; never reach Supabase

### Options for fix
A. Add Supabase RLS policy: allow INSERT for anon role (simplest, but risks spam)
B. Create a Supabase Edge Function that accepts unauthenticated classification submissions (server-side uses service role key)
C. Implement guest auth (anonymous Supabase auth) to generate a real auth.uid() per session
D. Pass a verified game session token in the request headers and add matching RLS policy

Recommended: Option B (Updated 2026-05-14) — Preference shifted to an Edge Function to allow capturing identifiers (IP/Device ID) while keeping the game simple for guest users.

✓ Added anonymous Supabase auth session flow + real author IDs for classification POST/read paths

⚠ Production still rejects authenticated anonymous inserts with 42501. Root cause confirmed: repo migrations only grant classifications INSERT to anon, while Supabase anonymous auth yields authenticated role. Added corrective migration supabase/migrations/20260413_classifications_authenticated_guest_policy.sql and normalized anomaly-id parsing in game/test write paths.

2026-04-30 scope update: this production classification fix now applies only to planet-candidate / TESS lightcurve submissions for the next release. Asteroid review is out of scope.
Backlog cleanup 2026-05-13: moved from blocked to todo. Next action is a concrete production Supabase RLS/auth verification/fix pass rather than leaving this in blocked status.

Update 2026-05-14:
- Priority reduced to Low.
- Classifications are deferred; the initial release will feature starter missions only.
- Implementation goal: Use an edge function to handle submissions.
- Identifier tracking: Capture device ID or IP address to track classification source, ideally linking with Posthog's browser-side identifiers.
<!-- SECTION:NOTES:END -->


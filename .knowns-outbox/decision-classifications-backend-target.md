# Decision Needed: `classifications` Collection — Which Backend?

## Status: Open

## Context

`web/game-context.tsx` (`classifyCandidate`, ~line 381) writes classification
verdicts via:

```ts
pbShared.collection('classifications').create({ user: userId, candidate: CANDIDATE_ID, verdict })
```

`pbShared` points at the **shared backend** (port 8090, `~/Navigation/backend/`).
Per `CLAUDE.md`, the shared backend's collection list includes `classifications`,
but its schema is defined in a separate repo not visible from this sandbox.

Separately, **this repo's** `pocketbase/main.go` (`ensureCollections`, lines
62-83) and `pocketbase/pb_migrations/1780710600_classifications.js` define a
*Landnam-local* `classifications` collection (port 8091/8093) with:

```
user      -> relation to LOCAL users collection (Landnam auth)
candidate -> text(80)
verdict   -> select('planet' | 'not_planet')
```

Auth, however, happens on the **shared** backend (CLAUDE.md: "User gets JWT
from shared backend -> ... -> Landnam verifies via shared backend's
auth-refresh"). That means the `user` relation field on the Landnam-local
`classifications` collection points at a `users` table that real players are
never rows in (Landnam's local `users` is effectively unused for auth).

I can't confirm from this repo alone whether:
- the shared backend's `classifications` collection has a compatible
  `(user, candidate, verdict)` shape (in which case the current code is
  *correct* and the Landnam-local collection is dead/vestigial), or
- the shared backend's `classifications` collection has a different shape
  (e.g. tied to `celestial_bodies` / generic anomaly classifications used by
  other Star Sailors apps), in which case `game-context.tsx` is writing the
  wrong shape to the wrong place and silently failing (caught by
  `classificationError`, but easy to miss).

## Decision Needed

**A. Shared backend is correct, Landnam-local collection is dead code.**
   - Confirm shared backend `classifications` schema matches `(user, candidate, verdict)`.
   - If yes: remove the Landnam-local `classifications` collection definition
     from `pocketbase/main.go` and the migration file (or leave as documented
     dead code if other Star Sailors apps rely on Landnam PB having it).

**B. Landnam-local backend is correct; switch `game-context.tsx` to `pbLandnam`.**
   - Requires Landnam's local `users` collection to actually contain a row
     per authenticated player (currently unclear how/if that's synced from
     the shared backend).
   - Would need a sync step at login: ensure a Landnam-local user record
     exists with the same ID as the shared-backend user, or relax the
     relation to a plain text `user_id` field instead of a `relation`.

**C. New dedicated collection for the redesigned pipeline (recommended).**
   - As part of the broader classification pipeline redesign (see
     `spec-exoplanet-classification-pipeline.md` in this outbox), introduce a
     new `subject_classifications` collection (on whichever backend hosts
     `subjects`) with the richer schema needed for swipe verdicts +
     consensus (`subject_id`, `user`, `verdict`, `confidence`,
     `response_time_ms`, `is_calibration`). Treat the existing `classifications`
     collection(s) as legacy/v0 and either migrate or leave alone.
   - This sidesteps the ambiguity above by not depending on either existing
     collection being "correct."

## My Recommendation

Go with **C** as part of the pipeline rebuild — it's a clean slate and avoids
needing to audit the shared backend repo. But I'd still like a quick answer on
**where `subjects` / `subject_classifications` should live**: shared backend
(8090, alongside `celestial_bodies` — makes sense if other Star Sailors apps
might reuse the same subject pool) vs. Landnam backend (8091/8093, simpler,
matches `game_states`/`minerals`/`contractors` co-location). I'd default to
**Landnam backend** unless cross-app reuse of TESS subjects is a near-term
goal.

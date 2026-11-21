# Cycle 10 local review — 21 November 2026

The current branch is suitable for an incremental feature merge after its new
CI checks pass. It does not finish the simpler onboarding or the replacement
mission flow proposed in SSL-864 and SSL-870. Those remain open product work.

## What I played

Local web on port 4320 with local Landnam and shared PocketBase processes.
Used the existing scene driver manually, in disposable account-free stage
fixtures. This was a sequence of playable checks, not a single fresh-account
campaign or a production multiplayer test.

| Path | Observed result |
| --- | --- |
| `hub-first-run` → Missions → Free run → Bennu → buy Explorer → Launch | The physical rocket launches into the 3D transit scene, then reaches the mining scene with a four-hydrogen goal. Hydrogen is valid in Bennu's carbonaceous mineral pool. |
| Free-run mining → Sell on Earth → fire → Return to Earth | The storage choice opens the controls; firing spends a charge; the explicit return action starts the Earth approach. This run returned empty; I did not complete its four-unit goal. |
| `m1-mining&miningSpeed=0.1` → steer → tap FIRE | Collected one platinum, moving the order from 0/5 to 1/5 and charges from 160 to 159. Slow speed is a local timing aid; this does not establish normal-speed difficulty or a full five-unit clear. |
| `first-home` → Settle cargo → Complete mission | Five platinum delivered to the client, five surplus units stored; the debrief explains Community Site credit and reports the returned/recycled rocket. Base balance rose from about ₣150M to ₣166.7M after collection. |
| `rocket-workshop` → Livery → Blue | Hull paint changes. The workshop reports the fixture's range, capacity and laser deficits rather than presenting it as flight-ready. |
| `mission-planner` → Survey → Save plan → Review & launch | Saved a six-sector survey and reached launch review with the survey probe payload. Did not launch this second sortie. |
| `ground-telescope-upgrades` → place owned telescope → Menu → Build → telescope → Upgrade | Telescope becomes observing on the annex; 1 U iron raises level 1 to 2; the next upgrade offers level 3 for 2 U iron. Tapping the placed telescope also reaches the Data hub. |
| `research-passport` | Current week, three earned daily stamps, confirmed community goal and the earned part's workshop status render. This fixture starts with the reward earned; no live community threshold was crossed in this review. |

Inspected phone portrait and landscape screenshots for workshop/planner/passport
and the debrief; captured the debrief at phone, landscape, both iPad orientations
and desktop, and inspected phone and iPad landscape. Driver actions reported no
application console errors. A few attempted clicks timed out when a temporary
brief/arrival control had already disappeared or a selector was incorrect;
those are not successful gameplay actions.

Local screenshot evidence is in `.scene-shots/424` through `469` (ignored):
437 workshop phone, 450 upgraded telescope, 451 passport phone, 452 planner
phone, 455 saved survey review, 458–462 debrief viewports, 463 collected return
and 469 platinum hit. Screenshots are local review evidence, not committed assets.

## Cycle goals and content

The implemented loop has enough connected content for this incremental release:
contracts and free mining, three custom mission types, workshop parts/livery,
steerable transit, scope placement/upgrades, instrument data, weekly research
and cargo settlement. The separate SSL-852 and SSL-848 closeouts record the
service/data loop and offline flight checks in more depth.

The remaining problem is guidance and coherence rather than a shortage of
systems. SSL-873 now gives the first-run Base one next task: prepare a short
reachable contract, continue setup, or resume the active run. A first mission
with the standard free Explorer reaches launch review in one tap, then launches
on the next; normal paid-vehicle choices remain explicit.
Free Run chooses a mineral goal before the player deliberately edits it.
Telescope upgrades work, but are reached through Menu → Build, while tapping
the telescope opens the Data hub. The planner has a long phone form and the
debrief still has busy background art. These observations support SSL-864 and
SSL-870; the proposed story route and eleven-template UI reset are not shipped.
No assessment here claims every mission template, real event date, feed or
new-player difficulty curve has been fully played.

SSL-853's first-person Moon camera is unmerged and Backlog. Native fleet and
flight presentation remain SSL-869 and SSL-871 under the companion scope.
No native Simulator session or signed-in/multi-user research submission was
performed in this review.

## Tests kept and retired

Retired five test files (ten assertions/cases) that pinned source spelling,
branding copy or a redundant route membership list:

- `components/game/MissionSetupRoutes.test.ts`
- `components/game/GameScreenRouter.test.ts`
- `lib/modal-surface.test.ts`
- `lib/sync-chip-css.test.ts`
- `lib/brand.test.ts`

Git history is the archive. Do not keep disabled copies in the working tree.
Route behavior remains in `game-route`, `game-screens` and `screen-layouts`.
Keep save/migration, sync/outbox, allocation/payment, mission state transitions,
reward eligibility and authored-contract coverage. Source-reading tests are not
all redundant: server/client boundaries and cross-platform data contracts
protect concrete failures.

Removed the duplicate mission-subset job from cycle validation; the complete
web run already includes it. Moved the authoring check into that job. Fixed
`make test` pipelines so output truncation cannot hide a failed command.

Validation: `make test` passed with 224 test files / 1,341 tests and one skipped
file/test, authored contracts clean, shared Go core passed; web typecheck
passed. An injected failing authoring command correctly makes `make test`
exit nonzero. The preceding gameplay commit `76563b2c` has successful hosted
CI, Deploy and iOS review runs. This cleanup's hosted checks must be evaluated
on its own commit.

## Merge recommendation

Most earlier Cycle 10 fixes are already on main through PR #237. The remaining
feature commits are SSL-851, SSL-852 and SSL-847/848, plus this SSL-872 cleanup.
A read-only merge-tree check against main completed without conflicts before
the cleanup commit. Merge these as the next incremental release after CI;
do not describe the cycle's new story/mission redesign as complete.


## Guidance follow-up (SSL-873)

Reviewed Haphazard Martians' mission menu, expedition setup, screen-local tutorial
and result handoff in `/workspace/Bad-Martians/game/`. The useful pattern is a
self-contained job with its objective and equipment available, then a clear
next attempt. This is the first application to the existing Landnam Base.

Played the `hub` / `m1-hub` stage by hand: Prepare flight selected Baseline
Extraction, Eros and the normal free Explorer; Launch played the ascent and 3D
flight, then entered mining with the five-platinum order. Back through the
mission board retained Continue setup. Pausing mining via Menu → View Base
showed Resume mining, which returned to the same order. No paid vehicle was
purchased by the new control. Free Ops `hub-first-run` offered a shorter
three-hydrogen Bennu contract and opened its normal build review.

Inspected the guidance on phone portrait/landscape, both iPad orientations and
desktop. Screenshots 480–481 show the first preparation and launch-ready rocket;
487–492 show the paused run; 496 onward show the final progress wording. Local
browser action logs reported no page errors. A late attempt to tap View Base
after flight had already ended timed out; the mining menu path was used instead.
These remain disposable fixtures, not a signed-in campaign or user study.

iOS mirrors the recommendation, review and resume behavior and updates its
coach. This Linux environment has no Swift/Xcode or Simulator, so native build
and execution remain hosted-check work. Native does not yet have web's pad wear
and service feature; the new web action opens the existing service confirmation.
The decision is saved under `notes/decisions/Flights start with a clear prepared
job (2026-11-21).md`; copying its body to Craft was blocked by automatic approval
review and remains undone.

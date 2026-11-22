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
and execution were verified separately on hosted Macs: Cycle validation
44892439034 passed its native core suite, full web tests/build and both Go jobs;
the iOS review app-build step on 44892439102 passed. Simulator app tests were
still running at closeout. Native does not yet have web's pad wear
and service feature; the new web action opens the existing service confirmation.
The decision is saved under `notes/decisions/Flights start with a clear prepared
job (2026-11-21).md`. Automatic approval review initially blocked the Craft
mirror and detailed Linear comment. Liam explicitly approved both, and they
were synced on 21 November: Craft page “Flights start with a clear prepared
job (2026-11-21)” and SSL-873 comment `8bde8fd3-6f9e-4910-a633-329047a7f178`.
SSL-873 is Done; SSL-864 and SSL-870 remain open.

The final `hub-pad-worn` check opened the existing ₣1M service confirmation
from the guidance action. Confirming reduced the fixture balance from ₣150M
to ₣149M and replaced Service pad with Prepare flight (screenshots 502–504).


## Cycle 10 guidance hotfixes (22 November)

PR #240 merged to main at `4c243af2` after all checks, including Simulator tests,
passed. The explicitly requested follow-up branch is `hotfix/cycle-10-guidance`.
Liam clarified that the agency belongs to the player: guidance explains choices
and consequences, rather than assigning the agency a purpose or a mandatory
campaign. The decision is in the repository and mirrored in Craft.

SSL-874 gives even the first debrief a persistent Choose next flight action.
Each next-activity action completes the same settlement once. Free Ops offers
Plan my own flight; available telescopes offer data review. The Base action
explicitly returns to Base, and the next mission board uses Earth scope.
Rocket recycling is a separate optional action. iOS mirrors next-flight, Base
and instrument exits; the web Mission Planner remains deferred on iOS.

Played the first debrief to Choose next flight: the board opened directly at
₣166.7M from ₣150M. The survey-probe debrief opened the player's own Mission
Planner directly. The explicit Base button returned the first completed run
to Base with the same payout. The final debrief was inspected at 390×844,
926×428, 1180×820, 820×1180 and 1440×900 (screenshots 518–523). Successful actions
reported no page errors. These are disposable fixtures, not a fresh user study.
Local web suite: 1,347 passed, one skipped; shared Go and authoring checks passed.
Web typecheck passed. No local Swift/Xcode/Simulator is available; native changes
are verified by the PR's hosted Mac checks.

SSL-875 marks a new Base recommendation as Suggested flight and exposes Choose
another flight plus Plan my own flight on web in Free Ops. Existing active runs,
unfinished setup and service states keep their continuation actions. iOS offers
the alternate board route; native custom planning remains deferred.

Played `hub-first-run`: own-flight planning opened directly, the alternate
route opened the board with ₣150M unchanged and no contract accepted, and the
suggested preparation still opened the normal review. Back through the board
to Base retained Continue setup with no new-job choices (screenshots 525–537).
Inspected phone, landscape, both iPad orientations and desktop. No new tests
were added for these reversible UI changes; existing state/resource guards
remain. The full local suite again passed 1,347 tests (one skipped), plus
shared Go/authoring and typecheck.

SSL-876 fixes a phone layout defect found on those routes: Plan mission and Log
shared one grid cell. Planning, Log and balance now have distinct cells; the
short Plan flight label keeps the actions readable. Free Run uses a compact
44px Solar system back control with an accessible name, clear of the toolbar
and Bennu. Native does not share this web grid or have the web planner.

Clicked planning and Log separately on the phone, then selected Bennu in Free
Run. Inspected 375×812, 390×844, landscape, both iPad orientations and desktop
(screenshots 539–542 and 559–564). The final 375px view shows all header controls
and Bennu clearly. Successful actions reported no page errors. One attempted
Free Run click after the Log's Back action timed out because Back had returned
to Base; the Mission Board fixture was reopened for the map check.

The 1,347-test local suite, shared Go checks and authoring passed; typecheck and
manual views were repeated after the final CSS refinement. No CSS-spelling or
snapshot tests were added. Hosted native domain tests and the iOS app build
passed for the functional hotfix code at `76075c54`; Simulator app tests and the
final PR checks continue separately. The initial Cycle 10 changes remain merged
in main; these guidance follow-ups are in draft PR #241.

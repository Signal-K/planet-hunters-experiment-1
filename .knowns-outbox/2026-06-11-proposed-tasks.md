# Proposed Knowns Tasks — Landnam Tester Readiness

> Source: @doc/.knowns-outbox/2026-06-11-tester-readiness-report (this repo's outbox).
> A parent-capable agent should review and create these via `knowns task create` against
> the canonical `../.knowns` project, then run `make knowns-outbox-collect` per
> `.knowns-bridge.json`. Each entry below is formatted as a ready-to-run `task create` plus
> follow-up `--ac` calls.

---

## 1. Fix tutorial-coach overlay covering Classify Signal "NOT PLANET" button

```
knowns task create "Fix tutorial coach overlay covering Classify Signal NOT PLANET button" \
  -d "Same bug class as @task-0u1hg4 (fixed for the contractor panel) recurs on the M3 Classify Signal screen — the Mission Coach bar overlaps the NOT PLANET classification button, partially clipping its label. Apply the CLAUDE.md 'UI Blocks Need Dedicated Layout Segments' rule: reserve a coach-bar segment on the classify screen instead of overlaying it." \
  --ac "Mission Coach overlay does not visually overlap PLANET or NOT PLANET buttons on /classify" \
  --ac "Both classification buttons remain fully tappable while the coach overlay is visible" \
  --priority high \
  -l "project-landnam,bug,ui,tutorial,classify,desktop,experiment1"
```

## 2. Fix "Vehicle Unlocked" reward modal frame break

```
knowns task create "Fix reward-unlock modal rendering outside the portrait game frame" \
  -d "After completing M1, the 'Vehicle Unlocked' (Starter Rocket 2) reward modal renders centered on the full-width black canvas instead of inside the same narrow portrait frame used by every other screen. This is a jarring visual break on the first reward moment of the game." \
  --ac "Vehicle/reward unlock modals render inside the same portrait game frame as other screens" \
  --ac "Verified visually for at least the M1 Starter Rocket 2 unlock" \
  --priority medium \
  -l "project-landnam,bug,ui,rewards,polish,experiment1"
```

## 3. Fix truncated 'BUILD REQUIRED' mission teaser text on Hub

```
knowns task create "Fix truncated mission-board teaser text in Build Required panel" \
  -d "On the Hub, the sticky 'BUILD REQUIRED -> Control Station' panel shows the mission-board teaser text truncated mid-word ('1 contracts on the b...'). Needs proper text wrapping/ellipsis handling within the 8pt spacing rhythm." \
  --ac "Mission-board teaser text in the Build Required panel wraps or truncates cleanly with no mid-word cutoff" \
  --priority low \
  -l "project-landnam,bug,ui,hub,polish,experiment1"
```

## 4. Add first-session intro/welcome framing screen

```
knowns task create "Add first-session intro/welcome screen before Build a Launchpad" \
  -d "New players currently land directly on 'Build a Launchpad' with zero narrative framing. Add a one-time intro panel (first sign-in / fresh state) that introduces the player's role, Earth Base, and the citizen-science angle (real TESS data, classifications matter), plus a short note that this is an early playtest with a feedback entry point. Builds on @task-illty2." \
  --ac "First-time players see a one-time welcome/intro panel before the Build screen" \
  --ac "Intro explains the citizen-science framing and points to a feedback mechanism" \
  --ac "Intro does not reappear after progress reset is dismissed once (unless progress is reset)" \
  --priority high \
  -l "project-landnam,ux,onboarding,tutorial,desktop,experiment1"
```

## 5. Visible confirmation on classification submission

```
knowns task create "Show visible confirmation when a TESS classification is submitted" \
  -d "After SUBMIT CLASSIFICATION on /classify, there is currently no confirmation that the verdict was recorded — the screen silently transitions to rocket assembly. Add a lightweight toast/modal ('Classification recorded — thanks for contributing to <target> research.') to close the most important feedback loop in the citizen-science pitch, independent of backend wiring status." \
  --ac "Submitting a classification shows a visible confirmation referencing the target body" \
  --ac "Confirmation works even when DATA LINK is offline (local-only fallback)" \
  --priority high \
  -l "project-landnam,citizen-science,classification,ux,feedback,experiment1"
```

## 6. Decide and implement Atlas / Market nav state for tester build

```
knowns task create "Resolve Atlas and Market bottom-nav dead ends for tester build" \
  -d "Bottom-nav 'ATLAS' silently redirects to Missions (GameApp.tsx: id === 'galaxy' ? 'missions' : ...) and 'MARKET' is a permanent COMING SOON stub. For a tester build, either (a) hide/disable both with an honest 'not yet available' state, or (b) stand up a minimal Atlas screen showing the orbit map + bodies used by current missions, reusing the existing target-picker orbit SVG. Decision needed before any public tester build ships." \
  --ac "Atlas nav button either opens a real (even minimal) Atlas screen, or is visibly disabled with an explanatory state — it no longer silently redirects to Missions" \
  --ac "Market nav button is either functional or clearly and permanently labeled as not-yet-available without implying it's broken" \
  --priority high \
  -l "project-landnam,ux,navigation,atlas,market,decision-needed,experiment1"
```

## 7. Verify and surface 'Need help / Send feedback' entry point

```
knowns task create "Verify and surface feedback button reachability for tester build" \
  -d "Per @task-70e538 the feedback button is wired to a PostHog survey, but it was not encountered during a full M1-M3 playthrough in this session. Confirm where it lives in the live UI, ensure it's reachable from the Hub/menu without backend access, and that it degrades gracefully (no crash) when PostHog/network is unreachable." \
  --ac "Feedback entry point is reachable from the Hub or main menu in under 2 taps" \
  --ac "Feedback button does not crash or hang when network/PostHog is unreachable" \
  --priority high \
  -l "project-landnam,posthog,feedback,ux,experiment1"
```

## 8. Debrief headline contrast pass

```
knowns task create "Increase contrast of Debrief headline and subtitle text" \
  -d "Follow-up to @task-u5b5cb: the debrief 'RETURNED' headline and 'FROM <body> · SOL III ORBIT RE-ENTRY' subtitle remain low-contrast (muted grey on near-black). Promote to a higher-contrast text token consistent with --ln-text." \
  --ac "Debrief headline and subtitle meet WCAG AA contrast against the debrief background" \
  --priority low \
  -l "project-landnam,ui,debrief,accessibility,polish,experiment1"
```

## 9. Run and fix existing Cypress e2e suite ahead of tester build

```
knowns task create "Run and stabilize existing Cypress e2e suite before tester build" \
  -d "The e2e suite added in @task-d8f8b4b (debrief, transit, mission board) has not been run against the current build. Run npm run test:e2e and fix any regressions before producing a public tester build." \
  --ac "npm run test:e2e passes locally against the current web/ build" \
  --ac "Any failing specs are fixed or have a tracked follow-up task" \
  --priority medium \
  -l "project-landnam,testing,cypress,ci,experiment1"
```

## 10. Classification persistence + visible history (consensus prep)

```
knowns task create "Persist classification submissions and add a per-player history view" \
  -d "Currently SUBMIT CLASSIFICATION is a UI-only gesture. Persist verdict, confidence, target/candidate id, session id, and timestamp to the shared backend classifications collection (per CLAUDE.md cross-instance reference convention), and add a minimal 'your classifications' history view. This is the foundation for consensus, calibration, and exports described in the next-month plan." \
  --ac "Classification submissions are persisted with provenance fields (player/session, candidate id, verdict, confidence, timestamp)" \
  --ac "Player can view a list of their own past classifications and verdicts" \
  --priority medium \
  -l "project-landnam,citizen-science,backend,classification,consensus,experiment1"
```

## 11. Wire ECLIPSING BINARY and UNCERTAIN classification verdicts

```
knowns task create "Add ECLIPSING BINARY and UNCERTAIN options to Classify Signal screen" \
  -d "user-flow-and-citizen-science-specification.md specifies four verdicts (PLANET / NOT PLANET / ECLIPSING BINARY / UNCERTAIN) plus a confidence slider, but the live Classify Signal screen only implements PLANET/NOT PLANET as binary buttons. Add the remaining verdict options to improve data granularity ahead of consensus work." \
  --ac "Classify Signal screen offers PLANET, NOT PLANET, ECLIPSING BINARY, and UNCERTAIN as selectable verdicts" \
  --ac "Selected verdict is included in the submitted classification payload" \
  --priority low \
  -l "project-landnam,citizen-science,classification,spec-gap,experiment1"
```

## 12. Mining-surface art pass per target body

```
knowns task create "Generate mining-surface backdrop art for top mission target bodies" \
  -d "The mining minigame currently renders ore as colored circles on a flat brown gradient for every target. Generate per-body surface backdrops (433 Eros, Mars, 4 Vesta, 16 Psyche, etc.) matching the existing earth-day/earth-dusk illustrated style, using the prompt-batch approach already tracked in @task-LANj6tbdr / @task-LANci4oe8 / @task-LANxx1lbc. Maintain an ASSETS.md manifest recording prompts/tooling per generated asset for licensing traceability." \
  --ac "At least M1-M3 target bodies (433 Eros, Mars, TESS-451 b) have a dedicated mining-surface backdrop matching the existing visual style" \
  --ac "Generated assets are recorded in an ASSETS.md manifest with prompt/tooling provenance" \
  --priority medium \
  -l "project-landnam,art-pipeline,mining,assets,experiment1"
```

---

## Notes for the parent-capable agent

- All tasks above are labeled `experiment1` to match the existing convention seen on related
  done/active tasks in `KNOWNS.snapshot.md`.
- Tasks 1, 4, 5, 6, 7 correspond to the §5 next-week plan (highest user impact).
- Tasks 8, 9, 10, 11, 12 correspond to §6 next-month plan items.
- Task 6 (Atlas/Market) is flagged `decision-needed` — it requires a product decision
  (hide vs. minimal-build) before implementation, similar in shape to
  `@task-owxy6h` (existing decision-needed task).

# Landnam Tester-Readiness Report (2026-06-11)

> Produced by a remote Claude Code session against `signal-k/planet-hunters-experiment-1`,
> branch `claude/landnam-tester-readiness-d40x64`. The local Mac paths referenced in the
> task brief (`~/Navigation/...`, `knowns` CLI, parent `.knowns`) are not present in this
> sandbox — `../.knowns` is unreachable and the `knowns` CLI is not installed. This report
> was written using `KNOWNS.snapshot.md`, `specs/` (symlinks to `.knowns`, mostly broken —
> fell back to reading implementation directly), and a live Playwright/Chromium playthrough
> of `web/` (`npm run dev`, fresh state, no PocketBase backend running — app runs fully
> "DATA LINK · OFFLINE").
>
> **Scope note:** the codebase has fully migrated to the Next.js web frontend
> (`f33799e` "Major architectural overhaul: migrate to web frontend and purge legacy
> Godot/mobile assets"). Godot docs/snapshot tasks referencing `.gd`/`.tscn`/AppController
> are archival — this report treats `web/` as the live product.

---

## 1. Recent bug status

| Task | Issue | Status (verified live) |
|---|---|---|
| `u5b5cb` Mission debrief dark-on-dark text / unreadable buttons / broken click order | Fixed in `3b11159`. Debrief screen now has a clearly amber "Resolve Cargo" / "Collect Reward" CTA flow and the click order (resolve → collect) works correctly end to end. **Partially residual:** the "RETURNED" headline and "FROM <body> · SOL III ORBIT RE-ENTRY" subtitle are still mid-grey on near-black (~3:1 contrast) — readable but below comfortable body-text contrast. | **Mostly fixed**, minor residual contrast issue |
| `638h3o` Rocket orientation / trajectory pointer in transition scene | Fixed in `d53a351`. Transit screen shows a single rocket icon angled correctly toward the target body, no stray direction arrow. | **Fixed** |
| `0u1hg4` Tutorial popup covering contractor panel / unreadable Choose button | Fixed in `6154cf8` for the contractor/mission-board panel. **However**, the same class of bug is still present on the M3 **Classify Signal** screen: the "Mission Coach" tutorial bar sits directly on top of the "NOT PLANET / Noise or binary" classification button, visually clipping its label until the coach is dismissed. | **Fixed for the original surface, not fully generalized** — new instance on classify screen |
| `70e538` / `jogaqx` PostHog feedback button + survey crash | Commit `70d92c9` wires inline PostHog surveys with cooldowns, replacing iframe rendering. Could not verify live (PostHog requires network access, which is blocked in this sandbox), but the code path no longer uses the iframe pattern that crashed on slow connections. | **Fixed in code**, not independently re-verified |
| `d8f8b4b` Cypress coverage for debrief/transit/mission board | Present in `web/cypress/`. Not run in this session (would require backend + full install/build cycle). | **Present, not executed** |

### New issue spotted during playtest (not in current backlog)
- On the Hub screen, immediately after building the Launchpad, a "BUILD REQUIRED → Control Station" sticky panel shows the mission-board teaser text truncated mid-word: **"1 contracts on the b…"** with no ellipsis-aware wrapping. Minor but visible on first session.
- The "Vehicle Unlocked" reward modal (shown after completing M1) renders in a visibly different frame — full 1280px-wide black canvas with the card centered, instead of the narrow portrait "phone" frame used by every other screen. This is a jarring visual break in an otherwise consistent presentation layer.

---

## 2. Playability score: **5.5 / 10**

**What works (evidence from live playthrough, fresh state):**
- The full M1 loop is mechanically complete and bug-free: Build → place Launchpad → Mission Board → target auto-recommended (433 Eros) → rocket assembly (pre-suggested compatible build) → transit (skippable) → mining minigame (tap-to-mine, contract-fill detection works) → debrief (cargo resolve → reward collect) → unlock reward (Starter Rocket 2).
- M2 (Silicon Mass Order) gating via "Build Control Station" works, costs deduct correctly, and M2 completes cleanly with the same loop, no tutorial coach friction.
- M3 introduces the citizen-science classification screen (TESS-451 b lightcurve), which renders a real chart (period/depth/event stats), two clear PLANET/NOT PLANET options, and a confidence-style "Candidate Confirmed" state before submit. After submission it flows directly into rocket assembly with the target pre-set — a clean "classify, then mine" loop.
- Tutorial coach (steps 1/8 → 8/8) successfully walks a brand-new player through the entire M1 loop with contextual one-line prompts and a "SKIP" escape hatch.
- Numbers, mineral chips, and contract-fill state ("MINING" → "FILLED") are visually legible against the dark theme.

**What's missing or broken for a stranger:**
- **Atlas and Market are non-functional stubs.** Bottom-nav "ATLAS" silently routes to the Missions screen (`GameApp.tsx:64`, `id === 'galaxy' ? 'missions' : ...`); "MARKET" does nothing and is permanently tagged "COMING SOON" on the hub. Two of five primary nav destinations lead nowhere distinct.
- **No backend / no persistence.** `DATA LINK · OFFLINE` is shown permanently; PocketBase calls 404/connection-refused silently. There is no auth screen reached in this build — the player drops straight into "Build a Launchpad" with no framing narrative ("why am I here, who am I working for").
- **Visual asset coverage is extremely thin.** Outside the Earth backdrop (`earth-day.jpg`/`earth-dusk.png`) and a handful of rocket-part icons, there is no art: the mining "asteroid field" is colored circles with element symbols on a brown radial gradient; targets in the Atlas/target-picker are dots on an SVG orbit diagram; no contractor portraits, no celestial body imagery. For a "space mining" pitch this under-delivers visually.
- **Submitted classifications go nowhere visible.** After "SUBMIT CLASSIFICATION", there's no confirmation that data was sent to a science database, no record of prior classifications, no consensus/agreement feedback — it's a UI gesture, not yet a citizen-science contribution loop a tester would trust.
- **Reward-modal frame break** (see §1) and **debrief contrast residue** (see §1) are small but visible polish gaps in an otherwise tight first-15-minutes experience.
- Economy pacing is odd at first glance: player starts with **10,000,000,000₣**, M1 pays **~1.2M₣**. The numbers are internally consistent but the scale difference (10 billion vs 1.2 million, i.e. <0.02% of starting balance) makes the first reward feel inconsequential — a new player has no sense that they "need" the money.

**Net:** the *mechanical* spine (mission → target → build → transit → mine → debrief → reward → unlock) is solid and enjoyable in isolation — it would score 7-8/10 on its own. The score is pulled down by: two of five nav destinations being dead ends, zero persistence/backend connection, very sparse art, and the citizen-science payoff (the actual point of the project) currently being a one-way gesture with no visible scientific value returned to the player.

---

## 3. Top 10 blockers to "public tester ready"

1. **No working backend connection in the shipped build.** Even a stub/local PocketBase or a mocked "offline mode" banner that explains *why* DATA LINK is offline is needed — testers will assume the game is broken.
2. **Atlas screen doesn't exist as its own screen** — it's a silent redirect to Missions. Per the design spec, Atlas is a primary navigation destination (concentric orbit map, body detail panels). Right now it's misleading nav.
3. **Market is a permanent "COMING SOON" stub** with no prices, sparkfields, or content — one of five bottom-nav items leads to a dead screen.
4. **No intro/onboarding narrative.** The first thing a tester sees is "Build → Launchpad", with no framing of who they are, what Earth Base is, or why they're mining asteroids for a citizen-science project. This matters enormously for retention and for testers understanding *why their classification matters*.
5. **Classification submissions have no visible outcome.** No confirmation toast, no "your classification has been recorded", no history/log of past classifications, no consensus or "X% of players agreed with you" feedback. This is the core science-output loop and currently feels like a no-op.
6. **Tutorial-overlay-over-interactive-element bug recurs on the Classify screen** (NOT PLANET button obscured) — same bug class as the fixed `0u1hg4`, needs a systemic fix (z-index/layout reservation rule), not a one-off patch.
7. **Reward-modal visual frame break** ("Vehicle Unlocked" renders outside the consistent portrait game-frame) — undermines visual polish on the very first dopamine moment.
8. **Asset sparsity.** No asteroid/Mars surface art, no celestial body sprites, no contractor portraits — current presentation reads as a wireframe/prototype rather than a game, which affects first impressions on itch.io/Reddit.
9. **No feedback/exit-survey verification possible offline**, and no in-app "Send Feedback" entry point was encountered during this playthrough (it may exist behind a menu not reached) — testers need a frictionless way to report bugs/impressions without leaving the app.
10. **M1→M2 economy/payout framing is confusing** (10B starting balance vs ~1.2M mission payout, "Iron ×12 ▲1,440" cargo bonus revealed only after a second tap on "Resolve Cargo") — new players won't understand what's "good" vs "bad" without a tutorial line explaining payout breakdown.

---

## 4. Smallest "done for now" finishing point

A defensible "done for now" milestone — the smallest scope that's honestly publishable to external testers without misleading them — is:

**"M1–M3 vertical slice, framed as a vertical slice."**

- M1 → M2 → M3 (classification) loop works exactly as it does today (it already does).
- Atlas and Market bottom-nav buttons are either (a) hidden/disabled with a "Not yet available" label instead of silently redirecting or showing a permanent dead "Coming soon" chip, or (b) Atlas is wired to a minimal real screen showing the orbit map + the bodies actually used by missions (Mercury/Mars/433 Eros/TESS-451 b etc.), even without a full detail panel.
- A one-screen "intro" panel on first load: who the player is (a fledgling space-program operator), what the citizen-science angle is (real TESS lightcurve data, your classifications matter), and a "this is an early playtest — tell us what you think" framing with a visible feedback entry point.
- Classification submission shows a **visible local confirmation** ("Classification recorded — thanks!"), even if real consensus/PostHog wiring lags behind.
- Fix the reward-modal frame break and the classify-screen tutorial overlap (both are small, contained CSS/layout fixes).
- A short "known issues / what's not in yet" note inside the app or itch.io page (Atlas detail, Market trading, M4/M5, mining variety) so testers calibrate expectations correctly.

This is roughly 3-5 days of focused work on top of what exists today, and it turns "a tech demo of M1-M3" into "an honest, framed, three-mission playtest slice" that can retain testers for one sitting and produce useful classification + feedback data.

---

## 5. Next-week plan (ordered by user impact)

1. **Fix the recurring tutorial-overlay-over-button bug class** (classify screen NOT PLANET button). Audit all "Mission Coach" overlay placements against interactive elements; add a layout rule that reserves space for the coach bar rather than overlaying it (per `CLAUDE.md` "UI Blocks Need Dedicated Layout Segments" — this rule already exists, just needs to be applied to the classify screen).
2. **Add a one-time intro/welcome screen** before "Build a Launchpad" — framing narrative + "this is a playtest, here's how to give feedback" (ties into `@task-illty2` already in the backlog).
3. **Add a visible classification-submission confirmation** (toast/modal: "Classification recorded. Thanks for contributing to TESS-451 b research.") even before consensus/backend wiring lands — closes the most important feedback loop for science-output framing.
4. **Fix the reward-modal frame break** so "Vehicle Unlocked" (and any future unlock modals) render inside the same portrait frame as the rest of the app.
5. **Resolve the truncated "BUILD REQUIRED" mission-teaser text** ("1 contracts on the b…") — small CSS fix, but visible in the first 5 minutes.
6. **Decide and implement Atlas/Market nav state**: either hide+disable both with clear "not yet" messaging, or (preferred, higher impact) stand up a minimal Atlas screen showing the orbit map of bodies already used by missions — reuses existing target-picker SVG/orbit code.
7. **Wire up or surface the feedback entry point** ("Need help / Send feedback" button per `@task-70e538`) somewhere reachable from the Hub — verify it doesn't crash without a live PocketHog connection (graceful fallback if offline).
8. **Smoke-test the offline/no-backend path explicitly** — make sure "DATA LINK · OFFLINE" doesn't silently drop progress (confirm local state persistence works without PocketBase), and consider a small "playing in local/offline mode" explainer so testers don't think their data is being lost.
9. **Add a debrief contrast pass**: bump "RETURNED" / "FROM <body>" text to a higher-contrast token consistent with `--ln-text` rather than `--ln-text-muted`.
10. **Run the existing Cypress suite** (`npm run test:e2e`) against the current build to catch regressions before any tester build goes out, and fix whatever breaks.

---

## 6. Next-month plan (ordered by retention / science output)

1. **Real classification provenance + consensus pipeline**: persist classifications (player id/session, target id, verdict, confidence, timestamp) to the shared backend `classifications` collection; add a minimal "your classification history" view and a basic consensus indicator ("3 of 5 testers called this a planet").
2. **M4 ("Signal in the Dark") brought online** with the same classify→mine loop, retiring the dead-code references (`@task-LANaa6vht`) so the mission chain feels complete to L3.
3. **Daily/weekly engagement hooks**: a simple "new contract available today" or "new TESS candidate to classify" rotation so returning players have a reason to come back (even a static rotation seeded by date is enough for a playtest).
4. **Discovery log / classification history screen**: a persistent record of every body the player has classified and what the community consensus became — this is both a retention hook and a science-output artifact.
5. **Contractor progression/affinity made visible**: surface the affinity numbers already computed in mission payouts (mission spec includes `+affinity` per contractor) in a Contractors screen, so repeat play has a visible "relationship" arc.
6. **Stand up a minimal Atlas screen** with real body data (orbit rings, body chips, filter by type/classification status) — even without rich art, this closes one of the two dead nav items and gives the citizen-science "map of what's been studied" framing.
7. **Calibration/gold-standard tasks**: mix in a small number of TESS lightcurves with known answers (confirmed planets / confirmed false positives) to (a) calibrate new-tester accuracy and (b) give the team a baseline for trusting consensus from the rest of the data.
8. **Export pipeline for classification data**: a simple admin/export script (CSV/JSON) of all classifications + consensus, so "useful science output" is a tangible deliverable, not just a database table.
9. **Richer task types beyond the single lightcurve view**: e.g., a second classification template (binary vs. eclipsing-binary morphology), or letting players flag "noisy data, can't tell" distinctly from "not a planet" (the spec already lists UNCERTAIN and ECLIPSING BINARY as intended verdicts — only PLANET/NOT PLANET are wired in the live build).
10. **Asset pass on the highest-visibility screens** (mining surface art per target body, at least 2-3 contractor portraits, target body sprites for Atlas/target-picker) — see §10 for sourcing approach.

---

## 7. Cheap user-acquisition plan

- **itch.io page**: publish the M1-M3 vertical slice as an HTML5/web build with a clear "Playtest build — 15-20 min, real space-telescope data, feedback wanted" framing. Tag it `citizen-science`, `space`, `idle/management`, `web`. Itch.io devlogs are free and indexable — post a short devlog with a GIF of the mining loop.
- **Reddit**: r/IndieDev, r/playmygame, r/incremental_games (the management/reward loop fits), and science-adjacent subs like r/Astronomy or r/CitizenScience for the "real TESS data" hook specifically. Be upfront that it's an early playtest and you want classification feedback, not just gameplay feedback — citizen-science communities respond well to "your input becomes real data."
- **Discord**: Zooniverse-adjacent and amateur-astronomy Discords (many planet-hunting citizen-science Discords already exist) — a short pinned message with the itch.io link and a 1-2 sentence pitch tends to get a handful of curious testers without being spammy.
- **Short videos**: a 30-60s vertical clip (TikTok/Shorts/Reels) showing the mining-tap loop + the lightcurve classification screen back to back — "I mine asteroids AND help find real exoplanets" is a strong, simple hook. Doesn't need narration, just on-screen captions.
- **Astronomy/student communities**: university astronomy clubs and intro-astro course Discords/forums are a good fit for the classification angle specifically — frame it as "help us validate TESS candidates, takes 2 minutes."
- **Friend-of-friend testing**: the cheapest, highest-signal channel. A short Google Form (5 questions: did you get stuck anywhere, did anything look broken, did the mining loop feel rewarding, did you understand the classification task, would you come back) linked from a "Send Feedback" button covers most of what the PostHog exit survey already asks — useful as a fallback if PostHog is unreachable for early testers.

---

## 8. Retention plan

- **Daily target**: "1 new contract on the board" — even a static rotation (different mission/target combos by day-of-week) gives returning players a reason to check in. Doesn't require new mechanics, just data.
- **Weekly target**: "1 new TESS candidate to classify" — ties retention directly to the science-output goal. A weekly batch of 3-5 candidates, rotated, with a visible "X candidates classified this week by the community" counter.
- **Discovery log**: persistent per-player history of (a) missions completed, (b) bodies visited, (c) candidates classified + verdict given. This is both a retention artifact (players like seeing their own history) and a science-output artifact (the data is the point).
- **Contractor progression**: surface affinity (already computed per mission, see `MISSIONS` data in `lib/data.ts`) as a simple per-contractor relationship meter on a Contractors screen. Unlocking better contracts/payouts at higher affinity gives a mid-term goal beyond the M1-M5 chain.
- **Consensus notifications**: when a candidate the player classified reaches consensus (or is later confirmed/rejected by the science team), surface a lightweight notification ("Your call on TESS-451 b matched the consensus!" / "New consensus reached on a candidate you classified"). This is the single highest-leverage retention feature for a citizen-science game — it's the moment the player feels their contribution mattered.
- **Feedback loops**: keep the PostHog micro-surveys (already implemented, gated behind mechanic use per `@task-fwzxys`) but add a lightweight in-app "this session in numbers" debrief on exit (missions done, candidates classified, francs earned) — gives players a sense of progress even in a short session.

---

## 9. Scientific-output plan

- **Provenance**: every classification record should capture player/session id, target/candidate id (`shared_body_id` per `CLAUDE.md` cross-instance reference convention), verdict, confidence (the spec calls for a confidence slider — only binary PLANET/NOT PLANET buttons are wired in the live build today), timestamp, and which mission/contract context it was completed under.
- **Calibration / gold-standard tasks**: seed a known-answer subset of candidates (confirmed planets, confirmed false positives/eclipsing binaries) into the rotation, hidden from players, to (a) measure individual accuracy for weighting consensus and (b) validate the overall pipeline before trusting community consensus on novel candidates.
- **Consensus**: aggregate multiple players' verdicts per candidate (majority vote weighted by calibration accuracy once available); surface aggregate state back to players (see §8 "consensus notifications") and to the team via an admin view.
- **Exports**: a simple periodic export (CSV/JSON) of `classifications` joined with `celestial_bodies`/candidate metadata — even a manual `pb` query + script is enough for a playtest-scale dataset; automate later.
- **Richer task types beyond lightcurve graphs**: the spec already enumerates PLANET / NOT PLANET / ECLIPSING BINARY / UNCERTAIN — only the first two are implemented. Adding ECLIPSING BINARY and UNCERTAIN as real options (even without new visualizations) increases the granularity and honesty of the data immediately. Beyond that: vetting/triage tasks (e.g., "does this lightcurve have obvious instrumental noise?"), or simple multi-candidate comparison tasks, would diversify the science contribution without requiring new chart types.

---

## 10. Asset plan

**Current state**: ~50 files in `public/`, almost entirely fonts, nav/UI icons, Earth backdrop (day/dusk), and a dozen rocket-part thumbnails (`public/parts/*.png`). There is **no** asteroid/planet/surface art, no contractor portraits, and the mining minigame is rendered as colored circles with element-symbol labels.

**Recommendations**:
- **Keep the existing style as the source of truth.** The rocket-part icons and Earth backdrops establish a consistent flat/illustrated sci-fi style (muted blues/ambers, soft gradients). Any new art should match this palette and line weight rather than introducing a new style.
- **Use AI image generation for placeholder/iteration speed, but plan a consistency pass.** Generate candidate asteroid-surface backdrops, body sprites (Mars, 433 Eros, Vesta, Psyche, Bennu, Ceres, TESS-451 b as a stylized exoplanet), and 4-6 contractor portrait icons using a tightly-scoped prompt template derived from the existing Earth backdrop's style (same prompt-batch approach already referenced in the backlog — `@task-LANj6tbdr`, `@task-LANci4oe8`, `@task-LANxx1lbc`). Run small batches (4-6 images) and have a human pick winners rather than generating everything at once.
- **Legal/licensing**: for AI-generated assets, keep a record of the generation tool/version and prompts used per asset (a simple `ASSETS.md` manifest) — this matters if the game is later monetized or if generated-content policies change. For anything sourced from real telescope imagery (e.g., actual TESS/Kepler mission graphics for flavor), use only NASA/public-domain sources (NASA media is generally public domain) and credit appropriately — do not use copyrighted third-party space art without a license.
- **Prioritize by visibility**: (1) mining-surface backdrops per target body (replaces the brown gradient — biggest visual upgrade for the core loop), (2) target-body sprites for the orbit/target picker (currently plain dots), (3) contractor portraits (currently text initials in colored chips), (4) Atlas screen body glyphs once Atlas is built out.
- **Keep file sizes small and provide `-sm` variants** following the existing `earth-day.png` / `earth-day-sm.png` pattern for PWA performance (per `@task-nsr4af`).

---

## 11. Implementation tickets (proposed)

The `knowns` CLI and `../.knowns` are not reachable from this sandbox, so these are written as
**proposals** for a parent-capable agent to create via `knowns task create` (per
`.knowns-bridge.json` / `KNOWNS.snapshot.md`). See
`.knowns-outbox/2026-06-11-proposed-tasks.md` for the structured list.

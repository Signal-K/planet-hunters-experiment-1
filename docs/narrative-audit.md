# Narrative audit: one playable agency loop

## Decision

Landnam is an agency game, not a container for unrelated feature tracks. The
shipped narrative has five player-facing stops:

1. **Plan:** place the launchpad once, then choose a contract or Free Ops,
   target, and an auto-suggested ship in one decision surface.
2. **Launch:** assemble and commit the selected vehicle in one scene.
3. **Flight:** transit and landing are one animated, zero-tap sequence.
4. **Work:** mine, survey, or deliver through the object in the scene.
5. **Result:** settle cargo, payout, and return to the base.

Completing the initial contract teaches storage and unlocks free operations.
The telescope is an optional extension of that loop. Orionids is a mining
variant: enter a ready mining run, fire the ship laser, return to the normal
result. It is not a second onboarding, rover quest, badge programme, quiz, or
parallel progression chain.

## Source audit

The Craft binding flow specifies launchpad-to-free-operations and explicitly
parks Academy and refinery work. Its storyboard index limits the near-term game
to first-place/first-launch and the same yard with board overlays. The newer
Craft progression review identifies the current ten-screen contract sequence
as the primary friction and recommends the five stops above, in order: Plan
merge, Launch merge, Result merge. The bare-minimum review likewise restricts
R1 to the working agency loop.

## Applied overhaul

- Scene Studio is a blueprint and build-contract harness. It renders the
  authored object graph and lists the web fixture and iOS `SceneCatalog`
  fixture; it never loads a second game in an iframe.
- `qa/scenes.json` carries a compact mission harness registry. Each entry has
  a direct web preset, iOS fixture, objective, and completion condition.
- Shipped authoring missions require a `[harness]` contract. The contract is
  compiled with their shared declaration so web and iOS builds share one
  source.
- The retired storyboard, its comments, native screenshot generation, and
  browser-matrix documentation are removed.
- The primary active mission fixtures are Flight Plan, Client Contract, Belt
  Courier, Self-Directed Mining, Telescope Launch, and Orionids Shower.
- The harness defines the five-stop contract now. Remaining route adapters are
  compatibility seams, not new narrative beats. They are merged in the Craft
  order instead of spawning special event paths.

## Rule for new work

Do not add a screen or mission because an old subsystem exists. Add it only
when it extends this loop and ships with an independent fixture for both web
and iOS. Otherwise leave it outside the active narrative surface.

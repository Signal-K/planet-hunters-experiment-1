# Minimal founds its base in front of you (2026-11-19)

Liam: "As part of the storymode, you first need to clear out the terrain, flatten it, and then place your agency and build the launchpad. We need to see the structures getting built, and roads developed over time." The art comes from a new TakeOn asset engine, built as a module and imported into Minimal.

## Rule

- The story opens with **Groundbreaking** (chapter 0), four quick actions on one scene:
  1. CLEAR GROUND: dozers sweep the boulders and scrub.
  2. FLATTEN: the lumps are graded level.
  3. PLACE AGENCY: the HQ rises from stakes and a slab, inside scaffold, with a crane.
  4. BUILD LAUNCH PAD: the pad rises, then a road is paved from the agency to it.
- Home is the player's own base. It is unbroken ground until Groundbreaking is done. After that, each finished chapter adds one building, and a road from the agency is laid to it. The new building goes up on the home screen at the end of the run.
- Structures are drawn by TakeOn's kit (`@takeon/engine/kit`, KES-533), not by Minimal. Minimal imports the kit for building names and passes its base to TakeOn's minimal scene (`base`, `handle.step`).
- All of this is drawing only. TakeOn's world, its generation and Landnam's save are unchanged. The base comes from Minimal's own chapter progress.

## Where

- Chapter list and the building each chapter adds: `minimal/src/chapters.ts`.
- The base derived from progress: `minimal/src/progress.ts`, `baseFor`.
- The Groundbreaking run: `minimal/src/RunScene.tsx`, `FoundRun`.
- TakeOn: `packages/engine/src/kit/` and `packages/engine/src/minimal/scene.ts`.

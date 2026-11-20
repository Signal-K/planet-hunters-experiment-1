# Base objects share one physics world (2026-11-20)

Liam: "Can you add more lines and make sure that everything is existing as game objects, with physics that apply to all objects?"

## Rule

- Everything on a base site is a game object with a body in one physics world (TakeOn kit, `packages/engine/src/kit/physics.ts`, KES-535). That covers rocks, scrub, crates, fuel drums, street lamps, power poles, buildings and machines. Nothing is drawn on a site that is not an object.
- The same rules apply to every object:
  - gravity, set from the body's own pull;
  - sliding down slopes;
  - friction;
  - collisions;
  - sleep at rest.
  Debris, crates and drums move; machines push; buildings, lamps and poles stand fixed.
- Ground work moves objects; it does not delete them. CLEAR GROUND shoves the rocks and scrub out to heaps at the rim. Crates and drums are dropped beside each finished store and settle where they land.
- The base has more lines:
  - roads grow as a network, each new road branching off the nearest one already laid;
  - an entry road comes into the base;
  - every road gets street lamps;
  - once the solar farm stands, power poles carry cable along new roads, joined into one grid.
- Base buildings can be tapped on the home screen: a tap rings the building and shows its name and what it does.
- All of this is still drawing only. The physics runs at a fixed 60 Hz in the kit, not in TakeOn's 10 Hz sim, and nothing about it is saved.

## Where

- TakeOn: `kit/physics.ts`, `kit/site.ts` (`objects()`, `wires()`, `pick()`), `kit/ground.ts` (props), `render/renderer.ts` (`pushSiteEntities`, `pickSite`).
- Minimal: `minimal/src/RunScene.tsx`, `HomeScene`.

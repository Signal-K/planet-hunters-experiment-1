# Vendored takeon packages

`@takeon/engine` and `@takeon/pixi` come from [signal-k/takeon](https://github.com/signal-k/takeon),
a separate repo — not an npm-published package (its `publishConfig` targets
public npm, but the repo is still early/single-branch, so we're not
publishing real versions yet) and not folded into this monorepo.

Until takeon publishes to npm, we vendor built tarballs here and consume them
via npm's `file:` protocol (`web/package.json` → `"@takeon/engine": "file:vendor/takeon/takeon-engine-0.2.0.tgz"`).
This needs zero extra network access at `npm ci`/Docker-build time (the
tarball is just a committed file), and keeps takeon's git history and PRs
fully independent of Landnam's.

## Updating to a newer takeon build

From a checkout of `signal-k/takeon` (any branch/commit you want to pull in):

```bash
npm install        # once, or after taking a new commit
npm run build       # builds @takeon/engine and @takeon/pixi
cd packages/engine && npm pack && cd ../..
cd packages/pixi-adapter && npm pack && cd ../..
```

Copy the resulting `takeon-engine-<version>.tgz` and `takeon-pixi-<version>.tgz`
into this directory (replacing the old ones — delete the old tarball if the
version number changed), then in `web/`:

```bash
npm install   # picks up the new tarball, updates package-lock.json
```

Bump the version in the `file:` path in `package.json` if takeon's version
number changed.

## 2026-08-19: `@takeon/pixi` 0.2.0 → 0.2.1 (render fix)

`mountRoverGame()`'s per-frame `refresh()` called PixiJS v8's
`Texture.update()` (which only refreshes UV frame data, not GPU pixel
content — see its own docstring) instead of the correct
`texture.source.update()`, because `texture.update` is always truthy on a
v8 `Texture` so the `else if` branch holding the correct call was dead
code. Net effect: the rover canvas rendered solid black everywhere it was
mounted (Landnam KES-201) — the sim ran correctly, but nothing ever
painted after the first (still-blank) frame.

Fixed upstream in `signal-k/takeon`, `packages/pixi-adapter/src/index.ts`
(branch `claude/rover-game-module-eq347o` as of this vendoring — not yet
merged/tagged on takeon's default branch or published to npm). `@takeon/engine`
is untouched, still 0.2.0.

## 2026-08-19: `@takeon/pixi` 0.2.1 → 0.2.2 (PWA lifecycle)

Landnam starts and pauses the mount through `MountedRoverGame` rather than
leaving a per-frame texture upload attached for the lifetime of its Pixi app.
The adapter now detaches presentation completely while a PWA is hidden and
caps active canvas-to-texture uploads at 30 fps by default; its deterministic
simulation remains fixed at 10 Hz. The installed Landnam shell warms the
hashed Takeon/Pixi chunks only at browser idle, then the service worker retains
them for offline Surface Ops. No Takeon PWA, backend, or second identity store
is introduced.

## Graduating off this pattern

Once takeon stabilizes (PR review settles, more than one consumer exists),
swap this for a real npm dependency once it's published to the registry —
no code changes needed elsewhere, just the `package.json` dependency line.

## 2026-10-08: `@takeon/engine` 0.2.1 → 0.2.2 (light backdrop, local patch, SSL-482)
Landnam-local repack of the 0.2.1 engine: the flat map backdrop uses the body's `skyNight` directly (was mixed 45% toward #05070f), void tiles are the ice backdrop (188,215,234) instead of near-black (8,10,20), and the minimap background is ice. Without this the Cargo Transfer field sat in a black square on the light blueprint UI. Re-apply on any engine upgrade.

## Local patches

`takeon-engine-0.2.3.tgz` / `takeon-pixi-0.2.3.tgz` are the 0.2.2 builds with
"a scene only has a rover when it brings one" applied to the compiled output:
`spec` is optional on `RoverGameOptions` / `Simulation`; with no spec the game
draws no rover (iso and flat views), and `showRover` overrides. The same change
is on the `landnam/show-rover` branch of signal-k/takeon. The 0.2.2 build was
ahead of that repo's `main`, so it was patched in place rather than rebuilt.

## 2026-11-21: `@takeon/engine` 0.2.4 → 0.2.5 (the 3D field, KES-543)

Landnam-local repack, same pattern as 0.2.3: the vendored 0.2.4 build plus
`dist/field/` from signal-k/takeon (`packages/engine/src/field`) and a
`./field` entry in `exports`. Landnam imports it as `@takeon/engine/field`
(dynamically, client only) for `FieldMiningScreen`. The field only depends on
`util/rng`, `util/noise` and `types`, which are byte-identical between the two
builds, so nothing else in 0.2.4 changed. To refresh the field: build the
engine in takeon, replace `package/dist/field` in the unpacked tarball, repack,
and update the `integrity` of `node_modules/@takeon/engine` in
`package-lock.json` (npm reuses the cached tarball otherwise).

## 2026-11-21: `@takeon/engine` 0.2.5 → 0.2.6 (block rovers, rocket types, KES-543)

Same repack as 0.2.5 with a fresh `dist/field/`: the field rover is built from
Haphazard Martians blocks (hex nodes, braced girders, wheels on the end columns,
a blue Navcam mast) and is 1.8 m over the wheels, and `ship` picks Landnam's
rocket type for the orbit pass (`explorer`, `prospector`, `surveyor`).

## 2026-11-21: `@takeon/engine` 0.2.6 → 0.2.7 (off-screen pointers, KES-543)

Same repack with a fresh `dist/field/`: off-screen ore pointers that point the
same way share one arrow, labelled with the nearest distance and a count of the
rest (`70 m +2`), ore already in view gets no pointer unless it sits under the
HUD, and labels stay fully on screen, so they no longer overlap.

## 2026-11-21: `@takeon/engine` 0.2.7 → 0.2.8 (only probes scan, KES-543)

Same repack with a fresh `dist/field/`: the field has no `scan()` and no scan
pulse. Rockets and rovers never scan; the seams the probe survey mapped
(`surveyed`, every seam by default) are on the ground from the first frame,
`surveyed()` lists them and `reveal(ids)` adds more.

## 2026-11-22: `@takeon/engine` 0.2.8 → 0.2.9 (one light, no plum grade)

Built from signal-k/takeon `claude/landnam-simplified-version-gggep2`. The field's
comic pass no longer multiplies every dark pixel by violet and adds 25%
saturation (Bennu read purple edge to edge, icy fields neon cyan); it keeps the
ground's own hue with a slight cool/warm split. Also brings the KES-546/547 iso
lighting: one sun, highlights that roll off, and cliff faces lit by that sun.

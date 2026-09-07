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

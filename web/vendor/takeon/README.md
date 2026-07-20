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

## Graduating off this pattern

Once takeon stabilizes (PR review settles, more than one consumer exists),
swap this for a real npm dependency once it's published to the registry —
no code changes needed elsewhere, just the `package.json` dependency line.

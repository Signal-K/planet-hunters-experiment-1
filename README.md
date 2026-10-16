# Landnám

A space-program game with independent Free Ops (mine, survey, build and trade) and optional client contracts. Ships as a Next.js web/PWA app and a SwiftUI app for iOS, iPadOS and macOS.

Read [AGENTS.md](AGENTS.md) before changing the game. Linear is the tracker; ZenNotes in the parent Navigation workspace holds durable decisions. Every gameplay change proceeds through web and native consecutively.

## Start

Node.js 24+ for web; Xcode and Swift for native. Install dependencies explicitly, then start locally:

```sh
node scripts/agent-check.mjs
cd web
npm ci
npm run dev
```

`make up` starts the Docker frontend and parent-owned local backends. It performs no dependency download at startup. Inspect existing services before starting another server. See [native/README.md](native/README.md) for native builds.

## Verify

From `web/`:

```sh
npm run typecheck
npm run test:unit -- lib/path/to/changed.test.ts
npm run test:scenes -- screens.spec.ts --grep 'transport-delivery'
npm run sync:shared -- --check
```

Use actual affected test paths. Omit filters for a full batch after implementation; do not run the entire suite after every edit. Playwright covers scenes and real flows. Cypress is retired. Native domain tests run with `swift test --package-path native/LandnamCore` from the root. Rendered evidence and platform coverage requirements live in AGENTS.md.

## Sources and deployment

- `web/`: game routes, React UI, PixiJS scenes and tests.
- `native/`: SwiftUI/SpriteKit app, LandnamCore model and TakeonKit.
- `shared/`: generated palette inputs and shared layout data; see [shared/README.md](shared/README.md).
- `pocketbase/`: game backend; ecosystem identity is owned by the parent workspace backend.
- [Game theme](docs/design/game-theme-spec.md): deep dusk worlds with blueprint UI chrome.

Work directly on `cycle/4`. Pushing `cycle/**` triggers staging deployment; `main` deploys production. Do not push to main. CI and deployment run separately; local tests do not prove deployment. Do not use `deploy:cf` as a staging shortcut: it targets production by default.

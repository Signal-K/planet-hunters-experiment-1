# Cloudflare Worker SSR memory guardrails

`landnam-web` is an OpenNext Worker. Authenticated `/game/*` requests used to
server-render the entire interactive game layout even though it is an SPA. That
loaded the game provider, catalog barrel, screen router, and scene dependency
graph during Worker SSR. The result was intermittent Error 1102 (HTTP 503) at
low CPU time. Cloudflare uses 1102 for both CPU and memory
([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)):
the dashboard splits them into Exceeded CPU Time Limits (`exceededCpu`) and
Exceeded Memory (`exceededMemory`). A 1102 at low CPU time is the memory case.

## What changed

- The `(main)` game layout and its route synchroniser now load with
  `next/dynamic(..., { ssr: false })` from small client boundaries.
- `/game/[screen]/page.tsx` is a Server Component. It imports only the screen
  name list (`lib/game-screens.ts`) and a client shell. It does not import
  `GameScreenRouter`, `@/lib/data`, `@/game-context`, or Pixi.
- `ScreenRouteClient` reads `VALID_SCREENS` from that same list, not from
  `GameScreenRouter`. The router module statically imports the catalog, Hub,
  and the screen graph; pulling it into the route synchroniser was enough to
  put that graph on the server compile of the page.
- `generateStaticParams()` prebuilds one loading shell per gameplay route,
  including `/game/hub` and `/game/mission-history`. `dynamicParams = false`
  rejects any other name without a Worker render.
- The Worker returns only the loading shell for these SPA routes; catalog and
  scene code loads in the browser, where it is needed for hydration.
- This deliberately does not change game data, authentication, or Cloudflare
  account settings.

## Server import evidence

No `.open-next` / wrangler worker artifact was present in the workspace, so
the deployed worker byte size was not measured. The server module graph for
an authenticated hub or mission-history request is:

| Module | Role | Heavy imports |
| --- | --- | --- |
| `app/layout.tsx` | root document | brand copy and CSS only |
| `app/game/(main)/layout.tsx` | client boundary | `next/dynamic` with `ssr: false` |
| `app/game/(main)/[screen]/page.tsx` | static shell | `lib/game-screens.ts` (names only) |
| `ScreenPageClient.tsx` | client boundary | `next/dynamic` with `ssr: false` |

`GameLayoutClient` still imports the provider, catalog, and `GameScreenRouter`,
and that is the client chunk. It is not evaluated while the Worker builds the
HTML shell.

## Required Worker configuration

- Keep `compatibility_flags: ["nodejs_compat"]` in `wrangler.jsonc`; OpenNext
  uses Node compatibility APIs in the Worker runtime. Keep the compatibility
  date current when updating OpenNext/Next, and test the authenticated shell
  after doing so.
- `usage_model: "standard"` is the appropriate Worker model if it is set in
  the Cloudflare dashboard/deployment configuration. Do not add a speculative
  `limits.cpu_ms` setting: limits are plan-dependent and a CPU override cannot
  raise the Worker memory ceiling.
- Smart Placement can reduce origin latency for the PocketBase-backed app, but
  it is an account/deployment routing choice, not a fix for Error 1102. Enable
  it only after measuring authenticated latency and checking regional origin
  behaviour.
- Memory is 128 MB per isolate, including the JavaScript heap. It is not a
  `wrangler.jsonc` setting. `limits.cpu_ms` on the Workers Paid plan raises
  only the CPU budget (default 30s, up to 300s). It does not raise the memory
  ceiling, so it cannot clear an `exceededMemory` 1102. The fix is to stop SSR
  of the game graph.
- Avoid server imports of the whole game catalog, Pixi/Three, image payloads,
  or large JSON on request paths. Prefer client-only dynamic imports for the
  SPA, static shells from `generateStaticParams`, and static assets for large
  data.
- Keep `observability.enabled: true` (already configured) and retain Workers
  Logs/Analytics for error correlation.

## Verify after a deploy

1. Sign in and repeatedly load `/game/hub`, `/game/mission-history`,
   `/game/launchpad`, and `/game/instrument-hub`; include cold loads, not only
   client navigations.
2. In Workers Analytics, open `landnam-web` → Metrics → Errors → Invocation
   Statuses. Compare Exceeded Memory (`exceededMemory`) for the new version
   with the previous one. Exceeded CPU Time Limits is a different 1102 and is
   not this bug. Both roll up into `exceededResources` on
   `workersInvocationsAdaptive`, so that field alone cannot tell them apart.
3. Check Worker Logs for 1102 events and inspect CPU and wall time separately.
   A low CPU reading with Exceeded Memory is the isolate heap, not a reason to
   set `limits.cpu_ms`.
4. Confirm the browser receives the loading shell and then the normal game UI;
   the game is intentionally client-rendered on these routes.

No deployment or Cloudflare account configuration was changed by this patch.

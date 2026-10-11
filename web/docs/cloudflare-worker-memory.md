# Cloudflare Worker SSR memory guardrails

`landnam-web` is an OpenNext Worker. Authenticated `/game/*` requests used to
server-render the entire interactive game layout even though it is an SPA. That
loaded the game provider, catalog barrel, screen router, and scene dependency
graph during Worker SSR. The result was intermittent Error 1102 (HTTP 503) at
low CPU time, which points to a Worker resource/memory limit rather than a CPU
limit.

## What changed

- The `(main)` game layout and its route synchroniser now load with
  `next/dynamic(..., { ssr: false })` from small client boundaries.
- The Worker returns only the loading shell for these SPA routes; catalog and
  scene code loads in the browser, where it is needed for hydration.
- This deliberately does not change game data, authentication, or Cloudflare
  account settings.

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
- Workers have a fixed per-isolate memory ceiling; it is not configurable in
  `wrangler.jsonc`. Avoid server imports of the whole game catalog, Pixi/Three,
  image payloads, or large JSON on request paths. Prefer client-only dynamic
  imports for the SPA and static assets for large data.
- Keep `observability.enabled: true` (already configured) and retain Workers
  Logs/Analytics for error correlation.

## Verify after a deploy

1. Sign in and repeatedly load `/game/hub`, `/game/mission-history`,
   `/game/launchpad`, and `/game/instrument-hub`; include cold loads, not only
   client navigations.
2. In Workers Analytics (or the GraphQL `workersInvocationsAdaptive` query),
   filter `landnam-web` and compare `exceededResources` for the new version
   against the prior one. It must remain at zero under a meaningful set of
   authenticated requests.
3. Check Worker Logs for 1102/resource-limit events and inspect CPU and wall
   time separately. A low CPU reading does not rule out memory pressure.
4. Confirm the browser receives the loading shell and then the normal game UI;
   the game is intentionally client-rendered on these routes.

No deployment or Cloudflare account configuration was changed by this patch.

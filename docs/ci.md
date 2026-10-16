# CI

`ci.yml` is the cycle/4 gate. It runs two independent jobs on every push and pull request to `cycle/4`:

| Job | Command | Evidence |
| --- | --- | --- |
| Typecheck, unit tests, build | `tsc --noEmit`, `npm run test:unit`, `npm run build` | job log |
| Playwright scenes | `npm run test:scenes` on Linux Chromium | HTML report, JSON result and scene screenshots |

`CI required` is the aggregate status check. It succeeds only when both jobs succeed; configure branch protection to require that one check.

The scene job installs the Playwright Chromium revision and always uploads `web/tests/.report` and `web/tests/.out`. This is intentionally not a staging or backend acceptance test: staged sign-up, persistence, reconnect and sync remain SSL-508 coverage.

For local macOS runs, use the installed Chrome channel:

```bash
cd web
SCENES_CHANNEL=chrome npm run test:scenes
```

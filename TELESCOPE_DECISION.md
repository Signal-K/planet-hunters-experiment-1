# TELESCOPE_DECISION

## Decision from Liam (13 Oct)

The Transit Telescope and the Deep Space Telescope are the same instrument, so merge them into one telescope on both web and native.

- The telescope counts as launched or online when `transitSatelliteLaunchedAt` or `deepSpaceTelescopeBuilt`/`LaunchedAt` is set. Migrate existing saves so that liam@skinetics.tech, whose transit telescope was launched on 17 Sep at level 2, shows the telescope online with asteroid discovery unlocked.
- Remove the separate 'Launch Deep Space Telescope' mission and card.
- Fix the 'No reachable target with your current rocket parts' lock.
- Use one name in the UI.
- One commit with all changed files, pushed to cycle/4 with `git push origin HEAD:cycle/4`.

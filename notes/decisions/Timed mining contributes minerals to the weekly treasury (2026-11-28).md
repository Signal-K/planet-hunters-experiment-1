# Timed mining and the weekly treasury

Liam, 28 November 2026: limited asteroid and comet targets must be prominent on the map, with information revealed on selection. Mining requires a short challenge. Minerals contribute to the week's community treasury, visible in Community Research; retain the contribution history for future content.

The implemented first version reserves one share on Send, then asks the player to stop a moving marker in a highlighted pocket three times. Asteroids contribute 10 iron; comets contribute 10 hydrogen. Misses allow another pass. Delivery requires three server-confirmed hits and credits once, even if the reserved target has expired. These quantities are implementation defaults, not previously approved economy values.

The PocketBase `claims` record is the treasury receipt: user, anomaly, kind, mineral, units, hits, completed (UTC milliseconds), week (Monday UTC), and collected. Generic writes are locked. `/api/anomalies/treasury?week=YYYY-MM-DD` sums collected receipts for that week. Delivery assigns its week using server completion time. Weekly pages remain queryable for later content; no future unlock or spending mechanic is implied.

Keep verification bounded: focused reservation/challenge/delivery tests plus one desktop and portrait inspection. Record environmental blockers separately; do not spend repeated attempts rebuilding the toolchain.

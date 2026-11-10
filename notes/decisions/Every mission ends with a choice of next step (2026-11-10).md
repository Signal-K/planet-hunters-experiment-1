# Every mission ends with a choice of next step (2026-11-10)

Liam: each mission type exits to explore further, comment and share, do another, reposition telescope, or back to the hub.

- The debrief offers **Explore further** (Data hub), **Do another** (Mission Board for contracts and shower runs, launchpad for the player's own program operations) and **Reposition telescope** (sky pointing, program operations only). The existing "Complete mission · return to Base" button stays as the default way back to the hub.
- Each exit collects the reward first, then moves on. The guided first missions keep one door, back to Base.
- **Comment and share** (a message board) is not built or shown until cycle 10. When it exists, each vote and comment there will also add community research points.
- Logic lives in `web/lib/debrief-exits.ts`; the screen only draws what it returns.

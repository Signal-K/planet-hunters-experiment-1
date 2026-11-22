## Cycle 11 additions — 22–28 November 2026
Liam authorised these additions and implementation on 22 November. Target dates are a working order, not automatic completion claims.

| Window | Ticket | Outcome |
| --- | --- | --- |
| 22–23 Nov | SSL-878 | Probe findings in planning and fitting |
| 23–24 Nov | SSL-879 | Mapped sectors inform mining seams; depends on SSL-878 |
| 24–25 Nov | SSL-880 | One confirmed discovery to optional follow-up flight |
| 25–26 Nov | SSL-881 | Player-chosen build to feasible next material run |
| 26–27 Nov | SSL-882 | Remote operation cargo ferry; depends on SSL-881 and confirmed supported production |
| 27–28 Nov | SSL-883 | Truthful research/event contribution and next action; integrated review |

Existing SSL-806 (tactile instrument controls) moved into Cycle 11, target 24 Nov. SSL-832 still needs the higher scan activities defined; SSL-877 account saves remains in review. SSL-870 retains the mission template programme; the additions integrate with it rather than duplicate it.

For efficient implementation, keep one scene per slice and one active implementation owner per shared area. Reuse the probe evidence selector across SSL-878/879/880, and existing construction and storage rules across SSL-881/882. Record bounded file entry points, actual proof and caveats in each ticket. Do not repeatedly read the whole repository or add redundant tests. Target dates can move if acceptance exposes a dependency.

These additions preserve the player-owned agency sandbox. Only probes scan. Existing multi-trip construction (SSL-840), discovery work (SSL-387/594/580), research receipts and programme (SSL-849/852), and historical ferry (SSL-247) must be checked before extending them. Do not revive deleted academy/crew/land-rights systems.

## Current handoff

SSL-878 starts with the existing mission-planner scene. Its first slice introduces a pure downloaded/shared sector evidence selector and displays findings beside the destination and mineral choice. Existing probe targeted runs are already present; do not rebuild them. Remaining slices: carry selected evidence through the probe handoff and launch fitting, with existing native planner deferral respected.

Verification of the first slice: web typecheck passed; 8 focused tests passed; `make test` passed (1,350 web tests, one skipped, authoring and shared Go checks). Local disposable mission-planner fixture showed two downloaded Eros sectors and estimates; changing destination to Mercury showed the composition-only state and saving retained ordinary requirements and a feasible rocket. Screenshots 604–623 cover before/after, phone portrait/landscape, both tablet orientations and desktop, with no reported browser errors. This is fixture evidence, not a signed-in campaign playthrough. Native planner remains deferred by SSL-851; only generated scene metadata changed there.

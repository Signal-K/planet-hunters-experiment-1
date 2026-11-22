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

SSL-878 is complete on web: the probe readout offers a custom flight beside each downloaded mineral, carrying the body/mineral into an unsaved plan. Saving does not replace active work; the planner explains that reviewing parks the current flight. The standard destination, haul and vehicle sheets reuse the evidence selector for mapped estimates or the composition-only fallback. Existing targeted runs/contracts remain. Native planner/probe presentation retains the existing SSL-851/773 companion deferral; no native feature parity is claimed.

Follow-up verification: local probe-scan → Nickel/Eros plan → save → ordinary review → vehicle findings, screenshots 624–645. Both scene surfaces checked at phone portrait/landscape, both tablet orientations and desktop. Probe readout scrolls without squeezing the orbit or losing the top of a tall readout. Web typecheck passed after regenerating a stale Next development validator; make test passed (1,350 web tests, one skipped, authoring and shared Go). No signed-in storage or native simulator claim. Next: SSL-879, consume this evidence in the existing mining seam pool; leave shared input/controls alone.

SSL-879 implements the web seam pool: personal/shared mapped finds supply the background mix, weighted by sector occurrence; required job ore remains seeded by the existing controller. Unmapped bodies retain composition. No scan controls, reserves, survey writes or research rewards were added. `miningSeamPool` in `web/lib/probes/mining-intelligence.ts` is the selector; `MissionOperationRoutes` passes evidence to `MiningScreen`. The `mining-survey` fixture is a one-aluminium Eros haul with two downloaded sectors. Native has no probe-reading model yet; probe integration remains in the existing companion scope, without changing ordinary native mining.

Verification: typecheck and eight focused tests passed; make test passed (1,352 web tests, one skipped, authoring and shared Go). The actual mapped fixture showed Aluminium/Nickel seams, accepted a real laser hit for Aluminium 1/1, retained it in the hold, flew home and settled one unit into the silo; the debrief ledger showed Kept in silo 1 U. Source/hold/menu checked at phone portrait/landscape, both tablet orientations and desktop (screenshots 646–666). The timed hit used the existing local `miningSpeed=0.1` aid; no fast-forward completion helper. Next scheduled feature: SSL-880 discovery-to-flight handoff; reuse existing confirmation rules.

Verification of the first slice: web typecheck passed; 8 focused tests passed; `make test` passed (1,350 web tests, one skipped, authoring and shared Go checks). Local disposable mission-planner fixture showed two downloaded Eros sectors and estimates; changing destination to Mercury showed the composition-only state and saving retained ordinary requirements and a feasible rocket. Screenshots 604–623 cover before/after, phone portrait/landscape, both tablet orientations and desktop, with no reported browser errors. This is fixture evidence, not a signed-in campaign playthrough. Native planner remains deferred by SSL-851; only generated scene metadata changed there.

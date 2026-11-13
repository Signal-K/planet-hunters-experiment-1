# Probe console shows the probe at work, then a readout with next steps

Liam, 2026-11-12, SSL-773. Builds on "Basic probe scan is automatic; scan levels in cycle 11".

- The probe console follows Tiny Space Program's satellite flow: the probe is shown circling the body, scan flashes go off now and then, and a progress bar counts the mapped sectors.
- Opening the console plays back the sectors mapped since the last visit, one at a time with a flash each (Skip ends it). That playback is the download, the probe observation.
- Then a readout: every deposit found and its tonnes, then three ways on:
  - **Targeted run (free):** a free run to that body, no client and no fee, mining the most valuable deposits the probe found. It opens the Free run tab with the body and run picked.
  - **Contracts:** client contracts opened by the finds. A client who wants a found mineral asks for a load from that body and pays a first-claim premium. Earth-abundant minerals get none, at most 3 per body, and a flown contract is not offered again. It opens the Contracts tab on that body.
  - **Back to hub.**
- Applies to every instrument whose work is automatic: show the instrument at work and what it found, then the next steps it opens, rather than a static panel.

Code: `web/components/game/screens/ProbeScanScreen.tsx`, `web/lib/probes/probe-offers.ts`.

# Instrument controls today, and the cycle 11 goal (2026-11-10)

Decision: keep things simple and consistent for now. The simple console is the default on all three classify screens (TESS, asteroid, Saturn): readout, the step, the answer keys, and one ALL CONTROLS key in the side panel. The full console is one tap away. Cycle 11 finalises the goals for tactile, visually fun controls.

## Controls that exist today (full console)

Shared by every instrument (`InstrumentViewport`):
- Optics module: aim d-pad (4 arrows plus centre), STRETCH and INVERT switches, ZOOM, FOCUS and EXPOSURE knobs, aim readout.
- Downlink panel: command line with quick keys ZOOM IN, ZOOM OUT, HELP (plus SEND FOR REVIEW or ASK COMMUNITY after a result).
- Readout: instrument-specific rows. Step list, answer keys, tool key, BACK and CONFIRM.

Per instrument module:
- TESS, Photometry TP-02: TIME, SCAN and PERIOD knobs, BIN key, FOLD switch, FOLD and BIN lamps.
- Asteroid, Astrometry AS-03: FIELD and OFFSET knobs, GRID and ECLIPTIC switches, READ lamp.
- Saturn, Imaging SI-04: CONTRAST knob, PALETTE and NEXT SQ keys, SHARPEN and LOUPE switches, SHRP and LOUPE lamps, MARK STORM tool.

Inconsistencies noticed: the optics module shows on asteroid and TESS but its aim and exposure controls change nothing the answer depends on; three different control vocabularies (knob, switch, module key) for similar jobs; the ALL CONTROLS toggle used to sit in three places.

## Cycle 11 goal

Finalise the tactile and visually fun control language: which controls are real, which are decoration, one vocabulary (knob, switch, key) used the same way on every instrument, and a rule for when a control earns a place. Until then: simple console by default, no new controls.

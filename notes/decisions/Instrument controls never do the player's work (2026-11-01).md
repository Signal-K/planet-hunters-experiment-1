---
type: decision
title: Instrument controls never do the player's work
project: Landnam
status: decided
created: 2026-11-01
---

# Instrument controls never do the player's work (2026-11-01)

Decided by Liam in the Claude session (SSL-747): "Make sure that the controls don't make it too easy and allow users to sort of have to do their own work, exercise a bit of creativity. I am worried it is getting too easy. Plus there should be a full read-out of the output/result."

## Decision

- A control may change what the player sees: zoom, scan, bin, fold, field, palette, contrast, sharpen or loupe. It must never find, compute or hint at the answer for them.
  - There is no auto-fold, no "snap to period" and no lamp that lights when the answer is right.
  - Removed: TESS SNAP, and the asteroid ECL LAT readout and NEAR ECL lamp.
- Measurements come from the player's own marks. TESS reports the raw gaps between their marked dips, and deciding whether a gap is one period or several is the player's job. They then turn PERIOD until their dips stack.
- Where a reading matters, the player takes it and logs it themselves. For example, the asteroid OFFSET knob logs their reading of the object's offset from the ecliptic.
- Every classify scene shows a full READOUT plate under the downlink. It lists the player's own result line by line: what they marked and measured, the settings they used and their verdict.
  - Before they submit, the readout is a record, never a grade.
  - After they submit, the readout may add the reference value next to theirs (TESS catalogue period, asteroid true ecliptic offset) so they can see how they did.
- The readout is the record that a consensus request shares (SSL-746).

Source: `InstrumentViewport` `readout` prop (web) / `InstrumentReadout` (iOS); `measureDips` in `web/lib/instrument-viewport/lightcurve-controls.ts`, mirrored by `LightcurveControls.measure` in `native/App/Screens/TessDiscoveryScreen.swift`.

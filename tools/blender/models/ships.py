"""Explorer (SR1) and Prospector (SR2) hulls, plus the SR1 cutaway background
the ship customiser draws room slots over.

Re-renders the three legacy hand-drawn PNGs pinned in manifest.test.ts's
LEGACY_OVERSIZED list (ship_sr1, ship_sr2, ship_sr1_cutaway — together most of
that list's ~3.7 MB) through this pipeline instead, in the flat-faceted style.

**The cutaway's compartment dividers are not artistic choices.** `getShipInteriorLayout`
(web/lib/data/shipRooms.ts) hardcodes each room slot's x/y/w/h as a percentage
of the 720x300 canvas the customiser stretches `containerSrc` to fill exactly
(`hull.width = W; hull.height = H` in ShipCustomizerCanvas.tsx — full stretch,
no letterboxing). So a divider drawn at the wrong world-x renders the slot
overlay visibly misaligned against the art beneath it — this is the exact bug
STS-10 fixed once already. `ortho_scale` below is set to the hull's *exact*
total length (no side margin), which makes world-x and frame-fraction the
same number: frame_fraction = (world_x + 4.0) / 8.0. Every x below is solved
from that equation against the slot percentages, not eyeballed.
"""

import landnam_kit as kit

T = kit.TOKENS

# ─── Shared hull geometry — identical across all three renders so the
# exterior ships and the cutaway read as the same vehicle. ────────────────────
NOSE_TIP = -4.0
NOSE_BASE = -3.44    # = 7% of the 8.0-unit frame — the cutaway's cockpit start
TUBE_END = 2.9
TAIL_END = 3.7
NOZZLE_END = 4.0
R = 0.5              # main tube radius

LAYOUT = (160, 60)   # 2.667:1, close to HangarScreen's 240x90 display box
ORTHO = 8.0          # == NOZZLE_END - NOSE_TIP: fills the frame exactly


def _hull(trim_hex, band_x, dorsal=False):
    """Nose + tube + tapered tail + nozzle. `trim_hex` is the accent color
    for the long window strip; `band_x` is where the ring/band sits."""
    nose = kit.cone("nose", radius=0.0, depth=NOSE_BASE - NOSE_TIP,
                    location=(NOSE_TIP, 0, 0), rotation=(0, 1.5708, 0), radius2=R)
    kit.solid("nose", nose, T["hull_dark"], "hulldark")

    tube = kit.cylinder("tube", R, TUBE_END - NOSE_BASE,
                        location=(NOSE_BASE, 0, 0), rotation=(0, 1.5708, 0), verts=10)
    kit.solid("tube", tube, T["hull"], "hull")

    tail = kit.cone("tail", radius=R, depth=TAIL_END - TUBE_END,
                    location=(TUBE_END, 0, 0), rotation=(0, 1.5708, 0), radius2=0.22)
    kit.solid("tail", tail, T["hull_dark"], "hulldark")

    nozzle = kit.cone("nozzle", radius=0.22, depth=NOZZLE_END - TAIL_END,
                      location=(TAIL_END, 0, 0), rotation=(0, 1.5708, 0), radius2=0.34)
    kit.solid("nozzle", nozzle, T["cyan_bright"], "cyanbright", outline=0.01)

    # Long window strip along the tube's upper surface.
    strip = kit.box("strip", (TUBE_END - NOSE_BASE - 1.2, 0.06, 0.05),
                    location=((NOSE_BASE + TUBE_END) / 2 - 0.6, -R - 0.01, 0.18))
    kit.solid("strip", strip, trim_hex, "trim", outline=0.006)

    # Accent ring/band.
    band = kit.cylinder("band", R * 1.05, 0.28, location=(band_x, 0, 0),
                        rotation=(0, 1.5708, 0), verts=10)
    kit.solid("band", band, trim_hex, "band", outline=0.01)

    if dorsal:
        # Prospector's dorsal sensor pod — the silhouette cue that tells the
        # two hulls apart at a glance, per the original hand-drawn art.
        pod_base = kit.box("pod_base", (1.1, 0.5, 0.22), location=(-0.3, 0, R - 0.02), bevel=0.03)
        kit.solid("pod_base", pod_base, T["hull_dark"], "hulldark")
        pod = kit.cylinder("pod", 0.22, 0.9, location=(0.15, 0, R + 0.18),
                           rotation=(0, 1.5708, 0), verts=8)
        kit.solid("pod", pod, T["steel"], "steel")
        lens = kit.cone("lens", 0.22, 0.16, location=(1.05, 0, R + 0.18),
                        rotation=(0, 1.5708, 0))
        kit.solid("lens", lens, T["amber"], "amber", outline=0.008)

    return dict(layout=LAYOUT, ortho=ORTHO, mode="flat", target=(0, 0, 0))


def ship_sr1():
    """Explorer — cyan trim, single amber ring near the nose/tube join."""
    return _hull(T["cyan"], band_x=NOSE_BASE + 0.4)


def ship_sr2():
    """Prospector — amber-forward trim plus the dorsal sensor pod."""
    return _hull(T["amber"], band_x=-1.6, dorsal=True)


def sr1_cutaway():
    """SR1 hull with the tube section opened up into the four onboarding
    compartments (cockpit/payload/booster/engine) `ShipCustomizerCanvas`
    overlays slot borders onto. See module docstring for why the divider
    x-positions are computed, not chosen."""
    nose = kit.cone("nose", radius=0.0, depth=NOSE_BASE - NOSE_TIP,
                    location=(NOSE_TIP, 0, 0), rotation=(0, 1.5708, 0), radius2=R)
    kit.solid("nose", nose, T["hull_dark"], "hulldark")

    # Plain hull runs from the last compartment (79% = x2.32) to the tail —
    # only the four-compartment span (7%-79%) is cut open.
    plain = kit.cylinder("plain", R, TUBE_END - 2.32, location=(2.32, 0, 0),
                         rotation=(0, 1.5708, 0), verts=10)
    kit.solid("plain", plain, T["hull"], "hull")

    tail = kit.cone("tail", radius=R, depth=TAIL_END - TUBE_END,
                    location=(TUBE_END, 0, 0), rotation=(0, 1.5708, 0), radius2=0.22)
    kit.solid("tail", tail, T["hull_dark"], "hulldark")

    nozzle = kit.cone("nozzle", radius=0.22, depth=NOZZLE_END - TAIL_END,
                      location=(TAIL_END, 0, 0), rotation=(0, 1.5708, 0), radius2=0.34)
    kit.solid("nozzle", nozzle, T["cyan_bright"], "cyanbright", outline=0.01)

    # ── Cutaway frame + interior fill, "picture frame" style: two coplanar
    # flat plates, the outer one (hull tone) sitting a touch further from the
    # camera than the inner one (interior tone), so the outer shows only as a
    # border lip. Exact x-span is NOSE_BASE (7%) to 2.32 (79%).
    frame = kit.box("frame", (2.32 - NOSE_BASE, 0.05, 0.92),
                    location=((NOSE_BASE + 2.32) / 2, 0.03, -0.46))
    kit.solid("frame", frame, T["hull_dark"], "hulldark", outline=0.015)

    fill = kit.box("fill", (2.32 - NOSE_BASE - 0.14, 0.05, 0.72),
                  location=((NOSE_BASE + 2.32) / 2, 0.0, -0.36))
    kit.solid("fill", fill, T["surface_2"], "surface2", outline=0)

    # Divider walls at the exact frame-fraction boundaries between
    # cockpit/payload/booster/engine (21.5%-22%, 41.5%-42%, 61.5%-62% — each
    # gap collapsed to one wall at its midpoint, matching the original art's
    # single dividing line rather than a double wall either side of a gap).
    for dx in (-2.26, -0.66, 0.94):
        wall = kit.box("wall", (0.05, 0.05, 0.68), location=(dx, -0.02, -0.34))
        kit.solid("wall", wall, T["steel"], "steel", outline=0.006)

    # Cockpit console silhouette (nose end) and engine block (aft end) — the
    # same kind of detail the hand-drawn cutaway used to orient the eye.
    console = kit.box("console", (0.5, 0.05, 0.34), location=(-3.05, -0.03, -0.17))
    kit.solid("console", console, T["cyan"], "cyan", outline=0.006)
    engine_block = kit.box("engine_block", (0.6, 0.05, 0.4), location=(1.75, -0.03, -0.2))
    kit.solid("engine_block", engine_block, T["hull"], "hull2", outline=0.006)

    return dict(layout=LAYOUT, ortho=ORTHO, mode="flat", target=(0, 0, 0))


BUILDS = {
    "ships/ship_sr1": ship_sr1,
    "ships/ship_sr2": ship_sr2,
    "ships/containers/sr1_cutaway": sr1_cutaway,
}

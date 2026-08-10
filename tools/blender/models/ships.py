"""Explorer and Prospector hulls, plus the Explorer cutaway background
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


def solid(*args, **kwargs):
    """kit.solid with grain on by default for this module — see kit's
    emission_material docstring for what "grain" means and why it exists."""
    kwargs.setdefault("grain", True)
    return kit.solid(*args, **kwargs)

# ─── Shared hull geometry — identical across all three renders so the
# exterior ships and the cutaway read as the same vehicle. ────────────────────
NOSE_TIP = -4.0
NOSE_BASE = -3.44    # = 7% of the 8.0-unit frame — the cutaway's cockpit start
TUBE_END = 2.9
TAIL_END = 3.7
NOZZLE_END = 4.0
R = 0.75             # main tube radius — bumped from 0.5 (2026-08-03, third
                      # pass): the ship is shown as small as 80x30px in-game
                      # (HubPixiCanvas's launchpad), and every fine surface
                      # detail (windows, seams, canards, the sensor spike) the
                      # second pass added was invisible at that size — those
                      # are described in code but never verified at the size
                      # the game actually renders at. This pass strips all of
                      # that back out and puts the visual budget entirely
                      # into silhouette: a much thicker body and a much
                      # bigger wing flare, checked against a real 80x30
                      # downscale, not just the 480x180 supersampled render.

LAYOUT = (160, 60)   # 2.667:1, close to HangarScreen's 240x90 display box
ORTHO = 8.0          # == NOZZLE_END - NOSE_TIP: fills the frame exactly


def _hull(trim_hex, band_x, dorsal=False):
    """Nose + tube + tapered tail + nozzle. `trim_hex` is the accent color
    for the canopy and ring/band.

    Third pass (2026-08-03): the second pass added surface detail (windows,
    seams, canards, a sensor spike) that only ever got checked against the
    480x180 supersampled render, never against the ~80x30px the game
    actually displays this at (HubPixiCanvas's launchpad). All of it was
    below the pixel threshold to read at real size, so the ship still looked
    like a bare tube in-game. That detail is removed here rather than kept
    "for later" — dead weight in both the mesh and the code. Everything that
    remains is sized to survive an aggressive downscale: a much thicker body
    (R 0.5 -> 0.75), a much bigger wing flare, and only features that add to
    the silhouette's outline, not its surface."""
    nose = kit.cone("nose", radius=0.0, depth=NOSE_BASE - NOSE_TIP,
                    location=(NOSE_TIP, 0, 0), rotation=(0, 1.5708, 0), radius2=R)
    solid("nose", nose, T["hull_dark"], "hulldark")

    tube = kit.cylinder("tube", R, TUBE_END - NOSE_BASE,
                        location=(NOSE_BASE, 0, 0), rotation=(0, 1.5708, 0), verts=10)
    solid("tube", tube, T["hull"], "hull")

    # Dorsal canopy bubble — a raised cockpit greenhouse, the "cockpit" read.
    # Sized as a fraction of R so it scales with the thicker body rather
    # than staying a fixed absolute size that shrinks in proportion.
    CANOPY_X = NOSE_BASE + 0.6
    canopy_base = kit.box("canopy_base", (1.1, 0.55, R * 0.4),
                          location=(CANOPY_X, 0, R - 0.02), bevel=0.04)
    solid("canopy_base", canopy_base, T["hull_dark"], "hulldark", outline=0.014)
    canopy_glass = kit.box("canopy_glass", (0.82, 0.4, R * 0.32),
                           location=(CANOPY_X, 0, R + R * 0.34), bevel=0.06)
    solid("canopy_glass", canopy_glass, trim_hex, "canopyglass", outline=0.012)

    tail = kit.cone("tail", radius=R, depth=TAIL_END - TUBE_END,
                    location=(TUBE_END, 0, 0), rotation=(0, 1.5708, 0), radius2=R * 0.44)
    solid("tail", tail, T["hull_dark"], "hulldark")

    # Tail wings — the single biggest silhouette change in this pass. Span
    # is now bigger than the tube's own radius, so the wing dominates the
    # tail third of the ship instead of reading as a small tab. Steel (not
    # hull_dark, which is too close to the near-black void to separate from
    # the background once large — checked the actual render, not the mesh).
    WING_X = TUBE_END - 0.75
    WING_SPAN = R * 1.75
    for sz in (1, -1):
        sign = 0 if sz > 0 else 3.14159
        # Rotation about X (the ship's length axis), not Z — Z rotation just
        # spins a box in the camera-facing plane and does nothing visible.
        wing = kit.box("wing", (0.85, 0.07, WING_SPAN), location=(WING_X, 0, sz * (R - 0.03)),
                      rotation=(sign, 0, 0), bevel=0.03)
        solid("wing", wing, T["steel"], "steel", outline=0.016)
        edge = kit.box("wing_edge", (0.85, 0.03, 0.07), location=(WING_X, 0, sz * (R - 0.03 + WING_SPAN)))
        solid("wing_edge", edge, trim_hex, "wingedge", outline=0)

    nozzle = kit.cone("nozzle", radius=R * 0.44, depth=NOZZLE_END - TAIL_END,
                      location=(TAIL_END, 0, 0), rotation=(0, 1.5708, 0), radius2=R * 0.68)
    solid("nozzle", nozzle, T["cyan_bright"], "cyanbright", outline=0.014)
    # Scorch ring at the very tip — cyan_bright reads as "engine", not "hot".
    scorch = kit.cylinder("scorch", R * 0.72, 0.08, location=(NOZZLE_END - 0.03, 0, 0),
                          rotation=(0, 1.5708, 0), verts=10)
    solid("scorch", scorch, T["rust"], "rust", outline=0)

    # Accent ring/band — wider than before so it holds up as a visible block
    # of color rather than a thin stripe.
    band = kit.cylinder("band", R * 1.06, 0.4, location=(band_x, 0, 0),
                        rotation=(0, 1.5708, 0), verts=10)
    solid("band", band, trim_hex, "band", outline=0.014)

    if dorsal:
        # Prospector's dorsal sensor pod — sits aft of the canopy so the two
        # dorsal features don't collide.
        pod_x = CANOPY_X + 1.15
        pod_base = kit.box("pod_base", (1.05, 0.55, R * 0.44), location=(pod_x, 0, R - 0.02), bevel=0.04)
        solid("pod_base", pod_base, T["hull_dark"], "hulldark", outline=0.01)
        pod = kit.cylinder("pod", R * 0.44, 0.9, location=(pod_x + 0.45, 0, R + R * 0.36),
                           rotation=(0, 1.5708, 0), verts=8)
        solid("pod", pod, T["steel"], "steel", outline=0.01)
        lens = kit.cone("lens", R * 0.44, 0.2, location=(pod_x + 1.35, 0, R + R * 0.36),
                        rotation=(0, 1.5708, 0))
        solid("lens", lens, T["amber"], "amber", outline=0.012)

    return dict(layout=LAYOUT, ortho=ORTHO, mode="flat", target=(0, 0, 0))


def ship_sr1():
    """Explorer — cyan trim, single amber ring near the nose/tube join."""
    return _hull(T["cyan"], band_x=NOSE_BASE + 0.4)


def ship_sr2():
    """Prospector — amber-forward trim plus the dorsal sensor pod."""
    return _hull(T["amber"], band_x=-1.6, dorsal=True)


def sr1_cutaway():
    """Explorer hull with the tube section opened up into the four onboarding
    compartments (cockpit/payload/booster/engine) `ShipCustomizerCanvas`
    overlays slot borders onto. See module docstring for why the divider
    x-positions are computed, not chosen."""
    nose = kit.cone("nose", radius=0.0, depth=NOSE_BASE - NOSE_TIP,
                    location=(NOSE_TIP, 0, 0), rotation=(0, 1.5708, 0), radius2=R)
    solid("nose", nose, T["hull_dark"], "hulldark")

    # Same nose spike and tail fins as the exterior renders (_hull) — outside
    # the opened-up 7%-79% span either way, so adding them here costs nothing
    # and keeps this reading as the same vehicle instead of a plainer stand-in.
    spike = kit.cylinder("spike", 0.03, 0.32, location=(NOSE_TIP - 0.32, 0, 0),
                         rotation=(0, 1.5708, 0), verts=6)
    solid("spike", spike, T["steel"], "steel", outline=0.006)
    spike_tip = kit.cone("spike_tip", 0.05, 0.1, location=(NOSE_TIP - 0.42, 0, 0),
                         rotation=(0, 1.5708, 0), verts=6)
    solid("spike_tip", spike_tip, T["cyan_bright"], "cyanbright", outline=0.006)

    # Plain hull runs from the last compartment (79% = x2.32) to the tail —
    # only the four-compartment span (7%-79%) is cut open.
    plain = kit.cylinder("plain", R, TUBE_END - 2.32, location=(2.32, 0, 0),
                         rotation=(0, 1.5708, 0), verts=10)
    solid("plain", plain, T["hull"], "hull")

    tail = kit.cone("tail", radius=R, depth=TAIL_END - TUBE_END,
                    location=(TUBE_END, 0, 0), rotation=(0, 1.5708, 0), radius2=0.22)
    solid("tail", tail, T["hull_dark"], "hulldark")

    FIN_X = TUBE_END - 0.15
    FIN_HEIGHT = 0.34
    for sz in (1, -1):
        fin = kit.box("fin", (0.5, 0.05, FIN_HEIGHT), location=(FIN_X, 0, sz * (R - 0.02)),
                     rotation=(0, 0, 0) if sz > 0 else (3.14159, 0, 0), bevel=0.02)
        solid("fin", fin, T["hull_dark"], "hulldark", outline=0.008)
        tip_z = sz * (R - 0.02 + FIN_HEIGHT)
        edge = kit.box("fin_edge", (0.5, 0.02, 0.05), location=(FIN_X, 0, tip_z))
        solid("fin_edge", edge, T["steel"], "steel", outline=0)

    nozzle = kit.cone("nozzle", radius=0.22, depth=NOZZLE_END - TAIL_END,
                      location=(TAIL_END, 0, 0), rotation=(0, 1.5708, 0), radius2=0.34)
    solid("nozzle", nozzle, T["cyan_bright"], "cyanbright", outline=0.01)
    scorch = kit.cylinder("scorch", 0.36, 0.06, location=(NOZZLE_END - 0.03, 0, 0),
                          rotation=(0, 1.5708, 0), verts=10)
    solid("scorch", scorch, T["rust"], "rust", outline=0)

    # ── Cutaway frame + interior fill, "picture frame" style: two coplanar
    # flat plates, the outer one (hull tone) sitting a touch further from the
    # camera than the inner one (interior tone), so the outer shows only as a
    # border lip. Exact x-span is NOSE_BASE (7%) to 2.32 (79%).
    # Frame/fill height scales off R (0.92/0.72 were sized for the old
    # R=0.5 tube; unscaled, the R=0.75 tube from this pass now visibly
    # pokes out past the frame's top/bottom edge).
    frame = kit.box("frame", (2.32 - NOSE_BASE, 0.05, R * 2.2),
                    location=((NOSE_BASE + 2.32) / 2, 0.03, -R * 1.1))
    solid("frame", frame, T["hull_dark"], "hulldark", outline=0.015)

    fill = kit.box("fill", (2.32 - NOSE_BASE - 0.14, 0.05, R * 1.72),
                  location=((NOSE_BASE + 2.32) / 2, 0.0, -R * 0.86))
    solid("fill", fill, T["surface_2"], "surface2", outline=0)

    # Divider walls at the exact frame-fraction boundaries between
    # cockpit/payload/booster/engine (21.5%-22%, 41.5%-42%, 61.5%-62% — each
    # gap collapsed to one wall at its midpoint, matching the original art's
    # single dividing line rather than a double wall either side of a gap).
    for dx in (-2.26, -0.66, 0.94):
        wall = kit.box("wall", (0.05, 0.05, 0.68), location=(dx, -0.02, -0.34))
        solid("wall", wall, T["steel"], "steel", outline=0.006)

    # Cockpit console silhouette (nose end) and engine block (aft end) — the
    # same kind of detail the hand-drawn cutaway used to orient the eye.
    # First pass gave the engine block T["hull"] under a different material
    # *name* ("hull2") — same hex as the plain hull next to it, so despite
    # having its own material it was invisible as a distinct system. Rust
    # actually reads as "engine", the way the nozzle scorch ring does.
    console = kit.box("console", (0.5, 0.05, 0.34), location=(-3.05, -0.03, -0.17))
    solid("console", console, T["cyan"], "cyan", outline=0.006)
    engine_block = kit.box("engine_block", (0.6, 0.05, 0.4), location=(1.75, -0.03, -0.2))
    solid("engine_block", engine_block, T["rust"], "rust", outline=0.006)

    return dict(layout=LAYOUT, ortho=ORTHO, mode="flat", target=(0, 0, 0))


BUILDS = {
    "ships/ship_sr1": ship_sr1,
    "ships/ship_sr2": ship_sr2,
    "ships/containers/sr1_cutaway": sr1_cutaway,
}

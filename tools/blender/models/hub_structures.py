"""Earth Base structure props.

These fill texture slots `hubScene.ts` declares — `depot_tank`, `scan_dish`,
`cmd_building`, `sat_station` are wired; `cmd_foundation`, `cmd_antenna`,
`depot_base`, `depot_pipes`, `scan_tripod` are declared but not yet consumed by
any builder (see HubPixiCanvas.tsx). When a slot is null the scene falls back
to its inline `Graphics` version, so this is a straight upgrade path: the
layout, sizes and anchors are already fixed by the scene and are mirrored here.

The launchpad's `pad_base`/`pad_tower`/`pad_gantry` used to live here too;
STS-611 replaced them with the modular six-sprite pad in `launchpad.py` and
`buildLaunchpad` no longer references these keys, so they were removed rather
than left as dead renders.

Sizes below are the layout sizes `makeSprite` is called with. Do not change one
without the other — a mismatch shows up as a squashed sprite, not an error.
"""

import math

import landnam_kit as kit

T = kit.TOKENS


def depot_tank():
    """56x44 — the refinery/depot vessel.

    Original read as an unlabelled silo — round body, no cue for "this is a
    pressure vessel with plumbing". Added: a second warning-striped band, a
    rung ladder up the near face, a valve wheel where the pipe meets the tank,
    and a second ground pipe so it reads as a connected system, not a lone tube.
    """
    tank = kit.cylinder("tank", 0.95, 1.9, verts=10)
    kit.solid("tank", tank, T["steel"], "steel")
    band = kit.cylinder("band", 1.02, 0.2, location=(0, 0, 0.85), verts=10)
    kit.solid("band", band, T["hull_dark"], "hulldark", outline=0)
    # Second band low on the body — two rings read as tank plating, one read
    # as a stripe.
    band_lo = kit.cylinder("band_lo", 1.0, 0.12, location=(0, 0, 0.28), verts=10)
    kit.solid("band_lo", band_lo, T["hull_dark"], "hulldark", outline=0)
    # Hazard chevrons on the low band — same signage language as the
    # launchpad deck, small and functional rather than decorative amber.
    for i in range(6):
        ang = i * (2 * math.pi / 6)
        chev = kit.box("chev", (0.16, 0.05, 0.1),
                       location=(1.02 * math.cos(ang), 1.02 * math.sin(ang), 0.28),
                       rotation=(0, 0, ang))
        kit.solid("chev", chev, T["amber"], "amber", outline=0)
    cap = kit.cone("cap", 0.95, 0.5, location=(0, 0, 1.9), verts=10)
    kit.solid("cap", cap, T["hull"], "hull")
    for sx in (-1.15, 1.15):
        leg = kit.box("leg", (0.2, 0.2, 0.55), location=(sx, 0, 0))
        kit.solid("leg", leg, T["hull_dark"], "hulldark")
    # Ladder up the camera-facing side — rungs are the single clearest
    # "industrial vessel, not a silo of grain" cue at this scale.
    rail_l = kit.box("rail_l", (0.04, 0.04, 1.7), location=(-0.18, -0.92, 0.1))
    kit.solid("rail_l", rail_l, T["hull_dark"], "hulldark", outline=0)
    rail_r = kit.box("rail_r", (0.04, 0.04, 1.7), location=(0.18, -0.92, 0.1))
    kit.solid("rail_r", rail_r, T["hull_dark"], "hulldark", outline=0)
    for i in range(6):
        rung = kit.box("rung", (0.36, 0.04, 0.04), location=(0, -0.92, 0.2 + i * 0.28))
        kit.solid("rung", rung, T["steel"], "steel", outline=0)
    pipe = kit.cylinder("pipe", 0.14, 1.3, location=(1.15, 0, 0.55),
                        rotation=(0, 1.5708, 0), verts=6)
    kit.solid("pipe", pipe, T["rust"], "rust")
    valve = kit.cylinder("valve", 0.2, 0.1, location=(1.15, 0, 0.9),
                         rotation=(1.5708, 0, 0), verts=8)
    kit.solid("valve", valve, T["hull_dark"], "hulldark", outline=0.008)
    pipe2 = kit.cylinder("pipe2", 0.1, 0.9, location=(-1.15, 0, 0.4),
                         rotation=(0, 1.5708, 0), verts=6)
    kit.solid("pipe2", pipe2, T["rust"], "rust")
    return dict(layout=(56, 44), ortho=3.1, mode="flat", target=(0, 0, 1.15))


def scan_dish():
    """46x30 — the scan station dish and its tripod.

    Original read as a rounded blob on two sticks — the dish and its rim were
    nearly the same size and tone, so the concave "opening toward you" cue
    never landed, and the tripod under it was too thin to register at this
    scale. Reworked: the rim is now visibly larger than the face (a dish has
    a lip), the face is pulled back and darkened at its centre with a smaller
    inset disc so the toon shading itself reads as a bowl rather than a flat
    plate, the feed arm is longer and tipped bright cyan so it reads as an
    instrument rather than a stray strut, and the tripod gets a third,
    thicker leg plus a spreader ring so it reads as a mount, not scaffolding.
    """
    for sx, sy in ((-0.55, 0.2), (0.55, 0.2), (0.0, -0.45)):
        leg = kit.box("leg", (0.16, 0.16, 0.85), location=(sx, sy, 0))
        kit.solid("leg", leg, T["hull_dark"], "hulldark")
    # Spreader ring low on the tripod — ties the three legs into one visible
    # mount instead of three disconnected sticks.
    for sx, sy, ex, ey in (
        (-0.55, 0.2, 0.0, -0.45), (0.55, 0.2, 0.0, -0.45), (-0.55, 0.2, 0.55, 0.2),
    ):
        mx, my = (sx + ex) / 2, (sy + ey) / 2
        length = ((ex - sx) ** 2 + (ey - sy) ** 2) ** 0.5
        ang = math.atan2(ey - sy, ex - sx)
        brace = kit.box("brace", (length, 0.06, 0.06), location=(mx, my, 0.3),
                        rotation=(0, 0, ang))
        kit.solid("brace", brace, T["hull_dark"], "hulldark", outline=0)
    hub = kit.box("hub", (0.44, 0.44, 0.3), location=(0, 0, 0.85))
    kit.solid("hub", hub, T["hull"], "hull")
    # Gearbox — the motor housing that pans/tilts the dish. Small but a real
    # radio-dish cue absent from a plain pole-to-dish connection.
    gearbox = kit.box("gearbox", (0.3, 0.3, 0.24), location=(0, 0, 1.0))
    kit.solid("gearbox", gearbox, T["steel"], "steel", outline=0.008)
    # The dish: a wide dark rim (the lip), a slightly smaller mid-tone shell,
    # and a small inset disc near the centre — three nested rings read as
    # a concave bowl even though every one of them is a flat toon fill.
    rim = kit.cylinder("rim", 1.15, 0.12, location=(0, 0, 1.15), verts=12)
    rim.rotation_euler = (-0.95, 0, 0)
    kit.solid("rim", rim, T["hull_dark"], "hulldark", outline=0.012)
    face = kit.cone("face", 0.98, 0.4, location=(0, 0, 1.17), verts=12)
    face.rotation_euler = (-0.95 + 3.14159, 0, 0)  # opening toward the camera
    kit.solid("face", face, T["cyan_bright"], "cyanbright", outline=0)
    inset = kit.cylinder("inset", 0.42, 0.06, location=(0, 0.16, 1.2), verts=10)
    inset.rotation_euler = (-0.95, 0, 0)
    kit.solid("inset", inset, T["surface_3"], "surface3", outline=0)
    # Feed arm — longer, and the tip is the brightest thing on the model so
    # the eye lands on "this points at something" rather than the body.
    feed = kit.box("feed", (0.08, 0.08, 0.75), location=(0, -0.5, 1.35))
    feed.rotation_euler = (-0.95, 0, 0)
    kit.solid("feed", feed, T["steel"], "steel", outline=0.008)
    feed_tip = kit.box("feed_tip", (0.16, 0.16, 0.14), location=(0, -0.78, 1.65))
    feed_tip.rotation_euler = (-0.95, 0, 0)
    kit.solid("feed_tip", feed_tip, T["cyan"], "cyan", outline=0)
    return dict(layout=(46, 30), ortho=2.9, mode="flat", target=(0, 0, 1.0))


def cmd_building():
    """56x56 — the command structure. Rendered at the larger of its two call
    sites (52x36 and 56x56) so the smaller one downsamples rather than blurs.

    Original was a plain box with three windows and a mast — indistinguishable
    from any other block building in this file (compare `sat_station`'s
    `block`, same silhouette). Added a two-storey massing (a taller, narrower
    upper block set back from the base — the classic control-tower shape),
    a second window band on the upper storey, a rooftop dish array (the
    "command" cue: this building talks to everything else), a ground-level
    door, and side pipe/vent detail on the flank so it also reads correctly
    from a partially-turned angle.
    """
    base = kit.box("base", (2.1, 1.7, 0.9), bevel=0.05)
    kit.solid("base", base, T["surface_3"], "surface3")
    base_trim = kit.box("base_trim", (2.2, 1.8, 0.1), location=(0, 0, 0.9))
    kit.solid("base_trim", base_trim, T["hull_dark"], "hulldark")
    for i in range(3):
        win = kit.box("win", (0.34, 0.06, 0.34), location=(-0.6 + i * 0.6, -0.86, 0.5))
        kit.solid("win", win, T["cyan"], "cyan", outline=0)
    door = kit.box("door", (0.4, 0.06, 0.46), location=(0, -0.86, 0.1))
    kit.solid("door", door, T["hull_dark"], "hulldark", outline=0.008)

    # Upper storey — narrower and set back, so the base reads as a base and
    # not just "the bottom half of one box". This is the single change that
    # turns a crate into a building.
    tower = kit.box("tower", (1.3, 1.0, 1.1), location=(0, -0.15, 1.0), bevel=0.04)
    kit.solid("tower", tower, T["hull"], "hull")
    tower_trim = kit.box("tower_trim", (1.4, 1.1, 0.12), location=(0, -0.15, 2.1))
    kit.solid("tower_trim", tower_trim, T["hull_dark"], "hulldark")
    for i in range(2):
        win2 = kit.box("win2", (0.3, 0.06, 0.3), location=(-0.32 + i * 0.64, -0.66, 1.5))
        kit.solid("win2", win2, T["cyan"], "cyan", outline=0)

    # Rooftop dish array — the cue that this is the *command* building, the
    # one every other structure reports to.
    dish_mount = kit.box("dish_mount", (0.1, 0.1, 0.2), location=(-0.45, -0.15, 2.16))
    kit.solid("dish_mount", dish_mount, T["steel"], "steel", outline=0.008)
    dish_rim = kit.cylinder("dish_rim", 0.3, 0.05, location=(-0.45, -0.15, 2.34), verts=10)
    dish_rim.rotation_euler = (-0.7, 0, 0)
    kit.solid("dish_rim", dish_rim, T["hull_dark"], "hulldark", outline=0.008)
    dish_face = kit.cone("dish_face", 0.25, 0.12, location=(-0.45, -0.15, 2.36), verts=10)
    dish_face.rotation_euler = (-0.7 + 3.14159, 0, 0)
    kit.solid("dish_face", dish_face, T["cyan_bright"], "cyanbright", outline=0)

    # Flank pipe/vent — reads correctly even from a partial turn, and breaks
    # up the tower's blank side face.
    vent = kit.box("vent", (0.06, 0.5, 0.4), location=(0.68, -0.15, 1.55))
    kit.solid("vent", vent, T["hull_dark"], "hulldark", outline=0.008)
    for z in (1.3, 1.5, 1.7):
        slat = kit.box("slat", (0.1, 0.5, 0.03), location=(0.68, -0.15, z))
        kit.solid("slat", slat, T["steel"], "steel", outline=0)

    mast = kit.box("mast", (0.12, 0.12, 0.7), location=(0.4, 0.2, 2.16))
    kit.solid("mast", mast, T["steel"], "steel", outline=0.01)
    beacon = kit.box("beacon", (0.2, 0.2, 0.2), location=(0.4, 0.2, 2.96))
    kit.solid("beacon", beacon, T["amber"], "amber", outline=0)
    return dict(layout=(56, 56), ortho=3.4, mode="flat", target=(0, 0, 1.3))


def sat_station():
    """52x36 — Satellite Monitoring Station: an uplink dish on a squat block.

    Deliberately not the same sprite as `cmd_building`. That slot is drawn at
    56x56 and this one at 52x36, so sharing one texture squashed it, and the
    two structures are different things besides.

    Original block+dish read as generic; the dish shared `scan_dish`'s flat-
    disc problem and the block had no ground-level detail. Added a door,
    a second window band, corner trim posts, and the same rim/inset dish
    treatment as `scan_dish` so both read as the same family of instrument.
    """
    block = kit.box("block", (1.7, 1.2, 0.7), bevel=0.05)
    kit.solid("block", block, T["hull"], "hull")
    trim = kit.box("trim", (1.8, 1.3, 0.12), location=(0, 0, 0.7))
    kit.solid("trim", trim, T["hull_dark"], "hulldark")
    for i in range(2):
        win = kit.box("win", (0.3, 0.06, 0.22), location=(-0.35 + i * 0.7, -0.61, 0.36))
        kit.solid("win", win, T["cyan"], "cyan", outline=0)
    # Ground-level door — the one cue every other block-shaped structure in
    # this file was missing, and the cheapest way to say "building" over
    # "crate".
    door = kit.box("door", (0.36, 0.05, 0.4), location=(0, -0.61, 0.05))
    kit.solid("door", door, T["hull_dark"], "hulldark", outline=0.008)
    # Corner posts, dark against the hull tone — breaks up the block's flat
    # front face into panels.
    for sx in (-0.78, 0.78):
        post = kit.box("post", (0.08, 0.08, 0.7), location=(sx, -0.53, 0))
        kit.solid("post", post, T["hull_dark"], "hulldark", outline=0)

    mount = kit.box("mount", (0.16, 0.16, 0.34), location=(0.15, 0.1, 0.82))
    kit.solid("mount", mount, T["steel"], "steel", outline=0.008)
    gearbox = kit.box("gearbox", (0.22, 0.22, 0.18), location=(0.15, 0.1, 1.0))
    kit.solid("gearbox", gearbox, T["steel"], "steel", outline=0.008)
    rim = kit.cylinder("rim", 0.72, 0.09, location=(0.15, 0.1, 1.14), verts=12)
    rim.rotation_euler = (-0.85, 0, 0)
    kit.solid("rim", rim, T["hull_dark"], "hulldark", outline=0.01)
    face = kit.cone("face", 0.6, 0.28, location=(0.15, 0.1, 1.16), verts=12)
    face.rotation_euler = (-0.85 + 3.14159, 0, 0)
    kit.solid("face", face, T["cyan_bright"], "cyanbright", outline=0)
    inset = kit.cylinder("inset", 0.26, 0.05, location=(0.15, 0.22, 1.19), verts=10)
    inset.rotation_euler = (-0.85, 0, 0)
    kit.solid("inset", inset, T["surface_3"], "surface3", outline=0)
    feed = kit.box("feed", (0.06, 0.06, 0.5), location=(0.15, -0.16, 1.28))
    feed.rotation_euler = (-0.85, 0, 0)
    kit.solid("feed", feed, T["steel"], "steel", outline=0.008)
    feed_tip = kit.box("feed_tip", (0.12, 0.12, 0.1), location=(0.15, -0.36, 1.46))
    feed_tip.rotation_euler = (-0.85, 0, 0)
    kit.solid("feed_tip", feed_tip, T["cyan"], "cyan", outline=0)
    return dict(layout=(52, 36), ortho=2.6, mode="flat", target=(0, 0, 0.75))


def deep_space_telescope():
    """68x62 — a visibly distinct large-aperture observatory.

    The hub previously reused the command-building silhouette for this future
    instrument. A long optical tube, faceted primary mirror and fork mount
    make its purpose legible before the player reads the label.
    """
    base = kit.cylinder("base", 1.05, 0.34, verts=10)
    kit.solid("base", base, T["hull_dark"], "hulldark")
    plinth = kit.box("plinth", (1.35, 1.08, 0.32), location=(0, 0, 0.28), bevel=0.04)
    kit.solid("plinth", plinth, T["hull"], "hull")
    # Fork mount: the empty centre and two arms distinguish an instrument
    # cradle from another rectangular service building.
    for sx in (-0.58, 0.58):
        arm = kit.box("fork", (0.16, 0.22, 1.35), location=(sx, 0, 0.62), bevel=0.03)
        arm.rotation_euler = (0, -0.30, 0)
        kit.solid("fork", arm, T["steel"], "steel", outline=0.008)
    tube = kit.cylinder("tube", 0.46, 2.05, location=(0, 0, 1.42), rotation=(0, 1.5708, 0), verts=10)
    tube.rotation_euler = (0, 1.5708 - 0.30, 0)
    kit.solid("tube", tube, T["surface_3"], "surface3")
    collar = kit.cylinder("collar", 0.53, 0.22, location=(-0.32, 0, 1.52), rotation=(0, 1.5708, 0), verts=10)
    collar.rotation_euler = (0, 1.5708 - 0.30, 0)
    kit.solid("collar", collar, T["hull_dark"], "hulldark", outline=0)
    # Camera-facing blue primary mirror and a small cyan guide scope are the
    # cues that this is a telescope, not a cannon or a generic antenna.
    mirror = kit.cylinder("mirror", 0.48, 0.08, location=(1.02, 0, 1.12), rotation=(0, 1.5708, 0), verts=12)
    mirror.rotation_euler = (0, 1.5708 - 0.30, 0)
    kit.solid("mirror", mirror, T["cyan_bright"], "cyanbright", outline=0.01)
    guide = kit.cylinder("guide", 0.13, 0.85, location=(0.0, -0.42, 1.8), rotation=(0, 1.5708, 0), verts=8)
    guide.rotation_euler = (0, 1.5708 - 0.30, 0)
    kit.solid("guide", guide, T["cyan"], "cyan", outline=0.006)
    return dict(layout=(68, 62), ortho=3.9, mode="flat", target=(0, 0, 1.05))


def astronaut_academy():
    """64x58 — a compact training dome with a launch-simulator antenna.

    No people sprite is implied: the academy reads as a facility through its
    round training hall, entrance airlock and recognisable mission simulator.
    """
    foundation = kit.box("foundation", (2.15, 1.65, 0.28), bevel=0.05)
    kit.solid("foundation", foundation, T["hull_dark"], "hulldark")
    hall = kit.cylinder("hall", 0.92, 0.95, location=(-0.18, 0, 0.25), verts=12)
    kit.solid("hall", hall, T["hull"], "hull")
    dome = kit.cone("dome", 0.92, 0.72, location=(-0.18, 0, 1.18), verts=12)
    kit.solid("dome", dome, T["surface_3"], "surface3")
    # A bright segmented oculus gives the dome a controlled, institutional
    # purpose; the lower airlock and steps make the scale readable.
    oculus = kit.cylinder("oculus", 0.22, 0.06, location=(-0.18, -0.02, 1.88), verts=10)
    kit.solid("oculus", oculus, T["cyan_bright"], "cyanbright", outline=0)
    airlock = kit.box("airlock", (0.52, 0.38, 0.58), location=(0.6, -0.72, 0.28), bevel=0.04)
    kit.solid("airlock", airlock, T["steel"], "steel")
    door = kit.box("door", (0.24, 0.05, 0.34), location=(0.6, -0.93, 0.32))
    kit.solid("door", door, T["hull_dark"], "hulldark", outline=0.008)
    for i in range(3):
        step = kit.box("step", (0.64 - i * 0.1, 0.32, 0.08), location=(0.6, -0.98 - i * 0.1, 0.05 + i * 0.07))
        kit.solid("step", step, T["steel"], "steel", outline=0)
    # Simulator mast: a restrained, practical training cue rather than a
    # decorative spire. Amber remains a small state/wayfinding accent.
    mast = kit.box("sim_mast", (0.12, 0.12, 0.95), location=(0.92, 0.22, 0.75))
    kit.solid("sim_mast", mast, T["steel"], "steel", outline=0.008)
    sim = kit.box("sim", (0.42, 0.34, 0.28), location=(0.92, 0.22, 1.52), bevel=0.03)
    kit.solid("sim", sim, T["surface_3"], "surface3")
    beacon = kit.box("beacon", (0.14, 0.14, 0.12), location=(0.92, 0.22, 1.74))
    kit.solid("beacon", beacon, T["amber"], "amber", outline=0)
    return dict(layout=(64, 58), ortho=3.7, mode="flat", target=(0, 0, 0.95))


def refinery_modular_v2():
    """73x50 — refinery output used by the live Hub scene."""
    base = kit.box("base", (2.9, 1.2, 0.42), bevel=0.04)
    kit.solid("base", base, T["surface_3"], "surface3")
    deck = kit.box("deck", (3.1, 1.35, 0.12), location=(0, 0, 0.42))
    kit.solid("deck", deck, T["hull_dark"], "hulldark")
    for x, height, radius in ((-1.05, 1.1, 0.42), (0.0, 1.55, 0.5), (1.05, 1.25, 0.42)):
        vessel = kit.cylinder("vessel", radius, height, location=(x, 0, 0.54), verts=10)
        kit.solid("vessel", vessel, T["steel"], "steel")
        cap = kit.cone("cap", radius, 0.22, location=(x, 0, 0.54 + height), verts=10)
        kit.solid("cap", cap, T["hull"], "hull")
        band = kit.cylinder("band", radius + 0.04, 0.1, location=(x, -0.01, 0.9), verts=10)
        kit.solid("band", band, T["hull_dark"], "hulldark", outline=0)
    for x in (-0.78, -0.26, 0.26, 0.78):
        pipe = kit.box("pipe", (0.08, 0.08, 1.55), location=(x, -0.62, 0.54))
        kit.solid("pipe", pipe, T["rust"], "rust", outline=0.006)
    for x in (-1.35, 1.35):
        stack = kit.cylinder("stack", 0.12, 1.45, location=(x, 0.25, 0.54), verts=8)
        kit.solid("stack", stack, T["hull_dark"], "hulldark")
    return dict(layout=(73, 50), ortho=3.9, mode="flat", target=(0, 0, 1.0))


def scan_station_modular_v2():
    """46x73 — satellite monitoring station output used by the live Hub."""
    base = kit.box("base", (1.75, 1.2, 0.42), bevel=0.04)
    kit.solid("base", base, T["surface_3"], "surface3")
    body = kit.box("body", (1.45, 1.0, 0.7), location=(0, 0, 0.42), bevel=0.03)
    kit.solid("body", body, T["hull"], "hull")
    for x in (-0.42, 0.42):
        win = kit.box("win", (0.28, 0.05, 0.22), location=(x, -0.53, 0.76))
        kit.solid("win", win, T["cyan"], "cyan", outline=0)
    door = kit.box("door", (0.3, 0.05, 0.42), location=(0, -0.53, 0.43))
    kit.solid("door", door, T["hull_dark"], "hulldark", outline=0.006)
    mount = kit.box("mount", (0.18, 0.18, 0.3), location=(0, 0, 1.12))
    kit.solid("mount", mount, T["steel"], "steel", outline=0.006)
    rim = kit.cylinder("rim", 0.72, 0.1, location=(0, 0, 1.32), verts=12)
    rim.rotation_euler = (-0.85, 0, 0)
    kit.solid("rim", rim, T["hull_dark"], "hulldark", outline=0.01)
    face = kit.cone("face", 0.6, 0.28, location=(0, 0, 1.34), verts=12)
    face.rotation_euler = (-0.85 + 3.14159, 0, 0)
    kit.solid("face", face, T["cyan_bright"], "cyanbright", outline=0)
    inset = kit.cylinder("inset", 0.26, 0.05, location=(0, 0.18, 1.37), verts=10)
    inset.rotation_euler = (-0.85, 0, 0)
    kit.solid("inset", inset, T["surface_3"], "surface3", outline=0)
    feed = kit.box("feed", (0.06, 0.06, 0.55), location=(0, -0.2, 1.48))
    feed.rotation_euler = (-0.85, 0, 0)
    kit.solid("feed", feed, T["steel"], "steel", outline=0.006)
    return dict(layout=(46, 73), ortho=2.9, mode="flat", target=(0, 0, 0.78))


BUILDS = {
    "hub/depot_tank": depot_tank,
    "hub/scan_dish": scan_dish,
    "hub/cmd_building": cmd_building,
    "hub/sat_station": sat_station,
    "hub/deep_space_telescope": deep_space_telescope,
    "hub/astronaut_academy": astronaut_academy,
    "hub/refinery_modular_v2": refinery_modular_v2,
    "hub/scan_station_modular_v2": scan_station_modular_v2,
}

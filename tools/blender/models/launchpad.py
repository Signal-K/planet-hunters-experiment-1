"""Modular launchpad for the Earth Base scene.

Reference direction (Liam, 2026-07-29): the low-poly Mars-base pad — twin
lattice gantry frames flanking the vehicle on a raised deck — plus the
service-tower-and-swing-arm arrangement of the SLS mobile launcher and the
Blue Origin pad.

**Every major component is its own sprite.** That is the requirement: the scene
positions and animates them independently, so the swing arm can retract, the
clamps can release, and the deck can stand on its own. A single baked-in
launchpad sprite cannot do any of that.

**The pad is empty by default.** No rocket is modelled here. The vehicle is a
separate sprite the scene adds only when a launch is pending (`hot`), which is
also why the arm and clamps are authored in their *stowed-open* position — the
resting state is an empty pad waiting for one.

Anchors matter and are called out per part. The swing arm in particular is
rendered with its hinge at the **left edge, mid-height**, so the scene can set
`anchor(0, 0.5)` and rotate it around the tower without the pivot drifting.

Palette note: the Mars reference leans heavily on yellow. Landnam restricts
amber to genuine payout emphasis, so structural accents here are cyan and the
hull/steel tones instead. Amber appears once, on the hazard chevrons at the
deck edge, which is signage rather than chrome — and even that is kept small.
"""

import landnam_kit as kit

T = kit.TOKENS


def _lattice_column(x, y, height, width, depth, bays, key_hex, brace_hex):
    """An open cross-braced frame: four legs plus X bracing per bay.

    Modelled rather than faked with a texture because the silhouette is the
    whole point of a gantry — a solid box at this size reads as a chimney.
    """
    leg = width / 2
    dep = depth / 2
    for sx in (-leg, leg):
        for sy in (-dep, dep):
            post = kit.box("leg", (0.07, 0.07, height), location=(x + sx, y + sy, 0))
            kit.solid("leg", post, key_hex, "hull")

    bay_h = height / bays
    for b in range(bays):
        z = b * bay_h
        # Horizontal ring at the top of each bay.
        ring_f = kit.box("ring", (width, 0.06, 0.06), location=(x, y - dep, z + bay_h))
        kit.solid("ring", ring_f, brace_hex, "hulldark")
        # Single diagonal per bay, alternating direction — reads as bracing
        # without doubling the geometry of a full X.
        diag = kit.box("diag", (0.05, 0.05, bay_h * 1.28),
                       location=(x, y - dep, z),
                       rotation=(0, 0.62 if b % 2 == 0 else -0.62, 0))
        kit.solid("diag", diag, brace_hex, "hulldark")


def pad_deck():
    """72x18 — the raised flame deck. Anchor bottom-centre.

    The thing every other module stands on, and the only part that is useful
    on its own: a built-but-idle launchpad is a bare deck.
    """
    apron = kit.box("apron", (3.9, 2.1, 0.16), bevel=0.03)
    kit.solid("apron", apron, T["hull_dark"], "hulldark")
    deck = kit.box("deck", (3.4, 1.8, 0.36), location=(0, 0, 0.16), bevel=0.04)
    kit.solid("deck", deck, T["hull"], "hull")
    # Flame trench — a dark slot through the middle, the cue that reads
    # "launchpad" rather than "platform".
    trench = kit.box("trench", (0.9, 1.5, 0.1), location=(0, 0, 0.44))
    kit.solid("trench", trench, T["void"], "void", outline=0)
    for sx in (-1.35, 1.35):
        step = kit.box("step", (0.5, 1.4, 0.18), location=(sx, 0, 0.52))
        kit.solid("step", step, T["hull_dark"], "hulldark")
    # Hazard chevrons at the lip. Signage, not chrome — the one amber here.
    for i in range(5):
        chev = kit.box("chev", (0.22, 0.1, 0.05), location=(-1.0 + i * 0.5, -0.92, 0.52))
        kit.solid("chev", chev, T["amber"], "amber", outline=0)
    return dict(layout=(72, 18), ortho=4.6, mode="flat", target=(0, 0, 0.3))


def pad_gantry_frame():
    """28x96 — one lattice gantry frame. Anchor bottom-centre.

    Rendered as a *single* frame so the scene can place two, mirrored, either
    side of the vehicle the way the Mars reference does. One pre-mirrored pair
    would fix the spacing and stop the pad ever holding a wider vehicle.
    """
    _lattice_column(0, 0, 4.6, 0.72, 0.6, 6, T["hull"], T["hull_dark"])
    # Servicing platforms up the frame.
    for i, z in enumerate((1.0, 2.2, 3.4)):
        plat = kit.box("plat", (0.86, 0.7, 0.08), location=(0, 0, z))
        kit.solid("plat", plat, T["steel"], "steel")
        rail = kit.box("rail", (0.86, 0.05, 0.16), location=(0, -0.33, z + 0.08))
        kit.solid("rail", rail, T["hull_dark"], "hulldark", outline=0.008)
        if i % 2 == 0:
            lamp = kit.box("lamp", (0.1, 0.06, 0.1), location=(0.3, -0.33, z + 0.2))
            kit.solid("lamp", lamp, T["cyan"], "cyan", outline=0)
    cap = kit.box("cap", (0.8, 0.68, 0.14), location=(0, 0, 4.6))
    kit.solid("cap", cap, T["hull_dark"], "hulldark")
    return dict(layout=(28, 96), ortho=5.2, mode="flat", target=(0, 0, 2.3))


def pad_swing_arm():
    """34x10 — the crew/umbilical arm that holds the vehicle.

    **The movable one.** Rendered with the hinge at the LEFT edge and vertically
    centred, so the scene sets `anchor(0, 0.5)` and rotates about the tower.
    Authored stowed-open (straight out); the scene swings it clear at launch.
    """
    # Hinge boss at the origin end, so the pivot has visible mass.
    boss = kit.cylinder("boss", 0.26, 0.5, location=(-1.55, 0, -0.25),
                        rotation=(0, 0, 0), verts=8)
    kit.solid("boss", boss, T["hull_dark"], "hulldark")
    truss = kit.box("truss", (3.1, 0.26, 0.2), location=(0, 0, 0), bevel=0.02)
    kit.solid("truss", truss, T["steel"], "steel")
    # Diagonals along the arm — same bracing language as the gantry frames.
    for i in range(5):
        d = kit.box("d", (0.05, 0.05, 0.42), location=(-1.2 + i * 0.6, -0.14, 0),
                    rotation=(0, 0.72 if i % 2 == 0 else -0.72, 0))
        kit.solid("d", d, T["hull_dark"], "hulldark", outline=0)
    # Umbilical head at the far end — the bit that actually touches the rocket.
    head = kit.box("head", (0.34, 0.34, 0.42), location=(1.42, 0, -0.21))
    kit.solid("head", head, T["hull"], "hull")
    tip = kit.box("tip", (0.12, 0.2, 0.16), location=(1.66, 0, -0.08))
    kit.solid("tip", tip, T["cyan"], "cyan", outline=0)
    return dict(layout=(34, 10), ortho=3.9, mode="flat", target=(0, 0, 0))


def pad_clamp():
    """12x16 — a hold-down clamp. Anchor bottom-centre.

    Placed in pairs at the deck centre. Separate from the deck so they can
    release outward on launch.
    """
    foot = kit.box("foot", (0.44, 0.44, 0.16), bevel=0.02)
    kit.solid("foot", foot, T["hull_dark"], "hulldark")
    post = kit.box("post", (0.26, 0.26, 0.68), location=(0, 0, 0.16))
    kit.solid("post", post, T["hull"], "hull")
    # Angled jaw, leaning in toward where the vehicle would stand.
    jaw = kit.box("jaw", (0.5, 0.22, 0.16), location=(0.16, 0, 0.8),
                  rotation=(0, -0.45, 0))
    kit.solid("jaw", jaw, T["steel"], "steel")
    return dict(layout=(12, 16), ortho=1.3, mode="flat", target=(0, 0, 0.5))


def pad_mast():
    """6x72 — a lightning mast. Anchor bottom-centre.

    Both references have these flanking the pad, well outside the gantries.
    One sprite; the scene places two.
    """
    pole = kit.box("pole", (0.11, 0.11, 3.4), bevel=0.02)
    kit.solid("pole", pole, T["hull_dark"], "hulldark", outline=0.01)
    for z in (0.9, 1.9, 2.9):
        collar = kit.box("collar", (0.2, 0.2, 0.08), location=(0, 0, z))
        kit.solid("collar", collar, T["steel"], "steel", outline=0)
    spike = kit.cone("spike", 0.09, 0.5, location=(0, 0, 3.4), verts=6)
    kit.solid("spike", spike, T["cyan"], "cyan", outline=0.008)
    return dict(layout=(6, 72), ortho=4.1, mode="flat", target=(0, 0, 1.9))


def pad_tank():
    """20x24 — propellant tank. Anchor bottom-centre. Sits beside the deck."""
    for sx in (-0.42, 0.42):
        leg = kit.box("leg", (0.13, 0.13, 0.36), location=(sx, 0, 0))
        kit.solid("leg", leg, T["hull_dark"], "hulldark")
    body = kit.cylinder("body", 0.62, 0.95, location=(0, 0, 0.36), verts=10)
    kit.solid("body", body, T["steel"], "steel")
    band = kit.cylinder("band", 0.66, 0.1, location=(0, 0, 0.8), verts=10)
    kit.solid("band", band, T["hull_dark"], "hulldark", outline=0)
    dome = kit.cone("dome", 0.62, 0.34, location=(0, 0, 1.31), verts=10)
    kit.solid("dome", dome, T["hull"], "hull")
    feed = kit.cylinder("feed", 0.1, 0.8, location=(0.62, 0, 0.6),
                        rotation=(0, 1.5708, 0), verts=6)
    kit.solid("feed", feed, T["cyan"], "cyan", outline=0.008)
    return dict(layout=(20, 24), ortho=1.9, mode="flat", target=(0, 0, 0.85))


BUILDS = {
    "hub/pad_deck": pad_deck,
    "hub/pad_gantry_frame": pad_gantry_frame,
    "hub/pad_swing_arm": pad_swing_arm,
    "hub/pad_clamp": pad_clamp,
    "hub/pad_mast": pad_mast,
    "hub/pad_tank": pad_tank,
}

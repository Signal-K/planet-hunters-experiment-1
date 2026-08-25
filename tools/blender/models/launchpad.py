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

    Was a single diagonal per bay (reads as a zigzag, not a truss). Now a full
    X per bay plus a small gusset plate at each crossing — the gusset is what
    actually sells "riveted steel lattice" over "some sticks".
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
        # Full X-bracing per bay — both diagonals, not alternating single ones.
        for sign in (1, -1):
            diag = kit.box("diag", (0.05, 0.05, bay_h * 1.3),
                           location=(x, y - dep, z),
                           rotation=(0, sign * 0.62, 0))
            kit.solid("diag", diag, brace_hex, "hulldark")
        # Gusset plate at the crossing — a small flat square where the two
        # diagonals meet, mid-bay.
        gusset = kit.box("gusset", (0.16, 0.03, 0.16), location=(x, y - dep, z + bay_h * 0.5))
        kit.solid("gusset", gusset, key_hex, "hull", outline=0.006)


def pad_deck():
    """120x22 — the raised flame deck. Anchor bottom-centre.

    The thing every other module stands on, and the only part that is useful
    on its own: a built-but-idle launchpad is a bare deck.

    Added panel seams across the two flame-trench flanks (the deck surface
    was a single flat fill either side of the trench — seams break it into
    plates, which is what a walked-on deck actually looks like), plus a
    corner floodlight on each step so the deck reads as serviced/lit rather
    than derelict.
    """
    apron = kit.box("apron", (5.8, 2.1, 0.16), bevel=0.03)
    kit.solid("apron", apron, T["hull_dark"], "hulldark")
    deck = kit.box("deck", (5.2, 1.8, 0.36), location=(0, 0, 0.16), bevel=0.04)
    kit.solid("deck", deck, T["hull"], "hull")
    # Flame trench — a dark slot through the middle, the cue that reads
    # "launchpad" rather than "platform".
    trench = kit.box("trench", (0.9, 1.5, 0.1), location=(0, 0, 0.44))
    kit.solid("trench", trench, T["void"], "void", outline=0)
    # Deck-plate seams either side of the trench.
    for sx in (-0.62, -0.32, 0.32, 0.62):
        seam = kit.box("seam", (0.02, 1.7, 0.02), location=(sx, 0, 0.5))
        kit.solid("seam", seam, T["hull_dark"], "hulldark", outline=0)
    for sx in (-2.35, 2.35):
        step = kit.box("step", (0.5, 1.4, 0.18), location=(sx, 0, 0.52))
        kit.solid("step", step, T["hull_dark"], "hulldark")
        lamp = kit.box("lamp", (0.1, 0.1, 0.1), location=(sx, -0.55, 0.68))
        kit.solid("lamp", lamp, T["cyan"], "cyan", outline=0)
    # Hazard chevrons at the lip. Signage, not chrome — the one amber here.
    for i in range(5):
        chev = kit.box("chev", (0.22, 0.1, 0.05), location=(-1.0 + i * 0.5, -0.92, 0.52))
        kit.solid("chev", chev, T["amber"], "amber", outline=0)
    return dict(layout=(240, 44), ortho=5.8, mode="flat", target=(0, 0, 0.3))


def pad_gantry_frame():
    """38x78 — one broad, lower lattice gantry frame. Anchor bottom-centre.

    Rendered as a *single* frame so the scene can place two, mirrored, either
    side of the vehicle the way the Mars reference does. One pre-mirrored pair
    would fix the spacing and stop the pad ever holding a wider vehicle.
    """
    _lattice_column(0, 0, 4.0, 0.96, 0.72, 5, T["hull"], T["hull_dark"])
    # Servicing platforms up the frame.
    for i, z in enumerate((1.0, 2.0, 3.0)):
        plat = kit.box("plat", (1.12, 0.82, 0.08), location=(0, 0, z))
        kit.solid("plat", plat, T["steel"], "steel")
        rail = kit.box("rail", (0.86, 0.05, 0.16), location=(0, -0.33, z + 0.08))
        kit.solid("rail", rail, T["hull_dark"], "hulldark", outline=0.008)
        if i % 2 == 0:
            lamp = kit.box("lamp", (0.1, 0.06, 0.1), location=(0.38, -0.4, z + 0.2))
            kit.solid("lamp", lamp, T["cyan"], "cyan", outline=0)
    cap = kit.box("cap", (1.04, 0.8, 0.14), location=(0, 0, 4.0))
    kit.solid("cap", cap, T["hull_dark"], "hulldark")
    return dict(layout=(76, 156), ortho=5.0, mode="flat", target=(0, 0, 2.0))


def pad_swing_arm():
    """42x12 — the crew/umbilical arm that holds the vehicle.

    **The movable one.** Rendered with the hinge at the LEFT edge and vertically
    centred, so the scene sets `anchor(0, 0.5)` and rotates about the tower.
    Authored stowed-open (straight out); the scene swings it clear at launch.

    Added hinge bolt rim (the boss alone read as a plain stub), a hanging
    umbilical cable loop under the truss, and a second, brighter tip light so
    the "this connects to the vehicle" end reads at a glance even at 34px wide.
    """
    # Hinge boss at the origin end, so the pivot has visible mass.
    boss = kit.cylinder("boss", 0.26, 0.5, location=(-1.55, 0, -0.25),
                        rotation=(0, 0, 0), verts=8)
    kit.solid("boss", boss, T["hull_dark"], "hulldark")
    bolt_rim = kit.cylinder("bolt_rim", 0.3, 0.08, location=(-1.55, 0, -0.5),
                            rotation=(0, 0, 0), verts=8)
    kit.solid("bolt_rim", bolt_rim, T["steel"], "steel", outline=0.008)
    truss = kit.box("truss", (4.0, 0.28, 0.2), location=(0, 0, 0), bevel=0.02)
    kit.solid("truss", truss, T["steel"], "steel")
    # Diagonals along the arm — same bracing language as the gantry frames.
    for i in range(6):
        d = kit.box("d", (0.05, 0.05, 0.42), location=(-1.65 + i * 0.66, -0.14, 0),
                    rotation=(0, 0.72 if i % 2 == 0 else -0.72, 0))
        kit.solid("d", d, T["hull_dark"], "hulldark", outline=0)
    # Umbilical cable — a shallow sag under the truss, the "still hooked up"
    # cue a bare beam can't give.
    for i, dz in enumerate((-0.06, -0.1, -0.06)):
        link = kit.box("link", (0.4, 0.04, 0.04), location=(-0.6 + i * 0.6, 0.16, -0.2 + dz),
                       rotation=(0, 0.18 if i == 1 else 0, 0))
        kit.solid("link", link, T["hull_dark"], "hulldark", outline=0)
    # Umbilical head at the far end — the bit that actually touches the rocket.
    head = kit.box("head", (0.34, 0.34, 0.42), location=(1.88, 0, -0.21))
    kit.solid("head", head, T["hull"], "hull")
    tip = kit.box("tip", (0.12, 0.2, 0.16), location=(2.12, 0, -0.08))
    kit.solid("tip", tip, T["cyan"], "cyan", outline=0)
    tip_light = kit.box("tip_light", (0.08, 0.08, 0.08), location=(1.88, 0.18, -0.02))
    kit.solid("tip_light", tip_light, T["cyan_bright"], "cyanbright", outline=0)
    return dict(layout=(84, 24), ortho=4.6, mode="flat", target=(0, 0, 0))


def pad_clamp():
    """16x18 — a hold-down clamp. Anchor bottom-centre.

    Placed in pairs at the deck centre. Separate from the deck so they can
    release outward on launch.

    Smallest part in the set (12x16 layout, 36x48 rendered) so there's little
    room to add — a bolt-head base plate and a hydraulic piston alongside the
    post are the two additions that survive downsampling at this size without
    turning into noise.
    """
    foot = kit.box("foot", (0.5, 0.5, 0.06), bevel=0.01)
    kit.solid("foot", foot, T["steel"], "steel", outline=0.008)
    base = kit.box("base", (0.44, 0.44, 0.16), location=(0, 0, 0.06), bevel=0.02)
    kit.solid("base", base, T["hull_dark"], "hulldark")
    post = kit.box("post", (0.26, 0.26, 0.68), location=(0, 0, 0.22))
    kit.solid("post", post, T["hull"], "hull")
    piston = kit.cylinder("piston", 0.06, 0.6, location=(-0.2, 0, 0.2),
                          rotation=(0, 0, 0), verts=6)
    kit.solid("piston", piston, T["hull_dark"], "hulldark", outline=0.006)
    # Angled jaw, leaning in toward where the vehicle would stand.
    jaw = kit.box("jaw", (0.5, 0.22, 0.16), location=(0.16, 0, 0.86),
                  rotation=(0, -0.45, 0))
    kit.solid("jaw", jaw, T["steel"], "steel")
    return dict(layout=(32, 36), ortho=1.5, mode="flat", target=(0, 0, 0.5))


def pad_mast():
    """8x60 — a broad, lower lightning mast. Anchor bottom-centre.

    Both references have these flanking the pad, well outside the gantries.
    One sprite; the scene places two.

    Only 6 units wide, so there is no room for anything that adds silhouette
    width — additions here are a wider base flare (grounding, the actual
    functional cue for a lightning mast) and a taut down-wire, both of which
    read within the pole's existing 1px-ish render width.
    """
    base_flare = kit.box("base_flare", (0.26, 0.26, 0.12), bevel=0.01)
    kit.solid("base_flare", base_flare, T["hull_dark"], "hulldark", outline=0.008)
    pole = kit.box("pole", (0.15, 0.15, 2.8), location=(0, 0, 0.12), bevel=0.02)
    kit.solid("pole", pole, T["hull_dark"], "hulldark", outline=0.01)
    for z in (0.8, 1.7, 2.5):
        collar = kit.box("collar", (0.2, 0.2, 0.08), location=(0, 0, z))
        kit.solid("collar", collar, T["steel"], "steel", outline=0)
    # Grounding down-wire — a thin diagonal from the top collar to the base,
    # the part of a lightning mast that actually does something.
    wire = kit.box("wire", (0.03, 0.03, 1.8), location=(0.18, 0, 1.6),
                   rotation=(0, 0.1, 0))
    kit.solid("wire", wire, T["steel"], "steel", outline=0)
    spike = kit.cone("spike", 0.12, 0.42, location=(0, 0, 2.98), verts=6)
    kit.solid("spike", spike, T["cyan"], "cyan", outline=0.008)
    return dict(layout=(16, 120), ortho=3.6, mode="flat", target=(0, 0, 1.55))


def pad_tank():
    """20x24 — propellant tank. Anchor bottom-centre. Sits beside the deck.

    Added a low hazard band (matches the depot_tank/hub_structures language,
    keeping the whole scene's tanks visually related), a valve wheel where the
    feed pipe meets the body, and a small pressure gauge on the front face.
    """
    for sx in (-0.42, 0.42):
        leg = kit.box("leg", (0.13, 0.13, 0.36), location=(sx, 0, 0))
        kit.solid("leg", leg, T["hull_dark"], "hulldark")
    body = kit.cylinder("body", 0.62, 0.95, location=(0, 0, 0.36), verts=10)
    kit.solid("body", body, T["steel"], "steel")
    hazard = kit.cylinder("hazard", 0.64, 0.08, location=(0, 0, 0.44), verts=10)
    kit.solid("hazard", hazard, T["amber"], "amber", outline=0)
    band = kit.cylinder("band", 0.66, 0.1, location=(0, 0, 0.8), verts=10)
    kit.solid("band", band, T["hull_dark"], "hulldark", outline=0)
    dome = kit.cone("dome", 0.62, 0.34, location=(0, 0, 1.31), verts=10)
    kit.solid("dome", dome, T["hull"], "hull")
    feed = kit.cylinder("feed", 0.1, 0.8, location=(0.62, 0, 0.6),
                        rotation=(0, 1.5708, 0), verts=6)
    kit.solid("feed", feed, T["cyan"], "cyan", outline=0.008)
    valve = kit.cylinder("valve", 0.15, 0.08, location=(0.94, 0, 0.6),
                         rotation=(0, 1.5708, 0), verts=8)
    kit.solid("valve", valve, T["hull_dark"], "hulldark", outline=0.006)
    gauge = kit.cylinder("gauge", 0.09, 0.05, location=(0, -0.63, 0.65),
                         rotation=(1.5708, 0, 0), verts=8)
    kit.solid("gauge", gauge, T["cyan_bright"], "cyanbright", outline=0.006)
    return dict(layout=(40, 48), ortho=1.9, mode="flat", target=(0, 0, 0.85))


def pad_hangar():
    """A single unmistakable aerospace assembly hangar.

    The previous three equal black portals looked like a row of storage boxes.
    This version has one vehicle-scale gabled shed, a deep open threshold,
    raised segmented door, overhead crane and an attached service annex.  The
    whole building sits on the same dark rail apron as the launch complex so
    the two sprites join as one site rather than two separate dioramas.
    """
    # Shared site language: dark paved apron with cyan transport rails.  Keep
    # the slab dark so transparent edges blend into the CSS foundation.
    apron = kit.box("hangar_apron", (8.7, 4.2, 0.18), location=(0, -0.35, 0), bevel=0.06)
    kit.solid("hangar_apron", apron, T["surface_2"], "surface2")
    apron_edge = kit.box("hangar_apron_edge", (8.7, 0.24, 0.30), location=(0, -2.35, -0.02), bevel=0.03)
    kit.solid("hangar_apron_edge", apron_edge, T["hull_dark"], "hulldark")
    for sx in (-1.0, 1.0):
        rail = kit.box("hangar_floor_rail", (0.09, 3.8, 0.06), location=(sx, -0.55, 0.20))
        kit.solid("hangar_floor_rail", rail, T["cyan"], "cyan", outline=0)

    # The shed is deliberately tall and singular. The visible back wall and
    # side returns make the doorway a cavity instead of a dark rectangle.
    shed_width = 6.4
    back = kit.box("hangar_back", (shed_width, 0.28, 3.55), location=(-0.45, 1.05, 0.20), bevel=0.05)
    kit.solid("hangar_back", back, T["surface_3"], "surface3")
    for sx in (-3.48, 2.58):
        wall = kit.box("hangar_side", (0.42, 3.7, 3.65), location=(sx, -0.55, 0.20), bevel=0.05)
        kit.solid("hangar_side", wall, T["hull"], "hull")
        foot = kit.box("hangar_wall_foot", (0.72, 0.82, 0.42), location=(sx, -2.0, 0.18), bevel=0.03)
        kit.solid("hangar_wall_foot", foot, T["hull_dark"], "hulldark")

    # Two sloped roof plates form a strong gable silhouette. Cyan ridge and
    # eave strips keep the roof readable against the mountain backdrop.
    for sx, angle in ((-1.68, -0.24), (1.23, 0.24)):
        roof = kit.box("hangar_roof", (3.5, 4.2, 0.34), location=(sx - 0.45, -0.48, 4.10), rotation=(0, angle, 0), bevel=0.06)
        kit.solid("hangar_roof", roof, T["hull_dark"], "hulldark")
    ridge = kit.box("hangar_roof_ridge", (0.20, 4.25, 0.22), location=(-0.45, -0.48, 4.52))
    kit.solid("hangar_roof_ridge", ridge, T["cyan"], "cyan", outline=0)
    for sx in (-3.45, 2.55):
        eave = kit.box("hangar_eave", (0.20, 4.2, 0.18), location=(sx, -0.48, 3.70))
        kit.solid("hangar_eave", eave, T["steel"], "steel", outline=0.006)

    # One enormous framed opening is the primary read. A dark interior shell
    # is recessed behind the front frame; the door is visibly rolled up.
    opening = kit.box("hangar_opening", (5.30, 0.12, 3.32), location=(-0.45, -2.48, 0.38), bevel=0.04)
    kit.solid("hangar_opening", opening, T["void"], "void", outline=0.012)
    for sx in (-3.18, 2.28):
        jamb = kit.box("hangar_jamb", (0.34, 0.42, 3.60), location=(sx, -2.34, 0.28), bevel=0.03)
        kit.solid("hangar_jamb", jamb, T["steel"], "steel")
    lintel = kit.box("hangar_lintel", (5.8, 0.44, 0.36), location=(-0.45, -2.34, 3.78), bevel=0.04)
    kit.solid("hangar_lintel", lintel, T["hull"], "hull")
    for z in (3.25, 3.48, 3.71):
        door = kit.box("hangar_raised_door", (5.18, 0.14, 0.17), location=(-0.45, -2.57, z))
        kit.solid("hangar_raised_door", door, T["surface_2"], "surface2", outline=0.004)

    # Overhead crane and maintenance lighting inside the opening communicate
    # vehicle assembly at a glance, even with a rocket staged at the threshold.
    # These details sit immediately in front of the dark recess plane. They
    # are a graphic cutaway of the interior, not geometry hidden behind an
    # opaque black rectangle.
    crane = kit.box("hangar_crane", (4.55, 0.18, 0.24), location=(-0.45, -2.64, 2.92))
    kit.solid("hangar_crane", crane, T["cyan"], "cyan")
    trolley = kit.box("hangar_crane_trolley", (0.52, 0.20, 0.34), location=(-0.15, -2.76, 2.66), bevel=0.03)
    kit.solid("hangar_crane_trolley", trolley, T["steel"], "steel")
    hook = kit.cylinder("hangar_crane_hook", 0.08, 0.62, location=(-0.15, -2.78, 2.02), verts=8)
    kit.solid("hangar_crane_hook", hook, T["cyan_bright"], "cyanbright", outline=0.006)
    for sx in (-2.55, 1.65):
        interior_post = kit.box("hangar_interior_post", (0.18, 0.12, 2.45), location=(sx, -2.66, 0.45))
        kit.solid("hangar_interior_post", interior_post, T["steel"], "steel", outline=0.006)
        for z in (1.12, 1.88):
            platform = kit.box("hangar_interior_platform", (0.72, 0.14, 0.12), location=(sx, -2.73, z))
            kit.solid("hangar_interior_platform", platform, T["cyan"], "cyan", outline=0)
    for sx in (-2.55, -1.15, 0.25, 1.65):
        lamp = kit.box("hangar_ceiling_lamp", (0.42, 0.12, 0.10), location=(sx, -2.78, 2.54))
        kit.solid("hangar_ceiling_lamp", lamp, T["cyan_bright"], "cyanbright", outline=0)
    threshold = kit.box("hangar_threshold", (5.32, 0.24, 0.10), location=(-0.45, -2.55, 0.30))
    kit.solid("hangar_threshold", threshold, T["cyan_bright"], "cyanbright", outline=0)

    # A lower annex breaks the shed's symmetry and reads as offices/workshops,
    # not another full-size vehicle bay.
    annex = kit.box("hangar_annex", (2.0, 2.4, 1.75), location=(3.55, -0.55, 0.18), bevel=0.08)
    kit.solid("hangar_annex", annex, T["hull"], "hull")
    annex_roof = kit.box("hangar_annex_roof", (2.25, 2.65, 0.22), location=(3.55, -0.55, 1.95), bevel=0.05)
    kit.solid("hangar_annex_roof", annex_roof, T["hull_dark"], "hulldark")
    for z in (0.65, 1.18):
        window = kit.box("hangar_annex_window", (1.35, 0.10, 0.28), location=(3.55, -1.80, z))
        kit.solid("hangar_annex_window", window, T["cyan"], "cyan", outline=0)

    return dict(layout=(380, 228), ortho=9.8, mode="room", target=(0.20, -0.40, 2.15))


def pad_complex():
    """240x160 — one grounded, production launch complex sprite.

    The six modular pad sprites are useful for animation, but the shipped DOM
    composition scaled and positioned each transparent image independently.
    At scene scale that made the masts, tanks, arm and clamps look detached.
    This model keeps the whole idle facility in one Blender camera and one
    ground plane, so every component shares perspective, contact and outline.
    """
    # Integrated civil works: apron, raised launch deck and a deep flame trench.
    apron = kit.box("complex_apron", (8.4, 4.1, 0.18), location=(0, -0.2, 0), bevel=0.08)
    kit.solid("complex_apron", apron, T["surface_2"], "surface2")
    apron_edge = kit.box("complex_apron_edge", (8.4, 0.24, 0.30), location=(0, -2.18, -0.02), bevel=0.03)
    kit.solid("complex_apron_edge", apron_edge, T["hull_dark"], "hulldark")
    deck = kit.box("complex_deck", (6.8, 3.2, 0.55), location=(0, -0.15, 0.18), bevel=0.07)
    kit.solid("complex_deck", deck, T["hull"], "hull")
    trench = kit.box("complex_flame_trench", (1.25, 3.35, 0.18), location=(0.25, -0.15, 0.70), bevel=0.03)
    kit.solid("complex_flame_trench", trench, T["void"], "void")
    for sx in (-2.7, -2.0, 1.8, 2.5):
        seam = kit.box("complex_deck_seam", (0.04, 3.0, 0.03), location=(sx, -0.15, 0.77))
        kit.solid("complex_deck_seam", seam, T["hull_dark"], "hulldark", outline=0)
    for sx in (-2.8, -2.2, 1.8, 2.4, 3.0):
        marker = kit.box("complex_edge_marker", (0.34, 0.12, 0.08), location=(sx, -1.72, 0.76))
        kit.solid("complex_edge_marker", marker, T["amber"], "amber", outline=0)

    # Main service tower: a solid core provides mass, while thick external
    # bracing and inward platforms retain the gantry vocabulary.
    tower_x = -2.05
    core = kit.box("complex_tower_core", (1.25, 1.25, 5.65), location=(tower_x, 0.1, 0.75), bevel=0.04)
    kit.solid("complex_tower_core", core, T["surface_2"], "surface2")
    for sx in (-0.72, 0.72):
        post = kit.box("complex_tower_post", (0.18, 1.55, 5.85), location=(tower_x + sx, 0.1, 0.75))
        kit.solid("complex_tower_post", post, T["hull_dark"], "hulldark")
    for level, z in enumerate((1.55, 2.55, 3.55, 4.55, 5.55)):
        platform = kit.box("complex_platform", (2.0, 1.65, 0.18), location=(tower_x + 0.22, 0.08, z))
        kit.solid("complex_platform", platform, T["steel"], "steel")
        rail = kit.box("complex_platform_rail", (1.75, 0.10, 0.22), location=(tower_x + 0.22, -0.78, z + 0.18))
        kit.solid("complex_platform_rail", rail, T["cyan"], "cyan", outline=0)
        window = kit.box("complex_tower_light", (0.26, 0.08, 0.20), location=(tower_x, -0.67, z + 0.38))
        kit.solid("complex_tower_light", window, T["cyan_bright"], "cyanbright", outline=0)
        if level in (1, 3):
            arm = kit.box("complex_service_arm", (2.45, 0.32, 0.24), location=(-0.65, -0.35, z + 0.28), bevel=0.02)
            kit.solid("complex_service_arm", arm, T["hull"], "hull")
            head = kit.box("complex_arm_head", (0.34, 0.42, 0.48), location=(0.55, -0.35, z + 0.06))
            kit.solid("complex_arm_head", head, T["cyan"], "cyan")
    cap = kit.box("complex_tower_cap", (2.1, 1.7, 0.30), location=(tower_x, 0.1, 6.45), bevel=0.04)
    kit.solid("complex_tower_cap", cap, T["hull_dark"], "hulldark")

    # Short strongback on the opposite side makes the central vehicle slot
    # unmistakable without repeating another skeletal tower.
    back_x = 1.45
    strongback = kit.box("complex_strongback", (0.62, 1.0, 4.45), location=(back_x, 0.15, 0.75), rotation=(0, -0.08, 0), bevel=0.04)
    kit.solid("complex_strongback", strongback, T["hull_dark"], "hulldark")
    for z in (1.5, 2.4, 3.3, 4.2):
        collar = kit.box("complex_strongback_collar", (1.1, 1.15, 0.16), location=(back_x, 0.15, z))
        kit.solid("complex_strongback_collar", collar, T["steel"], "steel")
    umbilical = kit.box("complex_umbilical", (1.45, 0.26, 0.22), location=(0.82, -0.2, 3.35))
    kit.solid("complex_umbilical", umbilical, T["cyan"], "cyan")

    # Propellant farm physically connected to the deck with visible feed pipes.
    for i, sx in enumerate((2.45, 3.25)):
        tank = kit.cylinder("complex_tank", 0.48, 1.35, location=(sx, 0.55, 0.76), verts=10)
        kit.solid("complex_tank", tank, T["steel"], "steel")
        dome = kit.cone("complex_tank_dome", 0.48, 0.28, location=(sx, 0.55, 2.11), verts=10)
        kit.solid("complex_tank_dome", dome, T["hull"], "hull")
        band = kit.cylinder("complex_tank_band", 0.51, 0.12, location=(sx, 0.55, 1.22), verts=10)
        kit.solid("complex_tank_band", band, T["hull_dark"], "hulldark", outline=0)
        gauge = kit.box("complex_tank_gauge", (0.16, 0.08, 0.16), location=(sx, 0.04, 1.54))
        kit.solid("complex_tank_gauge", gauge, T["cyan_bright"], "cyanbright", outline=0)
        feed = kit.cylinder("complex_feed_pipe", 0.10, 1.2 + i * 0.8, location=(1.85, 0.5, 0.85 + i * 0.20), rotation=(0, 1.5708, 0), verts=6)
        kit.solid("complex_feed_pipe", feed, T["cyan"], "cyan", outline=0.008)

    # Hold-down clamps are attached to a shared base ring at the vehicle slot.
    ring = kit.cylinder("complex_mount_ring", 0.72, 0.16, location=(0.35, -0.2, 0.76), verts=12)
    kit.solid("complex_mount_ring", ring, T["surface_2"], "surface2")
    for sx in (-0.14, 0.84):
        clamp = kit.box("complex_hold_down", (0.30, 0.42, 0.72), location=(sx, -0.2, 0.90), rotation=(0, -0.18 if sx < 0 else 0.18, 0))
        kit.solid("complex_hold_down", clamp, T["hull"], "hull")

    # Lightning protection masts are braced back into the apron rather than
    # floating as thin independent sprites.
    for sx in (-3.75, 3.85):
        base = kit.box("complex_mast_base", (0.58, 0.68, 0.24), location=(sx, 0.25, 0.18), bevel=0.03)
        kit.solid("complex_mast_base", base, T["hull_dark"], "hulldark")
        mast = kit.cylinder("complex_mast", 0.10, 4.65, location=(sx, 0.25, 0.42), verts=8)
        kit.solid("complex_mast", mast, T["hull_dark"], "hulldark")
        brace = kit.box("complex_mast_brace", (0.12, 0.12, 1.8), location=(sx + (-0.32 if sx > 0 else 0.32), 0.25, 0.55), rotation=(0, -0.20 if sx > 0 else 0.20, 0))
        kit.solid("complex_mast_brace", brace, T["steel"], "steel", outline=0.008)
        spike = kit.cone("complex_mast_spike", 0.18, 0.55, location=(sx, 0.25, 5.07), verts=8)
        kit.solid("complex_mast_spike", spike, T["cyan_bright"], "cyanbright")

    return dict(layout=(360, 240), ortho=9.5, mode="room", target=(0, -0.15, 3.0))


BUILDS = {
    "hub/pad_deck": pad_deck,
    "hub/pad_gantry_frame": pad_gantry_frame,
    "hub/pad_swing_arm": pad_swing_arm,
    "hub/pad_clamp": pad_clamp,
    "hub/pad_mast": pad_mast,
    "hub/pad_tank": pad_tank,
    "hub/pad_hangar_v2": pad_hangar,
    "hub/pad_complex_v2": pad_complex,
}

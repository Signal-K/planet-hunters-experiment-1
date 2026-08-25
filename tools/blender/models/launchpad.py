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
    """Front-elevation aerospace maintenance bay for the outdoor side view.

    The v2 asset used the room camera and a deep apron, so it read like an
    isometric diorama pasted over a flat landscape. This version is a graphic
    cutaway: one shared baseline, no visible side planes, one vehicle-scale
    opening, and the busy gantry/crane/service vocabulary from the supplied
    hangar reference. Material roles are deliberately separated too: pale
    concrete shell, charcoal interior, yellow handling equipment, rust service
    zones and tiny cyan work lights.
    """
    concrete = kit.tint(T["steel"], 0.94)
    concrete_dark = kit.tint(T["steel"], 0.72)
    service_yellow = kit.tint(T["amber"], 1.10)

    # A thin side-view foundation shared with the launch complex. No receding
    # slab is visible, so the sprite can sit directly on the CSS ground line.
    base = kit.box("hangar_base", (9.6, 0.36, 0.34), location=(0, -1.0, 0), bevel=0.04)
    kit.solid("hangar_base", base, concrete_dark, "hangarconcretedark")
    floor = kit.box("hangar_floor", (8.9, 0.18, 0.13), location=(-0.25, -1.28, 0.34))
    kit.solid("hangar_floor", floor, T["hull_dark"], "hulldark")
    for sx in (-1.15, 1.15):
        rail = kit.box("hangar_transport_rail", (0.11, 0.12, 0.08), location=(sx, -1.42, 0.48))
        kit.solid("hangar_transport_rail", rail, service_yellow, "serviceyellow", outline=0)

    # The dark cutaway comes first; all frame/interior equipment sits in front.
    opening = kit.box("hangar_opening", (6.7, 0.12, 3.55), location=(-0.65, -1.05, 0.46), bevel=0.02)
    kit.solid("hangar_opening", opening, T["void"], "void", outline=0.014)
    # Flat stepped gable cladding fills the roof silhouette without introducing
    # a visible top plane. Dark alternating bands suggest insulated panels.
    for index, width in enumerate((7.05, 5.90, 4.75, 3.60, 2.45, 1.30)):
        gable = kit.box("hangar_gable_cladding", (width, 0.14, 0.24), location=(-0.65, -1.08, 4.06 + index * 0.22))
        color = T["hull"] if index % 2 == 0 else T["hull_dark"]
        kit.solid("hangar_gable_cladding", gable, color, "hull" if index % 2 == 0 else "hulldark", outline=0.003)

    # Structural shell: front-on jambs and a gable assembled from thick roof
    # beams. This retains the building silhouette without exposing roof planes.
    for sx in (-4.18, 2.88):
        jamb = kit.box("hangar_jamb", (0.48, 0.30, 4.05), location=(sx, -1.34, 0.34), bevel=0.03)
        kit.solid("hangar_jamb", jamb, concrete, "hangarconcrete")
        footing = kit.box("hangar_footing", (0.78, 0.34, 0.34), location=(sx, -1.36, 0.12), bevel=0.03)
        kit.solid("hangar_footing", footing, T["hull_dark"], "hulldark")
    lintel = kit.box("hangar_lintel", (7.45, 0.34, 0.38), location=(-0.65, -1.34, 4.08), bevel=0.03)
    kit.solid("hangar_lintel", lintel, concrete_dark, "hangarconcretedark")
    for sx, angle in ((-2.48, -0.29), (1.18, 0.29)):
        roof = kit.box("hangar_roof_beam", (4.25, 0.38, 0.34), location=(sx, -1.32, 4.73), rotation=(0, angle, 0), bevel=0.04)
        kit.solid("hangar_roof_beam", roof, T["hull_dark"], "hulldark")
    ridge = kit.box("hangar_ridge", (0.34, 0.40, 0.46), location=(-0.65, -1.34, 5.30), bevel=0.03)
    kit.solid("hangar_ridge", ridge, service_yellow, "serviceyellow", outline=0.006)

    # Raised segmented blast door clearly explains why the bay is open.
    for z in (3.42, 3.66, 3.90):
        door = kit.box("hangar_raised_door", (6.48, 0.16, 0.17), location=(-0.65, -1.50, z))
        kit.solid("hangar_raised_door", door, concrete_dark, "hangarconcretedark", outline=0.004)
    for sx in (-3.83, 2.53):
        door_track = kit.box("hangar_door_track", (0.13, 0.14, 3.05), location=(sx, -1.52, 0.55))
        kit.solid("hangar_door_track", door_track, service_yellow, "serviceyellow", outline=0)

    # Overhead handling system. Yellow is physical machinery/hazard paint,
    # not UI emphasis, and gives the otherwise neutral building a clear role.
    crane = kit.box("hangar_crane", (5.75, 0.18, 0.28), location=(-0.65, -1.58, 3.00), bevel=0.02)
    kit.solid("hangar_crane", crane, service_yellow, "serviceyellow")
    trolley = kit.box("hangar_trolley", (0.58, 0.20, 0.38), location=(-0.05, -1.66, 2.69), bevel=0.03)
    kit.solid("hangar_trolley", trolley, T["rust"], "rust")
    cable = kit.box("hangar_crane_cable", (0.06, 0.08, 0.72), location=(-0.05, -1.68, 1.95))
    kit.solid("hangar_crane_cable", cable, concrete, "hangarconcrete", outline=0)
    hook = kit.box("hangar_hook", (0.28, 0.10, 0.22), location=(0.05, -1.70, 1.83), rotation=(0, -0.35, 0))
    kit.solid("hangar_hook", hook, service_yellow, "serviceyellow", outline=0.006)

    # Rear catwalk, tool cabinets and work benches add the maintenance-bay
    # density of the reference while remaining broad enough to survive at the
    # sprite's in-game scale.
    catwalk = kit.box("hangar_rear_catwalk", (5.10, 0.12, 0.16), location=(-0.65, -1.48, 2.35))
    kit.solid("hangar_rear_catwalk", catwalk, concrete_dark, "hangarconcretedark", outline=0.004)
    catwalk_rail = kit.box("hangar_rear_catwalk_rail", (5.00, 0.08, 0.10), location=(-0.65, -1.53, 2.58))
    kit.solid("hangar_rear_catwalk_rail", catwalk_rail, service_yellow, "serviceyellow", outline=0)
    for sx in (-2.15, 0.90):
        cabinet = kit.box("hangar_tool_cabinet", (0.62, 0.12, 0.82), location=(sx, -1.58, 0.58), bevel=0.02)
        kit.solid("hangar_tool_cabinet", cabinet, T["rust"], "rust")
        drawer = kit.box("hangar_tool_drawer", (0.42, 0.06, 0.12), location=(sx, -1.67, 0.88))
        kit.solid("hangar_tool_drawer", drawer, concrete, "hangarconcrete", outline=0)
    for sx in (-1.30, 1.70):
        bench = kit.box("hangar_workbench", (0.92, 0.12, 0.20), location=(sx, -1.61, 0.76), bevel=0.02)
        kit.solid("hangar_workbench", bench, service_yellow, "serviceyellow", outline=0.004)
        for leg_x in (-0.34, 0.34):
            leg = kit.box("hangar_bench_leg", (0.10, 0.08, 0.46), location=(sx + leg_x, -1.60, 0.30))
            kit.solid("hangar_bench_leg", leg, concrete_dark, "hangarconcretedark", outline=0.003)

    # Two attached maintenance towers and connecting catwalks make the bay feel
    # occupied and functional instead of a black box around the rocket.
    for sx in (-3.18, 1.88):
        post = kit.box("hangar_service_post", (0.20, 0.14, 2.55), location=(sx, -1.60, 0.52))
        kit.solid("hangar_service_post", post, concrete, "hangarconcrete", outline=0.006)
        for z in (1.15, 1.92):
            platform = kit.box("hangar_service_platform", (0.88, 0.16, 0.15), location=(sx, -1.65, z))
            kit.solid("hangar_service_platform", platform, T["rust"], "rust", outline=0.006)
            rail = kit.box("hangar_platform_rail", (0.80, 0.08, 0.10), location=(sx, -1.68, z + 0.20))
            kit.solid("hangar_platform_rail", rail, service_yellow, "serviceyellow", outline=0)
    for sx in (-3.1, -1.5, 0.1, 1.7):
        lamp = kit.box("hangar_work_light", (0.42, 0.10, 0.12), location=(sx, -1.72, 2.54), bevel=0.02)
        kit.solid("hangar_work_light", lamp, T["cyan_bright"], "cyanbright", outline=0)

    # Integrated workshop bay on the right remains inside the same facade and
    # roof line; it is not a second little shed floating beside the hangar.
    workshop = kit.box("hangar_workshop", (1.48, 0.20, 3.54), location=(3.72, -1.15, 0.46), bevel=0.03)
    kit.solid("hangar_workshop", workshop, concrete, "hangarconcrete")
    for z in (1.05, 1.72, 2.39):
        window = kit.box("hangar_workshop_window", (1.00, 0.12, 0.28), location=(3.72, -1.46, z))
        kit.solid("hangar_workshop_window", window, T["rust"], "rust", outline=0.005)
        light = kit.box("hangar_workshop_light", (0.72, 0.08, 0.08), location=(3.72, -1.54, z + 0.06))
        kit.solid("hangar_workshop_light", light, T["cyan_bright"], "cyanbright", outline=0)

    return dict(layout=(400, 231), ortho=7.8, mode="flat", target=(0, -1.3, 3.25))


def pad_complex():
    """Straight-on launch complex sharing the hangar's scale and baseline.

    Every visible part is structurally attached. Folded service bridges replace
    the detached arm blocks from v2, tanks connect to the mount through a real
    pipe rack, and the 3D apron is reduced to a thin side-view concrete deck.
    """
    concrete = kit.tint(T["steel"], 0.92)
    concrete_dark = kit.tint(T["steel"], 0.70)
    service_yellow = kit.tint(T["amber"], 1.10)

    base = kit.box("complex_base", (9.6, 0.36, 0.34), location=(0, -1.0, 0), bevel=0.04)
    kit.solid("complex_base", base, concrete_dark, "complexconcretedark")
    deck = kit.box("complex_deck", (8.8, 0.24, 0.46), location=(-0.1, -1.24, 0.32), bevel=0.03)
    kit.solid("complex_deck", deck, concrete, "complexconcrete")
    trench = kit.box("complex_flame_trench", (1.25, 0.16, 0.28), location=(0.25, -1.42, 0.54))
    kit.solid("complex_flame_trench", trench, T["void"], "void", outline=0.008)
    for sx in (-3.7, -3.15, -2.6, 2.7, 3.25, 3.8):
        marker = kit.box("complex_edge_marker", (0.34, 0.10, 0.09), location=(sx, -1.47, 0.78))
        kit.solid("complex_edge_marker", marker, service_yellow, "serviceyellow", outline=0)

    # Main fixed service tower: dark frame, pale floor plates, rust railings.
    tower_x = -2.45
    spine = kit.box("complex_tower_spine", (0.92, 0.22, 5.55), location=(tower_x, -1.08, 0.78), bevel=0.03)
    kit.solid("complex_tower_spine", spine, T["hull_dark"], "hulldark")
    for sx in (-3.24, -1.66):
        post = kit.box("complex_tower_post", (0.18, 0.20, 5.75), location=(sx, -1.26, 0.74))
        kit.solid("complex_tower_post", post, T["hull_dark"], "hulldark")
    for bay, z in enumerate((1.45, 2.40, 3.35, 4.30, 5.25)):
        platform = kit.box("complex_platform", (2.05, 0.26, 0.18), location=(tower_x + 0.10, -1.38, z))
        kit.solid("complex_platform", platform, concrete, "complexconcrete")
        rail = kit.box("complex_platform_rail", (1.70, 0.10, 0.14), location=(tower_x + 0.10, -1.51, z + 0.24))
        kit.solid("complex_platform_rail", rail, T["rust"], "rust", outline=0.004)
        light = kit.box("complex_platform_light", (0.28, 0.08, 0.14), location=(tower_x, -1.58, z + 0.32))
        kit.solid("complex_platform_light", light, T["cyan_bright"], "cyanbright", outline=0)
        # X bracing is anchored between the fixed posts; it never extends into
        # empty space and survives clearly at game scale.
        if bay < 4:
            for angle in (-0.63, 0.63):
                brace = kit.box("complex_tower_brace", (0.10, 0.10, 1.45), location=(tower_x, -1.48, z + 0.48), rotation=(0, angle, 0))
                kit.solid("complex_tower_brace", brace, T["hull_dark"], "hulldark", outline=0.004)
    cap = kit.box("complex_tower_cap", (2.12, 0.28, 0.32), location=(tower_x, -1.31, 6.22), bevel=0.03)
    kit.solid("complex_tower_cap", cap, service_yellow, "serviceyellow")

    # A shorter central strongback creates the empty vehicle slot. Two enclosed
    # bridges connect directly between real supports rather than ending in air.
    strong_x = 0.72
    strongback = kit.box("complex_strongback", (0.72, 0.24, 4.55), location=(strong_x, -1.13, 0.76), bevel=0.03)
    kit.solid("complex_strongback", strongback, T["hull_dark"], "hulldark")
    for z in (1.55, 2.52, 3.49, 4.46):
        collar = kit.box("complex_strongback_collar", (1.18, 0.28, 0.18), location=(strong_x, -1.38, z))
        kit.solid("complex_strongback_collar", collar, concrete, "complexconcrete")
    for z in (2.52, 4.46):
        bridge = kit.box("complex_service_bridge", (2.48, 0.24, 0.28), location=(-0.55, -1.44, z + 0.18), bevel=0.02)
        kit.solid("complex_service_bridge", bridge, T["rust"], "rust")
        bridge_light = kit.box("complex_bridge_light", (0.24, 0.08, 0.18), location=(0.35, -1.58, z + 0.22))
        kit.solid("complex_bridge_light", bridge_light, T["cyan_bright"], "cyanbright", outline=0)

    # Vehicle mount and exhaust handling are one grounded assembly.
    mount = kit.box("complex_mount", (1.55, 0.28, 0.36), location=(-0.22, -1.39, 0.78), bevel=0.04)
    kit.solid("complex_mount", mount, T["hull_dark"], "hulldark")
    for sx, angle in ((-0.62, -0.22), (0.18, 0.22)):
        clamp = kit.box("complex_hold_down", (0.30, 0.24, 0.74), location=(sx, -1.49, 1.03), rotation=(0, angle, 0))
        kit.solid("complex_hold_down", clamp, T["rust"], "rust")

    # White propellant tanks, rust bands and a visible yellow feed rack give a
    # second material family and physically connect storage to the mount.
    for i, sx in enumerate((2.18, 3.18)):
        tank = kit.cylinder("complex_tank", 0.53, 1.45, location=(sx, -1.18, 0.78), verts=12)
        kit.solid("complex_tank", tank, concrete, "complexconcrete")
        dome = kit.cone("complex_tank_dome", 0.53, 0.32, location=(sx, -1.18, 2.23), verts=12, radius2=0.30)
        kit.solid("complex_tank_dome", dome, concrete, "complexconcrete")
        neck = kit.cylinder("complex_tank_neck", 0.11, 0.26, location=(sx, -1.18, 2.55), verts=10)
        kit.solid("complex_tank_neck", neck, T["hull_dark"], "hulldark", outline=0.004)
        band = kit.cylinder("complex_tank_band", 0.55, 0.16, location=(sx, -1.18, 1.35), verts=12)
        kit.solid("complex_tank_band", band, T["rust"], "rust", outline=0)
        gauge = kit.box("complex_tank_gauge", (0.18, 0.08, 0.18), location=(sx, -1.72, 1.70))
        kit.solid("complex_tank_gauge", gauge, T["cyan_bright"], "cyanbright", outline=0)
        feed = kit.box("complex_feed_pipe", (1.05 + i * 0.98, 0.12, 0.14), location=(1.46, -1.54, 1.02 + i * 0.22))
        kit.solid("complex_feed_pipe", feed, service_yellow, "serviceyellow", outline=0.004)

    # One braced lightning mast closes the silhouette and is visibly bolted to
    # the same foundation, replacing v2's pair of isolated needle shapes.
    mast_x = 4.18
    mast_base = kit.box("complex_mast_base", (0.62, 0.28, 0.34), location=(mast_x, -1.30, 0.54), bevel=0.03)
    kit.solid("complex_mast_base", mast_base, T["hull_dark"], "hulldark")
    mast = kit.box("complex_mast", (0.16, 0.16, 4.75), location=(mast_x, -1.35, 0.78))
    kit.solid("complex_mast", mast, T["hull_dark"], "hulldark")
    brace = kit.box("complex_mast_brace", (0.12, 0.12, 1.75), location=(3.88, -1.40, 0.72), rotation=(0, -0.22, 0))
    kit.solid("complex_mast_brace", brace, concrete_dark, "complexconcretedark", outline=0.006)
    spike = kit.cone("complex_mast_spike", 0.17, 0.48, location=(mast_x, -1.35, 5.53), verts=8)
    kit.solid("complex_mast_spike", spike, service_yellow, "serviceyellow")

    return dict(layout=(390, 260), ortho=7.8, mode="flat", target=(0, -1.3, 3.25))


BUILDS = {
    "hub/pad_deck": pad_deck,
    "hub/pad_gantry_frame": pad_gantry_frame,
    "hub/pad_swing_arm": pad_swing_arm,
    "hub/pad_clamp": pad_clamp,
    "hub/pad_mast": pad_mast,
    "hub/pad_tank": pad_tank,
    "hub/pad_hangar_v3": pad_hangar,
    "hub/pad_complex_v3": pad_complex,
}

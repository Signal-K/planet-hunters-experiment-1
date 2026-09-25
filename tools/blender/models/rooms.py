"""Ship customiser room-slot icons — one per ShipRoomKind (shipRooms.ts).

Third pass (2026-08-03). The first two passes were both wrong in the same
direction: flat 64x64 "icon badge" sprites (one shape, or one dominant shape,
on a flat frame). The actual reference (Liam, pasted screenshot — an Out
There: Omega/Pixel Starships-style room interior: back wall with a window,
floor, a side wall with a door, and real furniture inside) is a full interior
DIORAMA, not a badge. This pass rebuilds every room as a 3-wall room shell
(back wall + floor + one side wall, the near walls/ceiling omitted so the
camera looks into the room) with room-specific furniture inside, shot with
`landnam_kit.py`'s new `room` camera mode — a shallow 3/4 tilt (pitch 22,
yaw 20) rather than a full isometric corner view, so it reads mostly
front-on with just enough tilt to reveal the floor and one side wall.

Still the same underlying pipeline (no lights, facet shading by world normal,
inverted-hull outlines, restrained opt-in grain) — this is a new camera
angle and more geometry per room, not a new rendering technology.

These are stretched to each slot's own rectangle by `ShipCustomizerCanvas`
(non-uniform, no aspect preservation) — kept square (96x96, bigger than the
old 64x64 now that each room has actual depth/furniture to read) throughout;
the canvas distorts it to whatever the slot's aspect actually is.
"""

import landnam_kit as kit

T = kit.TOKENS

LAYOUT = (96, 96)
ORTHO = 3.7
TARGET = (0.0, 1.05, 0.75)

ROOM_W = 1.3    # half-width, X in [-ROOM_W, ROOM_W]
ROOM_D = 2.3    # depth, Y in [0, ROOM_D] — 0 is the open/near side, ROOM_D is the back wall
ROOM_H = 1.8    # height, Z in [0, ROOM_H]


def solid(*args, **kwargs):
    """kit.solid with grain on by default — see ships.py's identical wrapper."""
    kwargs.setdefault("grain", True)
    return kit.solid(*args, **kwargs)


def _room_shell(accent_hex, window=True, door=True):
    """Back wall + floor + one side wall (west, x=-ROOM_W) — the near walls
    and ceiling are omitted on purpose so the `room`-mode camera (offset
    toward +X/-Y/+Z, see landnam_kit.py) looks straight into the shell's
    inner faces instead of at their backs.

    `kit.box()` only base-anchors Z (it translates the mesh by size_z/2
    internally); X and Y stay centered on the `location` you pass. Floor and
    side wall need to SPAN the room's depth (y in [0, ROOM_D]), so their
    location.y must be ROOM_D/2 (the span's centre), not 0 — placing them at
    y=0 left them centered on the near/open edge, half hanging outside the
    room and half not reaching the back wall at all, which is why the first
    render showed a floor/wall that didn't actually meet the back wall."""
    floor = kit.box("floor", (ROOM_W * 2, ROOM_D, 0.06), location=(0, ROOM_D / 2, 0))
    solid("floor", floor, T["surface_2"], "surface2", outline=0)

    back_wall = kit.box("back_wall", (ROOM_W * 2, 0.08, ROOM_H),
                        location=(0, ROOM_D, 0), bevel=0.02)
    solid("back_wall", back_wall, T["surface_3"], "surface3", outline=0.01)

    side_wall = kit.box("side_wall", (0.08, ROOM_D, ROOM_H),
                        location=(-ROOM_W, ROOM_D / 2, 0), bevel=0.02)
    solid("side_wall", side_wall, T["surface"], "surface", outline=0.01)

    # Ceiling accent strip — a thin glowing bar along the back-wall/ceiling
    # edge, the same cue the reference art's cyan ceiling trim gives.
    trim = kit.box("ceiling_trim", (ROOM_W * 2 - 0.1, 0.1, 0.06),
                   location=(0, ROOM_D - 0.05, ROOM_H - 0.04))
    solid("ceiling_trim", trim, T["cyan_bright"], "cyanbright", outline=0)

    if window:
        # A big window filling most of the back wall — bright, so it reads
        # as glass/view rather than another wall panel. Z is base-anchored,
        # so base + height must stay under ROOM_H or it pokes through the
        # ceiling line (the first render's "floating panel" bug).
        win_base, win_h = ROOM_H * 0.35, ROOM_H * 0.5
        frame = kit.box("win_frame", (ROOM_W * 1.7, 0.02, win_h + 0.08),
                        location=(0, ROOM_D - 0.05, win_base - 0.04), bevel=0.02)
        solid("win_frame", frame, T["hull_dark"], "hulldark", outline=0.012)
        glass = kit.box("win_glass", (ROOM_W * 1.5, 0.01, win_h),
                        location=(0, ROOM_D - 0.09, win_base))
        solid("win_glass", glass, T["cyan"], "cyan", outline=0)

    if door:
        # A door on the side wall, near the back — vertical panel with a
        # glowing frame, the reference's lit doorway cue. Floor-anchored
        # (base z=0) so it doesn't overflow the ceiling either.
        door_h = ROOM_H * 0.8
        frame = kit.box("door_frame", (0.05, 0.62, door_h + 0.06),
                        location=(-ROOM_W + 0.06, ROOM_D - 0.55, 0), bevel=0.01)
        solid("door_frame", frame, accent_hex, "dooraccent", outline=0)
        panel = kit.box("door_panel", (0.03, 0.5, door_h),
                        location=(-ROOM_W + 0.09, ROOM_D - 0.55, 0))
        solid("door_panel", panel, T["hull_dark"], "hulldark", outline=0.01)

    # Floor light — a glowing disc underfoot, set toward the front/open edge
    # so it doesn't collide with whatever furniture sits mid-room.
    light = kit.cylinder("floor_light", 0.4, 0.03, location=(0, 0.55, 0.04), verts=14)
    solid("floor_light", light, accent_hex, "flooraccent", outline=0)
    light_core = kit.cylinder("floor_light_core", 0.22, 0.05, location=(0, 0.55, 0.06), verts=14)
    solid("floor_light_core", light_core, T["cyan_bright"], "cyanbright", outline=0)


def _tier_lerp(tier, lo, hi):
    """Linear interpolation across tiers 1..5 — the shared knob every tiered
    room builder below uses so "more advanced" reads as a consistent visual
    language (bigger, brighter, more units) rather than five unrelated
    one-off scenes."""
    return lo + (hi - lo) * (tier - 1) / 4.0


def _spread(n, lo, hi):
    """n evenly spaced positions across [lo, hi] (n=1 centers)."""
    if n <= 1:
        return [(lo + hi) / 2.0]
    return [lo + (hi - lo) * i / (n - 1) for i in range(n)]


def cockpit_t1():
    """Command chair on its plinth, facing the window, with a console and
    two angled support struts — the reference art's own composition."""
    _room_shell(T["cyan"])
    seat_pedestal = kit.cylinder("seat_pedestal", 0.16, 0.5, location=(0, 0.95, 0.09), verts=10)
    solid("seat_pedestal", seat_pedestal, T["steel"], "steel", outline=0.01)
    seat = kit.box("seat", (0.5, 0.46, 0.14), location=(0, 0.95, 0.58), bevel=0.05)
    solid("seat", seat, T["steel"], "steel", outline=0.012)
    backrest = kit.box("backrest", (0.5, 0.14, 0.7), location=(0, 1.14, 0.58), bevel=0.05)
    solid("backrest", backrest, T["steel"], "steel", outline=0.012)
    headrest = kit.box("headrest", (0.4, 0.12, 0.24), location=(0, 1.1, 1.16), bevel=0.04)
    solid("headrest", headrest, T["hull_dark"], "hulldark", outline=0.008)
    # Two struts angling from the pedestal up to a console ring in front —
    # the reference's diagonal actuator-arm read.
    for sx in (-1, 1):
        strut = kit.box("strut", (0.05, 0.05, 0.55), location=(sx * 0.32, 0.65, 0.1),
                        rotation=(-0.5, 0, sx * 0.15))
        solid("strut", strut, T["amber"], "amber", outline=0.008)
    console = kit.cylinder("console", 0.34, 0.05, location=(0, 0.4, 0.42),
                           rotation=(1.5708, 0, 0), verts=12)
    solid("console", console, T["cyan_bright"], "cyanbright", outline=0.01)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


def _engine_room(tier):
    """Turbine housing(s) set back near the window, venting into the room —
    the "propulsion" read at full interior scale. Progression (T1->T5):
    a single small turbine grows into a bank of up to three, each bigger
    and paired with more venting — the same "more/bigger units" language
    every tiered room here uses."""
    _room_shell(T["amber"])
    count = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3}[tier]
    hr = _tier_lerp(tier, 0.5, 0.66)   # housing radius
    tr = _tier_lerp(tier, 0.56, 0.78)  # turbine radius
    for i, sx in enumerate(_spread(count, -0.75, 0.75)):
        housing = kit.cylinder("housing", hr, 0.9, location=(sx, 1.5, 0.75),
                               rotation=(1.5708, 0, 0), verts=10)
        solid("housing", housing, T["steel"], "steel", outline=0.014)
        turbine = kit.cone("turbine", radius=tr, depth=0.5, location=(sx, 1.05, 0.75),
                           rotation=(1.5708, 0, 0), radius2=tr * 0.32, verts=10)
        solid("turbine", turbine, T["cyan_bright"], "cyanbright", outline=0.014)
        if tier >= 3:
            ring = kit.cylinder("ring", tr * 1.12, 0.06, location=(sx, 1.32, 0.75),
                                rotation=(1.5708, 0, 0), verts=10)
            solid("ring", ring, T["amber"], "amber", outline=0.01)
    for dz in (-0.35, 0.35):
        vent = kit.box("vent", (0.9, 0.4, 0.08), location=(0, 0.6, 0.75 + dz))
        solid("vent", vent, T["hull_dark"], "hulldark", outline=0)
    if tier >= 4:
        for dz in (-0.55, 0.55):
            vent = kit.box("vent2", (0.5, 0.28, 0.06), location=(0, 0.35, 0.75 + dz))
            solid("vent2", vent, T["hull_dark"], "hulldark", outline=0)
    if tier >= 5:
        core = kit.cylinder("core", 0.14, 0.4, location=(0, 0.75, 1.25),
                            rotation=(1.5708, 0, 0), verts=8)
        solid("core", core, T["cyan_bright"], "cyanbright", outline=0.01)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


def _storage_silo(tier):
    """Storage Silos — the payload/cargo-bay room reskinned as a row of
    upright cylindrical silos rather than stacked crates (Liam, 2026-08-04:
    reskin of the existing `payload` kind, not a new ShipRoomKind).
    Progression (T1->T5): 2 low silos growing to 6 taller ones, each with a
    fuller top-mounted level gauge — reads as "more capacity" at a glance."""
    _room_shell(T["rust"])
    count = {1: 2, 2: 3, 3: 4, 4: 5, 5: 6}[tier]
    radius = max(0.2, min(0.34, (ROOM_W * 1.7) / (count * 2.1)))
    height = _tier_lerp(tier, 0.85, 1.55)
    for sx in _spread(count, -ROOM_W + radius + 0.05, ROOM_W - radius - 0.05):
        body = kit.cylinder("silo_body", radius, height, location=(sx, 1.25, 0.03), verts=10)
        solid("silo_body", body, T["rust"], "rust", outline=0.012)
        band = kit.cylinder("silo_band", radius * 1.04, 0.06, location=(sx, 1.25, height * 0.62),
                            verts=10)
        solid("silo_band", band, T["hull_dark"], "hulldark", outline=0)
        cap = kit.cylinder("silo_cap", radius * 0.9, 0.1, location=(sx, 1.25, height),
                           verts=10)
        solid("silo_cap", cap, T["cyan_bright"], "cyanbright", outline=0.008)
    if tier >= 3:
        # A shared gantry rail along the tops — reads as "networked capacity"
        # rather than loose silos once there are enough of them to span.
        rail = kit.box("rail", (ROOM_W * 1.7, 0.05, 0.04), location=(0, 1.25, height + 0.1))
        solid("rail", rail, T["steel"], "steel", outline=0.006)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


def _mining_room(tier):
    """Mining laser rig — barrel(s), focusing lens and beam glow, mounted on
    a floor cradle facing the window (in-game name: mining laser; game-model
    key stays `booster`, see shipRooms.ts). Progression (T1->T5): a single
    thin barrel grows into a wider, brighter rig and gains a second barrel
    at T4+, with the beam widening and gaining a cyan core at the top tier."""
    _room_shell(T["amber"])
    barrel_count = {1: 1, 2: 1, 3: 1, 4: 2, 5: 2}[tier]
    barrel_r = _tier_lerp(tier, 0.24, 0.36)
    lens_r = _tier_lerp(tier, 0.2, 0.32)
    barrel_gap = barrel_r * 2.6
    cradle_w = max(_tier_lerp(tier, 0.7, 1.0), barrel_gap + barrel_r * 2 + 0.1)
    cradle = kit.box("cradle", (cradle_w, 0.9, 0.3), location=(0, 1.1, 0.03), bevel=0.03)
    solid("cradle", cradle, T["hull_dark"], "hulldark", outline=0.01)
    positions = _spread(barrel_count, -barrel_gap / 2, barrel_gap / 2) if barrel_count > 1 else (0,)
    for sx in positions:
        barrel = kit.cylinder("barrel", barrel_r, 1.1, location=(sx, 0.9, 0.55),
                              rotation=(1.5708, 0, 0), verts=10)
        solid("barrel", barrel, T["steel"], "steel", outline=0.012)
        collar = kit.cylinder("collar", barrel_r * 1.2, 0.1, location=(sx, 1.4, 0.55),
                              rotation=(1.5708, 0, 0), verts=10)
        solid("collar", collar, T["hull_dark"], "hulldark", outline=0.008)
        lens = kit.cone("lens", radius=lens_r, depth=0.3, location=(sx, 1.55, 0.55),
                        rotation=(1.5708, 0, 0), radius2=lens_r * 0.25, verts=10)
        solid("lens", lens, T["amber"], "amber", outline=0.012)
        beam = kit.box("beam", (barrel_r * 0.4, 0.55, barrel_r * 0.4), location=(sx, 1.95, 0.55))
        solid("beam", beam, T["cyan_bright"], "cyanbright", outline=0)
    if tier >= 3:
        ring = kit.cylinder("ring", cradle_w * 0.55, 0.06, location=(0, 1.7, 0.55),
                            rotation=(1.5708, 0, 0), verts=12)
        solid("ring", ring, T["amber"], "amber", outline=0.01)
    if tier >= 5:
        core = kit.box("core", (0.08, 0.4, 0.08), location=(0, 1.95, 0.55))
        solid("core", core, T["cyan_bright"], "cyanbright", outline=0)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


def fuel_stage_t1():
    """A tall propellant tank against the back wall, feed line running to
    the foreground."""
    _room_shell(T["cyan"])
    body = kit.cylinder("body", 0.42, 1.3, location=(0, 1.5, 0.7), verts=10)
    solid("body", body, T["steel"], "steel", outline=0.014)
    band = kit.cylinder("band", 0.44, 0.08, location=(0, 1.5, 1.0), verts=10)
    solid("band", band, T["hull_dark"], "hulldark", outline=0)
    dome = kit.cone("dome", radius=0.42, depth=0.3, location=(0, 1.5, 1.35),
                    radius2=0.05, verts=10)
    solid("dome", dome, T["cyan_bright"], "cyanbright", outline=0.012)
    feed = kit.cylinder("feed", 0.08, 1.0, location=(0, 1.0, 0.15),
                        rotation=(1.5708, 0, 0), verts=6)
    solid("feed", feed, T["amber"], "amber", outline=0.008)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


def fairing_t1():
    """Two nose-shroud halves standing open in the middle of the room,
    payload visible between them."""
    _room_shell(T["steel"])
    for sx in (-0.32, 0.32):
        half = kit.cone("half", radius=0.4, depth=1.5, location=(sx, 1.2, 0.75),
                        rotation=(1.5708, 0, sx * -0.35), radius2=0.02, verts=10)
        solid("half", half, T["steel"], "steel", outline=0.014)
    payload = kit.box("payload", (0.32, 0.32, 0.4), location=(0, 1.1, 0.4), bevel=0.03)
    solid("payload", payload, T["cyan_bright"], "cyanbright", outline=0.012)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


def docking_port_t1():
    """A docking collar mounted flush in the back wall, like an airlock,
    with a bright cross reticle."""
    _room_shell(T["steel"])
    collar = kit.cylinder("collar", 0.55, 0.12, location=(0, ROOM_D - 0.1, 0.85),
                          rotation=(1.5708, 0, 0), verts=12)
    solid("collar", collar, T["steel"], "steel", outline=0.016)
    opening = kit.cylinder("opening", 0.36, 0.14, location=(0, ROOM_D - 0.14, 0.85),
                           rotation=(1.5708, 0, 0), verts=12)
    solid("opening", opening, T["void"], "void", outline=0)
    for rot in (0, 1.5708):
        bar = kit.box("bar", (0.66, 0.03, 0.05), location=(0, ROOM_D - 0.16, 0.85),
                     rotation=(rot, 0, 0))
        solid("bar", bar, T["cyan_bright"], "cyanbright", outline=0.008)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


def heat_shield_t1():
    """A domed ablative plate mounted on a stand, scorched rim facing out."""
    _room_shell(T["rust"])
    stand = kit.cylinder("stand", 0.1, 0.5, location=(0, 1.1, 0.1), verts=8)
    solid("stand", stand, T["hull_dark"], "hulldark", outline=0.008)
    rim = kit.cylinder("rim", 0.55, 0.14, location=(0, 1.1, 0.75),
                       rotation=(1.5708, 0, 0), verts=12)
    solid("rim", rim, T["rust"], "rust", outline=0.016)
    dome = kit.cylinder("dome", 0.46, 0.3, location=(0, 1.0, 0.75),
                        rotation=(1.5708, 0, 0), verts=12)
    solid("dome", dome, T["steel"], "steel", outline=0.01)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


def _crew_module(tier):
    """Bunk(s) against the side wall, porthole(s) above, blanket + pillow.
    Progression (T1->T5): one bunk grows into a stacked double bunk (T3+)
    and a second berth against the far side of the room (T4+), reading as
    rising crew-transport capacity."""
    _room_shell(T["cyan"])
    levels = {1: 1, 2: 1, 3: 2, 4: 2, 5: 2}[tier]
    berths = {1: 1, 2: 1, 3: 1, 4: 2, 5: 2}[tier]
    for berth_i, sy in enumerate(_spread(berths, 0.85, 1.55)):
        for level in range(levels):
            bz = 0.17 + level * 0.42
            bunk = kit.box("bunk", (0.9, 0.5, 0.34), location=(-0.4, sy, bz), bevel=0.05)
            solid("bunk", bunk, T["steel"], "steel", outline=0.012)
            blanket = kit.box("blanket", (0.86, 0.48, 0.1), location=(-0.4, sy, bz + 0.22))
            solid("blanket", blanket, T["cyan"], "cyan", outline=0.008)
            pillow = kit.box("pillow", (0.24, 0.3, 0.12), location=(-0.7, sy - 0.1, bz + 0.29), bevel=0.03)
            solid("pillow", pillow, T["cyan_bright"], "cyanbright", outline=0.006)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


def lander_t1():
    """A squat four-legged lander parked in the middle of the bay, dome
    facing the window."""
    _room_shell(T["amber"])
    body = kit.box("body", (0.75, 0.7, 0.5), location=(0, 1.15, 0.28), bevel=0.06)
    solid("body", body, T["steel"], "steel", outline=0.014)
    dome = kit.cylinder("dome", 0.3, 0.26, location=(0, 0.85, 0.58),
                        rotation=(1.5708, 0, 0), verts=10)
    solid("dome", dome, T["cyan_bright"], "cyanbright", outline=0.012)
    for sx, sy in ((-0.45, 0.85), (0.45, 0.85), (-0.45, 1.45), (0.45, 1.45)):
        leg = kit.cylinder("leg", 0.05, 0.3, location=(sx, sy, 0.02), verts=8)
        solid("leg", leg, T["amber"], "amber", outline=0.006)
    return dict(layout=LAYOUT, ortho=ORTHO, mode="room", target=TARGET)


# ─── Grid icons (fourth pass, 2026-08-03) ─────────────────────────────────
#
# The room interiors above are used as a big detail preview (ShipInteriorPreview
# shows one at a time, ~150px+, not stretched) — that's the right size for
# them and they read fine there. The customiser GRID cells are a completely
# different, much smaller context (~70-142px, several visible at once,
# ShipCustomizerCanvas) where even with correct aspect ratio (no more
# non-uniform stretch, fixed the same day) a full walls+floor+furniture
# scene is too low-contrast and small to identify at a glance. Liam's two
# reference images were for these two different UI contexts, not one style
# for both — Pixel Starships' own grid uses flat, bold, single-glyph icon
# tiles, not miniature 3D rooms. These are that: one big, high-contrast,
# instantly-readable shape per room, flat `mode`, small square layout.
ICON_LAYOUT = (64, 64)
ICON_ORTHO = 2.3


def _icon_frame(hex_str):
    frame = kit.box("icon_frame", (2.0, 0.06, 2.0), location=(0, 0.06, -1.0), bevel=0.08)
    solid("icon_frame", frame, hex_str, "iconframe", outline=0.02)


def cockpit_icon():
    _icon_frame(T["surface_3"])
    console = kit.box("console", (1.5, 0.42, 1.1), location=(0, -0.02, -1.0), bevel=0.05)
    solid("console", console, T["hull_dark"], "hulldark")
    screen = kit.box("screen", (1.2, 0.05, 0.75), location=(0, -0.24, -0.55), bevel=0.03)
    solid("screen", screen, T["cyan_bright"], "cyanbright", outline=0.012)
    headrest = kit.box("headrest", (0.6, 0.5, 0.5), location=(0, 0.4, -0.2), bevel=0.06)
    solid("headrest", headrest, T["steel"], "steel")
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


def _engine_icon(tier):
    _icon_frame(T["hull_dark"])
    count = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3}[tier]
    # Radius shrinks as more turbines join so the row still fits inside the
    # frame — a fixed per-turbine radius at count=3 was overflowing the
    # 2-unit-wide frame and reading as a single solid cyan blob.
    r = {1: 0.85, 2: 0.95, 3: 0.62, 4: 0.68, 5: 0.5}[tier]
    gap = r * 2.3
    span = gap * (count - 1) / 2
    for sx in _spread(count, -span, span):
        housing = kit.cylinder("housing", r, 0.7, location=(sx, 0, -0.85),
                               rotation=(1.5708, 0, 0), verts=10)
        solid("housing", housing, T["steel"], "steel", outline=0.014)
        turbine = kit.cone("turbine", radius=r * 0.82, depth=0.6, location=(sx, -0.3, -0.85),
                           rotation=(1.5708, 0, 0), radius2=r * 0.24, verts=10)
        solid("turbine", turbine, T["cyan_bright"], "cyanbright", outline=0.016)
        ring = kit.cylinder("ring", r * 0.42, 0.35, location=(sx, -0.5, -0.85),
                            rotation=(1.5708, 0, 0), verts=8)
        solid("ring", ring, T["amber"], "amber", outline=0.01)
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


def _storage_icon(tier):
    _icon_frame(T["surface_3"])
    count = {1: 2, 2: 3, 3: 4, 4: 5, 5: 6}[tier]
    h = _tier_lerp(tier, 1.1, 1.7)
    spacing = 1.7 / max(1, count - 1) if count > 1 else 1.7
    r = min(0.4, spacing * 0.38)
    for sx in _spread(count, -0.85, 0.85):
        silo = kit.cylinder("silo", r, h, location=(sx, 0, -1.0), verts=10)
        solid("silo", silo, T["rust"], "rust", outline=0.014)
        cap = kit.cylinder("cap", r * 0.94, 0.14, location=(sx, 0, -1.0 + h),
                           verts=10)
        solid("cap", cap, T["cyan_bright"], "cyanbright", outline=0.01)
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


def _mining_icon(tier):
    """Laser barrel + lens + beam wash — matches the diorama's mining laser
    but at icon scale/contrast. "flat" mode looks down +Y, so X/Z are the
    only axes that read on screen; the barrel/collar/lens/beam are spaced
    left-to-right along X so each stays visually distinct instead of the
    (much longer) barrel swallowing the collar and lens behind it. A second
    unit at T4+ is stacked in Z (above), not offset in Y, which rendered
    invisibly behind the first."""
    _icon_frame(T["hull_dark"])
    unit_count = 2 if tier >= 4 else 1
    r = _tier_lerp(tier, 0.42, 0.5) / unit_count * 1.15
    for bz in (_spread(unit_count, -0.55, 0.15) if unit_count > 1 else (-0.55,)):
        barrel = kit.cylinder("barrel", r, 0.7, location=(-0.5, 0, bz),
                              rotation=(0, 1.5708, 0), verts=10)
        solid("barrel", barrel, T["steel"], "steel", outline=0.014)
        collar = kit.cylinder("collar", r * 1.13, 0.14, location=(-0.05, 0, bz),
                              rotation=(0, 1.5708, 0), verts=10)
        solid("collar", collar, T["hull_dark"], "hulldark", outline=0.01)
        lens = kit.cone("lens", radius=r * 0.76, depth=0.4, location=(0.25, 0, bz),
                        rotation=(0, 1.5708, 0), radius2=r * 0.18, verts=10)
        solid("lens", lens, T["amber"], "amber", outline=0.014)
        beam = kit.box("beam", (0.35, r * 0.3, r * 0.3), location=(0.72, 0, bz))
        solid("beam", beam, T["cyan_bright"], "cyanbright", outline=0)
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


def fuel_icon():
    _icon_frame(T["hull_dark"])
    body = kit.cylinder("body", 0.75, 1.5, location=(0, 0, -1.05), verts=10)
    solid("body", body, T["steel"], "steel", outline=0.014)
    band = kit.cylinder("band", 0.78, 0.14, location=(0, 0, -0.5), verts=10)
    solid("band", band, T["hull_dark"], "hulldark", outline=0)
    dome = kit.cone("dome", radius=0.75, depth=0.5, location=(0, 0, -0.3),
                    radius2=0.08, verts=10)
    solid("dome", dome, T["cyan_bright"], "cyanbright", outline=0.012)
    feed = kit.cylinder("feed", 0.14, 0.7, location=(0.85, 0, -1.1),
                        rotation=(0, 1.5708, 0), verts=6)
    solid("feed", feed, T["amber"], "amber", outline=0.008)
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


def fairing_icon():
    _icon_frame(T["surface_3"])
    for sx in (-0.36, 0.36):
        half = kit.cone("half", radius=0.62, depth=1.9, location=(sx, 0, -1.2),
                        radius2=0.03, verts=10)
        solid("half", half, T["steel"], "steel", outline=0.014)
    seam = kit.box("seam", (0.07, 0.06, 1.8), location=(0, -0.03, -0.3))
    solid("seam", seam, T["hull_dark"], "hulldark", outline=0)
    payload = kit.box("payload", (0.42, 0.44, 0.5), location=(0, 0, -1.0), bevel=0.04)
    solid("payload", payload, T["cyan_bright"], "cyanbright", outline=0.012)
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


def docking_icon():
    _icon_frame(T["hull_dark"])
    collar = kit.cylinder("collar", 0.95, 0.18, location=(0, -0.05, -0.4),
                          rotation=(1.5708, 0, 0), verts=12)
    solid("collar", collar, T["steel"], "steel", outline=0.016)
    opening = kit.cylinder("opening", 0.6, 0.2, location=(0, -0.09, -0.4),
                           rotation=(1.5708, 0, 0), verts=12)
    solid("opening", opening, T["void"], "void", outline=0)
    for rot in (0, 1.5708):
        bar = kit.box("bar", (1.1, 0.04, 0.09), location=(0, -0.1, -0.4),
                     rotation=(0, 0, rot))
        solid("bar", bar, T["cyan_bright"], "cyanbright", outline=0.008)
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


def heat_shield_icon():
    _icon_frame(T["hull_dark"])
    rim = kit.cylinder("rim", 1.0, 0.16, location=(0, -0.05, -0.4),
                       rotation=(1.5708, 0, 0), verts=12)
    solid("rim", rim, T["rust"], "rust", outline=0.016)
    dome = kit.cylinder("dome", 0.86, 0.36, location=(0, -0.14, -0.4),
                        rotation=(1.5708, 0, 0), verts=12)
    solid("dome", dome, T["steel"], "steel", outline=0.01)
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


def _crew_icon(tier):
    _icon_frame(T["surface_3"])
    levels = {1: 1, 2: 1, 3: 2, 4: 2, 5: 2}[tier]
    ports = {1: 1, 2: 1, 3: 1, 4: 2, 5: 2}[tier]
    for level in range(levels):
        bz = -1.15 + level * 0.55
        bunk = kit.box("bunk", (1.6, 0.65, 0.5), location=(0, 0.1, bz), bevel=0.06)
        solid("bunk", bunk, T["steel"], "steel", outline=0.012)
        blanket = kit.box("blanket", (1.4, 0.66, 0.14), location=(0.05, 0.1, bz + 0.3))
        solid("blanket", blanket, T["cyan"], "cyan", outline=0.008)
    for sx in _spread(ports, -0.55, 0.55):
        port_rim = kit.cylinder("port_rim", 0.4, 0.1, location=(sx, -0.55, 0.35),
                                rotation=(1.5708, 0, 0), verts=12)
        solid("port_rim", port_rim, T["hull_dark"], "hulldark", outline=0.014)
        port_glass = kit.cylinder("port_glass", 0.28, 0.06, location=(sx, -0.6, 0.35),
                                  rotation=(1.5708, 0, 0), verts=12)
        solid("port_glass", port_glass, T["cyan_bright"], "cyanbright", outline=0)
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


def lander_icon():
    _icon_frame(T["hull_dark"])
    body = kit.box("body", (1.1, 1.0, 0.65), location=(0, 0, -0.6), bevel=0.06)
    solid("body", body, T["steel"], "steel", outline=0.014)
    dome = kit.cylinder("dome", 0.4, 0.34, location=(0, 0, 0.05),
                        rotation=(1.5708, 0, 0), verts=10)
    solid("dome", dome, T["cyan_bright"], "cyanbright", outline=0.012)
    for sx in (-1, 1):
        leg = kit.box("leg", (0.13, 0.13, 0.72), location=(sx * 0.4, 0, -1.25),
                     rotation=(0, sx * 0.5, 0))
        solid("leg", leg, T["amber"], "amber", outline=0.008)
        pad = kit.cylinder("pad", 0.2, 0.07, location=(sx * 0.9, 0, -1.72), verts=8)
        solid("pad", pad, T["hull_dark"], "hulldark", outline=0)
    return dict(layout=ICON_LAYOUT, ortho=ICON_ORTHO, mode="flat", target=(0, 0, -0.3))


BUILDS = {
    "rooms/cockpit_t1": cockpit_t1,
    "rooms/fuel_stage_t1": fuel_stage_t1,
    "rooms/fairing_t1": fairing_t1,
    "rooms/docking_port_t1": docking_port_t1,
    "rooms/heat_shield_t1": heat_shield_t1,
    "rooms/lander_t1": lander_t1,
    "rooms/cockpit_t1_icon": cockpit_icon,
    "rooms/fuel_stage_t1_icon": fuel_icon,
    "rooms/fairing_t1_icon": fairing_icon,
    "rooms/docking_port_t1_icon": docking_icon,
    "rooms/heat_shield_t1_icon": heat_shield_icon,
    "rooms/lander_t1_icon": lander_icon,
}

# ─── Tiered rooms (fifth pass, 2026-08-04) ─────────────────────────────────
#
# Mining Laser (booster), Storage Silos (payload — a reskin, not a new
# ShipRoomKind), Crew Transport (crew-module) and Engine now each get 5
# tiers instead of one, so the customiser can show real visual progression
# as `shipCustomizer.ts` unlocks better parts. Both the big detail diorama
# and the small grid icon are rendered per tier — see that file's
# `CustomizerPart.tier`/`img`/`detailImg` for how a tier's art gets picked.
for _t in range(1, 6):
    BUILDS[f"rooms/engine_room_t{_t}"] = (lambda t: lambda: _engine_room(t))(_t)
    BUILDS[f"rooms/cargo_bay_t{_t}"] = (lambda t: lambda: _storage_silo(t))(_t)
    BUILDS[f"rooms/mining_room_t{_t}"] = (lambda t: lambda: _mining_room(t))(_t)
    BUILDS[f"rooms/crew_module_t{_t}"] = (lambda t: lambda: _crew_module(t))(_t)
    BUILDS[f"rooms/engine_room_t{_t}_icon"] = (lambda t: lambda: _engine_icon(t))(_t)
    BUILDS[f"rooms/cargo_bay_t{_t}_icon"] = (lambda t: lambda: _storage_icon(t))(_t)
    BUILDS[f"rooms/mining_room_t{_t}_icon"] = (lambda t: lambda: _mining_icon(t))(_t)
    BUILDS[f"rooms/crew_module_t{_t}_icon"] = (lambda t: lambda: _crew_icon(t))(_t)

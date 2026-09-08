"""Earth Base hero structures — launchpad and hangar, single-mass sprites.

Supersedes `world_modules.py`'s composited-fragment kit (KES-260/KES-277). That
kit rendered ~9 pieces separately and absolute-positioned them in CSS; each
piece in isolation was a sparse skeleton of thin rods over empty transparent
space, and the composited result read as debris rather than a building — the
"massive regression" feedback that ended that experiment.

Every structure here is ONE Blender scene, ONE render, same pattern as
`ships.py`/`rooms.py` (already a proven quality bar in this pipeline — a ship
renders as one dense, cohesive mass with no gaps). Parts must touch or overlap
their neighbours; nothing floats in isolation. See the ZenNotes decision
"Landnam Earth Base structure art — single-mass render standard" for the full
reference synthesis (Out There: Omega staging, Take On Mars industrial tone,
Crashlands silhouette density, Pixel Starships panel-block surface language).

Ground contact rule (the original KES-260 bug): every structure sits on a flat
or evenly-tapered footing at its own z=0. No rock/grass/soil geometry here —
that is the scene terrain's job, never the structure's.

2026-09-03 (Liam feedback pass): the previous launchpad() still read as
"plasticky concept art, not a game asset" once actually compared on-screen to
the rest of Earth Base, despite technically satisfying "no gaps". The specific
culprit was part *density*, not overlap: three stacked tower boxes, three rail
posts, two free-floating diagonal braces and a thin aerial+beacon stick are
individually fine (they touch) but collectively read as a skeleton of small
pieces — the same silhouette-density mistake KES-277 fixed, one size down.
Rebuilt around five chunky masses (deck, one continuously-tapered tower,
service ring, twin tanks, cabin); surface interest now comes from flush
decals (warning stripes, a window band, tank collars) painted onto those
masses per the brief's Pixel Starships note, never from additional free-
standing structural pieces. Any future addition here should ask: does this
merge into one of the five masses, or is it a floating rod? Only the former
belongs.
"""

import math

import landnam_kit as kit

T = kit.TOKENS
INK = T["hull_dark"]
STEEL = kit.tint(T["hull"], 0.88)
STEEL_DARK = kit.tint(T["hull_dark"], 0.92)
RUST = T["rust"]
SAFETY = kit.tint(T["amber"], 0.78)
CRIMSON = T["crimson"]
GLASS = T["cyan"]
GLASS_LIT = T["cyan_bright"]
PLATE = kit.tint(T["hull"], 0.78)
PLATE_DARK = kit.tint(T["hull_dark"], 0.84)
# The raw, un-tinted "steel" token — much lighter than STEEL/PLATE above
# (both of which are the *hull* tint, close in value to INK/hull_dark once
# the front-facing FACET_SHADE=0.68 multiplier is applied). Reserved for
# trim that actually needs to pop against the hull-toned mass.
BRIGHT = T["steel"]
OUTLINE = 0.014
FINE = 0.007

# 2026-09-03 (Liam feedback, tenth pass): the REAL reason BRIGHT still read
# as "barely there" after switching the door/cladding to it wasn't the hex
# choice at all — it was that every one of STEEL / STEEL_DARK / PLATE /
# PLATE_DARK / BRIGHT was being passed to `box()`/`solid()` with the SAME
# material `key="steel"`. `landnam_kit.emission_material()` intentionally
# caches materials by name ("`{key}_lit`"/"`_mid`"/"`_shade`") "so repeated
# calls across models share one material rather than accumulating
# duplicates" — that's a deliberate, correct optimization *as long as one
# key always means one hex*. Structures.py was quietly violating that
# invariant: five different colours under one key name. Whichever
# "steel"-keyed box got built FIRST in a given render (hangar_apron's
# PLATE_DARK, in the hangar's case) permanently won the "steel_lit/mid/
# shade" materials for every other "steel"-keyed part built afterwards in
# that same render — door, cladding, header, tracks, roof ribs, vent, annex
# box, all silently recoloured to PLATE_DARK regardless of what constant
# was actually passed in. Confirmed by sampling the rendered PNG's actual
# pixels: zero pixels anywhere near BRIGHT's expected shaded tone
# (~#607385) existed in the image at all — not "low contrast", literally
# never drawn. Fixed by giving each distinct constant its own key (below);
# every future addition here MUST do the same — a new tint needs a new key,
# never a reused one, or it silently inherits whatever hex got there first.
# Each colour constant is now given its own material key at every call
# site: STEEL keeps "steel", STEEL_DARK is "steel_dark", PLATE is "plate",
# PLATE_DARK is "plate_dark", BRIGHT is "bright".


def spec(w, h):
    # 2026-09-03 (Liam feedback, sixth pass): "I DIDN'T WANT A 3D ASSET! 2D/2.5D
    # WAS FINE! LOOK AT THE PERSPECTIVE." mode="side" (11deg pitch / 8deg yaw)
    # reveals a top face on every structure, which reads as a 3D render sitting
    # on top of the game's genuinely flat, front-on 2D terrain (mountains/trees
    # in HubWorldBackground have zero perspective). Checking git history: this
    # project's own hubScene.ts (deleted when Earth Base moved to Blender,
    # KES-260) drew these exact structures as flat 2-3 facet Pixi graphics with
    # no 3D perspective at all — that's the "old asset that looked good", not
    # anything Blender-rendered before this pass. mode="flat" (pitch 90deg, yaw
    # 0) is a true straight-on elevation already built into landnam_kit.py for
    # exactly this: it shows only the front face, so with only a two-tone
    # front/side facet split from a rotated mass (see tower_mass's 45deg
    # rotation in launchpad()) it renders as a flat cel-shaded silhouette,
    # matching the terrain's own style, while staying Blender-authored/code-
    # generated rather than reverting to hand-coded Pixi Graphics (which was
    # the ORIGINAL complaint that moved this to Blender in the first place).
    #
    # 2026-09-03 (Liam feedback, ninth pass): "why are the buildings hovering
    # in the air?" — an orthographic camera's visible vertical span is
    # `target_z +/- h/2`, and this used to take an arbitrary `target_z`
    # (launchpad passed 2.80, hangar 2.60) that was never actually derived
    # from `h`. Neither matched `h/2`, so the rendered frame's bottom edge
    # sat *below* world z=0 — 0.15 world units of blank transparent padding
    # under the launchpad, 0.30 under the hangar (measured directly on the
    # PNGs: 12px and 26px of empty rows at the bottom respectively). The game
    # anchors every sprite by its image's bottom edge (`bottom: var(--hub-
    # ground)`), so that padding rendered as literal empty air between the
    # structure and the ground line. Every structure here sits at its own
    # z=0 by the ground-contact rule (see module docstring) — so the frame's
    # bottom edge must always be exactly z=0, meaning target_z must always be
    # h/2, full stop. No caller should be picking its own target_z; that's
    # what caused this. `ground_margin` is a hair of clearance (a couple of
    # supersampled pixels) so the outline solidify shell — which pushes
    # slightly *outward* past the true mesh silhouette — doesn't get clipped
    # at the very bottom edge; it is not a "let's eyeball a good height"
    # knob.
    ground_margin = 0.02
    return dict(layout=(round(w * 30), round(h * 30)), ortho=max(w, h), mode="flat",
                target=(0, 0, h / 2 - ground_margin))


def solid(name, obj, color, key="site", outline=OUTLINE):
    return kit.solid(name, obj, color, key, outline=outline)


def box(name, size, location, color, key="site", rotation=(0, 0, 0), bevel=0.05, outline=OUTLINE):
    return solid(name, kit.box(name, size, location=location, rotation=rotation, bevel=bevel), color, key, outline)


def beam(name, x, z, length, angle, thickness=0.16, color=INK, key="ink"):
    return box(name, (length, 0.20, thickness), (x, -0.09, z), color, key,
               rotation=(0, angle, 0), bevel=thickness * 0.2, outline=FINE)


def cylinder(name, radius, height, location, color, key="site", outline=OUTLINE, verts=9):
    return solid(name, kit.cylinder(name, radius, height, location=location, verts=verts), color, key, outline)


def _bar(name, cx, z, length, angle, thickness, color, key, y=-0.55):
    """Flush surface bar for the tower's lattice decal — like `beam()` but
    with a *forward* y that clears the tower's own front face. The core mass
    is a 4-sided cone rotated 45deg, so its front face bulges forward as far
    as `radius*cos(45deg)` (up to ~0.42 at the tower's base) — `beam()`'s
    fixed y=-0.09 sits well behind that and renders fully hidden, which is
    why the first pass's rungs/braces were invisible despite being modelled."""
    return box(name, (length, 0.05, thickness), (cx, y, z), color, key,
               rotation=(0, angle, 0), bevel=thickness * 0.2, outline=0)


def _tower_half_width(radius1, radius2, base_z, height, z):
    """Front-view half-width of the 45deg-rotated square-cone tower core at
    height z — a flat face points at the camera, so the visible half-width
    is `radius(z) * cos(45deg)`, not the full circumradius."""
    frac = max(0.0, min(1.0, (z - base_z) / height))
    radius = radius1 + (radius2 - radius1) * frac
    return radius * math.cos(math.radians(45))


def _lattice_tower(tx, base_z, height, radius1=0.60, radius2=0.26):
    """Umbilical/service tower module: one tapered core mass (the silhouette
    a flat-camera render actually needs) plus flush horizontal-rung and
    diagonal-cross-brace decals on its front face — the cheapest way to read
    as a real lattice/truss tower (the reference image's dominant structural
    cue) without modelling open latticework that a straight-on camera with
    zero perspective couldn't show as anything but a silhouette anyway.
    Returns the tower's top z, so callers can stack a cabin/mast on it."""
    top_z = base_z + height
    tower = kit.cone("tower_mass", radius1, height, location=(tx, 0.05, base_z), verts=4,
                      radius2=radius2, rotation=(0, 0, math.radians(45)))
    solid("tower_mass", tower, INK, "ink")

    # Rungs: evenly spaced, each sized to the tower's *actual* width at that
    # height (via `_tower_half_width`) so they hug the taper instead of
    # guessing a width and either overhanging the silhouette or vanishing
    # inside it.
    rung_fracs = (0.18, 0.40, 0.62, 0.84)
    rung_zs = [base_z + height * f for f in rung_fracs]
    rung_hws = [_tower_half_width(radius1, radius2, base_z, height, z) for z in rung_zs]
    for i, (z, hw) in enumerate(zip(rung_zs, rung_hws)):
        _bar(f"tower_rung_{i}", tx, z, hw * 1.8, 0, thickness=0.045, color=STEEL, key="steel")

    # Cross-braces zig-zag between consecutive rungs, alternating direction —
    # the truss pattern the reference photo reads at a glance.
    for i in range(len(rung_zs) - 1):
        z1, z2 = rung_zs[i], rung_zs[i + 1]
        hw1, hw2 = rung_hws[i], rung_hws[i + 1]
        span = ((hw1 + hw2) ** 2 + (z2 - z1) ** 2) ** 0.5
        angle = math.atan2(z2 - z1, hw1 + hw2)
        _bar(f"tower_brace_a_{i}", tx, (z1 + z2) / 2, span, angle,
             thickness=0.032, color=STEEL_DARK, key="steel")
        _bar(f"tower_brace_b_{i}", tx, (z1 + z2) / 2, span, -angle,
             thickness=0.032, color=STEEL_DARK, key="steel")

    box("tower_stripe", (0.40, 0.035, 0.13), (tx, -0.60, base_z + height * 0.30), SAFETY, "safety",
        bevel=0.005, outline=0)
    return top_z


def _swing_arm(tx, base_z, height, radius1, radius2, name, z, length, head=True, strut=False):
    """One retracted crew/umbilical connector arm — a stub parked against the
    tower rather than reaching across to a vehicle that, most of the time,
    isn't there (see `launchpad`'s docstring). Anchored at the tower's own
    front-face edge at this height (`_tower_half_width`) so it visibly fuses
    to the tower instead of floating beside it — the first pass hardcoded a
    flat offset that undershot the taper and left a gap wide enough to read
    as a disconnected, free-floating part. Crimson to match the reference
    photo's red swing arms, distinct from the tower's own steel."""
    edge = tx + _tower_half_width(radius1, radius2, base_z, height, z)
    anchor = edge - 0.08  # bite into the tower mass so the two meshes overlap
    cx = anchor + length / 2
    box(f"{name}_arm", (length, 0.24, 0.20), (cx, 0.0, z), CRIMSON, "crimson", bevel=0.04)
    if head:
        box(f"{name}_head", (0.22, 0.28, 0.28), (anchor + length, 0.0, z), STEEL_DARK, "steel_dark", bevel=0.05)
    if strut:
        box(f"{name}_strut", (0.20, 0.20, 0.55), (anchor + length * 0.30, 0.02, z - 0.45),
            STEEL_DARK, "steel_dark", bevel=0.03, rotation=(0, math.radians(18), 0))


def _platform(px, base_z, leg_top_z, deck_w=4.2, deck_d=1.4, deck_t=0.32):
    """Elevated launch platform on four legs, standing clear of the flame
    trench beneath it — the reference image's mobile-launcher table, not a
    flush pad. Returns the deck's top z (where a composited rocket lands)."""
    leg_h = leg_top_z - base_z
    for lx in (px - 1.5, px - 0.5, px + 0.5, px + 1.5):
        box("platform_leg", (0.24, 0.30, leg_h), (lx, 0.0, base_z), STEEL_DARK, "steel_dark", bevel=0.04)
    box("platform_deck", (deck_w, deck_d, deck_t), (px, 0.05, leg_top_z), PLATE, "plate", bevel=0.08)
    box("platform_deck_lip", (deck_w * 0.96, deck_d * 0.88, 0.045), (px, -0.10, leg_top_z + deck_t),
        RUST, "rust", outline=0, bevel=0.01)
    collar = kit.cylinder("platform_collar", 0.62, 0.05, location=(px, 0.10, leg_top_z + deck_t), verts=10)
    solid("platform_collar", collar, RUST, "rust", outline=0)
    return leg_top_z + deck_t


def _flame_trench(px, base_z):
    """Flush dark trench under the platform's leg-gap, with an angled
    deflector ridge visible through it — the wedge a real pad uses to route
    exhaust sideways instead of straight down. Flush-decal, not a literal
    recess, matching this file's ground-contact rule (footing stays flat)."""
    box("trench_pit", (3.0, 0.85, 0.05), (px, 0.40, base_z + 0.005), INK, "ink", bevel=0.0, outline=0)
    for sign in (-1, 1):
        box("trench_deflector", (0.95, 0.42, 0.10), (px + sign * 0.34, 0.16, base_z + 0.34),
            STEEL_DARK, "steel_dark", bevel=0.02, rotation=(0, sign * math.radians(-24), 0))


def _fuel_tank(x, y, base_z, radius, height):
    """One domed storage tank with a collar band — shared by the launchpad
    and the hangar so both read as part of the same facility instead of
    each inventing its own tank shape."""
    cylinder("pad_tank", radius, height, (x, y, base_z), STEEL, "steel")
    dome = kit.cone("pad_tank_dome", radius, radius * 0.55, location=(x, y, base_z + height),
                     verts=9, radius2=radius * 0.28)
    solid("pad_tank_dome", dome, STEEL_DARK, "steel_dark")
    cylinder("pad_tank_band", radius * 1.04, 0.09, (x, y, base_z + height * 0.58), RUST, "rust", outline=0)


def launchpad():
    """The BASE structure sprite for the pad — rendered once, shown whether
    or not a mission is active. A rocket must NOT be modelled in here: the
    game already composites an actual ship sprite over this art only when
    `player.pendingLaunch` is true (`LaunchpadScreen.tsx`'s
    `launchpad-tower-rocket` `<img>`, positioned by CSS over `.launchpad-
    tower-art`), and most of the time there is no rocket on the pad at all.
    A launch itself is handled by a completely separate system
    (`lib/pixi/launchScene.ts` + `LaunchSequenceCanvas`) with its own
    ignition/liftoff/camera-shake timeline — this file has no animation
    responsibility for that moment. "Rocket" in this rebuild's brief
    ("gantry tower, connectors, rocket etc all modular") means: keep that
    existing modular ship-sprite system as the rocket module, and make sure
    this pad's platform/mount reads clearly as the spot it composites onto
    — not re-bake a rocket in here and re-break the "most of the time there
    isn't one" fix from the previous pass.

    2026-09-03 (Liam feedback, seventh pass — reference photo): "produce
    something basically like this [a real lattice-tower mobile launcher:
    umbilical tower, several red swing arms at different heights, an
    elevated platform on legs over a flame trench] but it fits the flat 2D
    landscape... not from this [oblique 3D] perspective... make the gantry
    tower, connectors, rocket etc all modular." Rebuilt around four modular
    builder functions below (`_lattice_tower`, `_swing_arm`, `_platform`,
    `_flame_trench`) instead of one flat list of boxes, so tower/arms/
    platform can each be re-tuned independently — while the *render* stays
    the single fused-mass scene this file's own doctrine (see module
    docstring) requires: every module is still positioned to touch or
    overlap its neighbour, and the camera stays `mode="flat"` (sixth pass)
    — a straight elevation, zero perspective, matching the terrain's own
    flat 2D style rather than the reference photo's oblique 3D angle.
    """
    w, h = 8.6, 5.9
    base_z = 0.30

    # 1. Apron — one flat slab, dead-flat bottom edge, no terrain baked in.
    box("pad_apron", (8.4, 2.2, base_z), (0, 0.0, 0.0), PLATE_DARK, "plate_dark", bevel=0.10)
    box("pad_apron_lip", (7.9, 1.9, 0.10), (0, -0.16, base_z), INK, "ink", bevel=0.03, outline=FINE)
    for x in (-3.55, -2.95, 3.4, 3.9):
        box("pad_mark", (0.36, 0.07, 0.045), (x, -0.55, base_z + 0.12), SAFETY, "safety", bevel=0.01, outline=0)

    # 2. Umbilical tower — left of the pad, tall enough to dominate the
    # silhouette the way the reference photo's tower does.
    tx = -2.12
    tower_h, tower_r1, tower_r2 = 4.2, 0.60, 0.26
    tower_top = _lattice_tower(tx, base_z, height=tower_h, radius1=tower_r1, radius2=tower_r2)

    # 3. Three swing/connector arms at different heights, retracted against
    # the tower — the reference's multiple red arms, never reaching all the
    # way to the (usually absent) rocket. Lengths grow toward the base (the
    # umbilical arm reaches furthest) matching a real mobile launcher.
    tower_args = (tx, base_z, tower_h, tower_r1, tower_r2)
    _swing_arm(*tower_args, "arm_low", 1.55, length=1.35, strut=True)
    _swing_arm(*tower_args, "arm_mid", 2.65, length=1.10)
    _swing_arm(*tower_args, "arm_high", 3.75, length=0.85, head=False)

    cylinder("tower_ring", 0.82, 0.18, (tx, 0.0, base_z + 4.0), PLATE, "plate", verts=8)
    cylinder("tower_ring_lip", 0.86, 0.04, (tx, 0.0, base_z + 4.0), RUST, "rust", outline=0, verts=8)

    # 4. Tower-top cabin + beacon mast.
    box("tower_cabin", (0.80, 0.52, 0.50), (tx, 0.04, tower_top), STEEL_DARK, "steel_dark", bevel=0.07)
    box("tower_cabin_trim", (0.80, 0.05, 0.06), (tx, -0.26, tower_top), RUST, "rust", outline=0, bevel=0.01)
    box("tower_window", (0.46, 0.04, 0.15), (tx, -0.28, tower_top + 0.14), GLASS_LIT, "glass",
        outline=FINE, bevel=0.01)
    cyl = kit.cylinder("tower_mast", 0.05, 0.55, (tx, 0.0, tower_top + 0.50), verts=6)
    solid("tower_mast", cyl, STEEL, "steel", outline=FINE)
    beacon = kit.cylinder("tower_beacon", 0.09, 0.10, (tx, 0.0, tower_top + 1.05), verts=8)
    solid("tower_beacon", beacon, SAFETY, "safety", outline=0)

    # 5. Elevated launch platform on legs, standing over the flame trench —
    # the reference photo's mobile-launcher table, where a composited rocket
    # would visually land.
    px = 2.08
    _flame_trench(px, base_z)
    _platform(px, base_z, leg_top_z=base_z + 1.05)

    # 6. Fuel tanks beside the tower, plumbed toward the platform along the
    # deck (flush pipe, not a floating rod).
    for x, radius, height in ((tx - 1.00, 0.46, 1.35), (tx - 1.60, 0.37, 1.0)):
        _fuel_tank(x, 0.10, base_z, radius, height)
    box("pad_conduit", (2.4, 0.15, 0.12), (tx + 0.65, 0.60, base_z + 0.06), STEEL_DARK, "steel_dark", bevel=0.04)

    return spec(w, h)


def _bay_doors(cx, base_z, door_h, width=4.4):
    """Recessed double sliding-door panel with a centre seam, panel lines,
    header beam, side tracks and a warning threshold.

    2026-09-03 (Liam feedback, ninth pass): "it just looks like a block."
    The eighth pass's door used STEEL_DARK (`kit.tint(hull_dark, 0.92)`) on
    an INK (`hull_dark`) bay — those two tones sit 8% apart, which reads as
    a couple of faint etched lines, not an actual door. Switched to PLATE
    (`tint(hull, 0.78)`), a genuinely lighter tone, and added the header/
    track framing real hangar doors have, so the opening reads as a door a
    vehicle could roll out of, not a rectangle with two scratches on it."""
    box("hangar_door", (width, 0.30, door_h), (cx, -0.86, base_z), BRIGHT, "bright", bevel=0.06)
    box("hangar_door_seam_v", (0.05, 0.05, door_h), (cx, -1.0, base_z), INK, "ink", outline=FINE)
    for f in (0.35, 0.70):
        box("hangar_door_seam_h", (width - 0.15, 0.05, 0.08), (cx, -1.0, base_z + door_h * f),
            INK, "ink", outline=FINE)
    box("hangar_door_header", (width + 0.35, 0.32, 0.22), (cx, -0.90, base_z + door_h), STEEL_DARK, "steel_dark", bevel=0.04)
    for sign in (-1, 1):
        box("hangar_door_track", (0.20, 0.32, door_h + 0.30), (cx + sign * (width / 2 + 0.12), -0.90, base_z),
            STEEL_DARK, "steel_dark", bevel=0.03)
    box("hangar_threshold", (width, 0.06, 0.05), (cx, -0.95, base_z), SAFETY, "safety", outline=0)


def _wall_cladding(x_from, x_to, base_z, height, y, spacing=0.42, strip_w=0.06):
    """Vertical corrugated-siding strips — the cheap, high-contrast way to
    make a big flat wall mass read as an actual clad building instead of a
    blank rectangle. `y` must land this strictly between the wall's own
    front face and whatever sits in front of it (the door) — see the call
    site in `hangar()` for the depth-ordering math — so the door naturally
    occludes the strips behind it without carving gaps by hand."""
    x = x_from
    i = 0
    while x <= x_to:
        box(f"hangar_clad_{i}", (strip_w, 0.05, height), (x, y, base_z), BRIGHT, "bright", outline=0, bevel=0.0)
        x += spacing
        i += 1


def _gable_fill(cx, wall_top, half_span, rise, y, steps=6):
    """Solid attic infill under the sloped slabs. A `box()` roof slab is a
    flat plank rotated to an angle — it only covers a THIN diagonal strip of
    the (x, z) frame, not the whole triangle under it, so the two-slab roof
    on its own rendered as a hollow wireframe peak with the transparent
    background showing straight through the middle (visible on an actual
    render, not a guess: a wide blank triangle sat between the wall top and
    the two rust struts). This fills that triangle with a stack of
    shrinking-width steps — each step's width taken from the roofline's
    half-width at the TOP of its own z-band, so it stays a hair narrower
    than the true slope and never pokes out past the slab covering it.
    Colour matches the wall (INK) so it reads as one continuous gable end,
    with the sloped slab doing all the actual "roof" colour/texture work in
    front of it."""
    for k in range(steps):
        z0 = wall_top + rise * k / steps
        z1 = wall_top + rise * (k + 1) / steps
        hw = half_span * (1 - (k + 1) / steps)
        if hw <= 0.03:
            continue
        box(f"hangar_gable_fill_{k}", (hw * 2, 0.05, z1 - z0 + 0.015), (cx, y, z0),
            INK, "ink", outline=0, bevel=0.0)


def _gable_roof(cx, wall_top, half_span, rise, depth=2.05):
    """A real peaked roofline — two slabs meeting at a ridge — instead of a
    flat cap. 2026-09-03 (Liam feedback, eighth pass): the previous flat-
    topped box "doesn't really look like anything"; a pitched roof is the
    single strongest silhouette cue for "hangar/warehouse" this camera can
    show. (The sixth pass removed a *subtle* roof tilt because a shallow,
    thin-plank rotation read as a stray diagonal slash — that finding was
    about an ambiguous tilt on an otherwise flat cap, not that a deliberate,
    full peak can't work; a real ridge with two clearly full-height slopes
    reads as a roof, not a glitch.) Returns the ridge z."""
    ridge_z = wall_top + rise
    slab_len = (half_span ** 2 + rise ** 2) ** 0.5
    angle = math.atan2(rise, half_span)
    # Fill the attic triangle FIRST, well behind the slab's own front face
    # (slab front face sits at y = -depth/2), so the slabs draw on top of it
    # wherever they overlap and only the true gap shows the fill through.
    _gable_fill(cx, wall_top, half_span, rise, y=-depth / 2 + 0.25)
    # NB: box()'s rotation pivots around its own base-centre (see `beam()`'s
    # doc comment on the tower braces) — for these full-size slabs that pivot
    # sits at the *midpoint* of the slope, so a positive/negative angle sign
    # decides which end (ridge-ward vs eave-ward) swings up. First pass had
    # this backwards: the "ridge" end landed at wall_top and the "eave" ends
    # flew up above the building, i.e. a floating valley, not a peak sitting
    # on the walls. Signs below are verified against an actual render.
    # 2026-09-03 (tenth pass): thickness was 0.20 — thin enough next to the
    # 0.45-thick ridge cap that the slopes read as sticks meeting a block,
    # not one roof. Bumped to 0.34 so the slab itself has visible mass.
    box("hangar_roof_l", (slab_len, depth, 0.34), (cx - half_span / 2, 0.0, wall_top + rise / 2),
        RUST, "rust", bevel=0.05, rotation=(0, -angle, 0))
    box("hangar_roof_r", (slab_len, depth, 0.34), (cx + half_span / 2, 0.0, wall_top + rise / 2),
        RUST, "rust", bevel=0.05, rotation=(0, angle, 0))
    box("hangar_ridge", (0.65, depth + 0.05, 0.45), (cx, 0.0, ridge_z - 0.10), STEEL_DARK, "steel_dark", bevel=0.06)
    # Roof-rib accents flush on each slope (front face of a `depth`-deep slab
    # sits at y = -depth/2, so decals need to clear that, not `beam()`'s
    # fixed -0.09 — the same occlusion issue the tower's lattice hit).
    rib_y = -(depth / 2) - 0.03
    _bar("hangar_rib_l", cx - half_span / 2, wall_top + rise / 2, slab_len * 0.55, -angle, 0.045, STEEL, "steel", y=rib_y)
    _bar("hangar_rib_r", cx + half_span / 2, wall_top + rise / 2, slab_len * 0.55, angle, 0.045, STEEL, "steel", y=rib_y)
    return ridge_z


def hangar():
    """One continuous hangar volume: solid main bay fused to a peaked roof
    and a workshop annex, all overlapping — no isolated corner posts.

    2026-09-03 (Liam feedback, eighth pass): "the hangar doesn't really look
    like anything" and, separately, the annex windows/lights were floating
    disconnected above the annex block (z=1.55/3.55 windows and lights were
    modelled at heights that landed *outside* the annex's own silhouette at
    this camera framing — the same "debris" bug the launchpad's arms had,
    just never re-checked here since this file's earlier passes were all
    launchpad-focused). Rebuilt with an actual peaked roofline (see
    `_gable_roof`) and every annex fixture re-anchored to sit flush on the
    annex's own face instead of floating above it."""
    w, h = 11.3, 5.8
    base_z = 0.36
    bay_cx = -0.9

    # 1. Apron — one flat slab, dead-flat bottom edge, no terrain baked in.
    box("hangar_apron", (10.6, 2.2, base_z), (0.2, 0.0, 0.0), PLATE_DARK, "plate_dark", bevel=0.10)
    box("hangar_apron_lip", (10.0, 1.9, 0.10), (0.2, -0.16, base_z), INK, "ink", bevel=0.03, outline=FINE)
    for x in (-4.0, -3.3, 3.9, 4.6):
        box("hangar_mark", (0.50, 0.08, 0.05), (x, -0.6, base_z + 0.10), SAFETY, "safety", bevel=0.01, outline=0)

    # 2. Main bay: one solid bunker mass, overlapping the apron.
    bay_w, bay_h = 7.2, 2.5
    box("hangar_bay", (bay_w, 2.0, bay_h), (bay_cx, 0.02, base_z), INK, "ink", bevel=0.11)
    wall_top = base_z + bay_h
    # Cladding sits strictly between the bay's own front face (y=0.02-1.0=
    # -0.98) and the door's front-most element (the door panel, front face
    # -0.86-0.15=-1.01) — visible on the flanking wall, occluded by the door
    # where the two overlap in x.
    _wall_cladding(bay_cx - bay_w / 2 + 0.20, bay_cx + bay_w / 2 - 0.20, base_z + 0.15, bay_h - 0.30, y=-0.975)
    _bay_doors(bay_cx - 0.05, base_z + 0.04, door_h=2.15, width=4.4)

    # 3. Peaked roof — the hangar's dominant, distinguishing silhouette cue.
    ridge_z = _gable_roof(bay_cx, wall_top, half_span=bay_w / 2 + 0.25, rise=1.2)

    # Roof vent stack, sitting flush on the right slope (its base z follows
    # the slope's own height at that x, not a flat assumption).
    vent_x = bay_cx + 1.1
    slope_z = ridge_z - (vent_x - bay_cx) / (bay_w / 2 + 0.25) * 1.2
    box("hangar_vent", (0.55, 0.55, 0.55), (vent_x, 0.0, slope_z), STEEL_DARK, "steel_dark", bevel=0.06)
    cyl = kit.cylinder("hangar_vent_pipe", 0.12, 0.50, (vent_x, 0.0, slope_z + 0.55), verts=8)
    solid("hangar_vent_pipe", cyl, SAFETY, "safety", FINE)

    # 4. Right annex: overlaps the main bay directly, a lower flat-roofed
    # workshop block beside the tall gabled bay (Pixel Starships half-step
    # massing) instead of a floating extra box.
    annex_cx, annex_w, annex_d, annex_h = 3.5, 2.6, 1.9, 2.30
    box("hangar_annex", (annex_w, annex_d, annex_h), (annex_cx, 0.03, base_z), STEEL_DARK, "steel_dark", bevel=0.10)
    annex_top = base_z + annex_h
    box("hangar_annex_roof", (annex_w + 0.25, annex_d + 0.10, 0.28), (annex_cx, 0.02, annex_top),
        RUST, "rust", bevel=0.06)

    # Windows and door sit flush on the annex's own front face — the front
    # face of a `annex_d`-deep box centred at y=0.03 is at y=0.03-annex_d/2,
    # so decals need y below that (the bug the previous pass had: fixed
    # heights that put them near the *roof* line instead of on the wall).
    annex_front_y = 0.03 - annex_d / 2 - 0.03
    for i, x in enumerate((annex_cx - 0.75, annex_cx - 0.25, annex_cx + 0.35, annex_cx + 0.85)):
        box(f"hangar_annex_window_{i}", (0.30, 0.05, 0.34), (x, annex_front_y, base_z + 1.15),
            GLASS_LIT, "glass", bevel=0.02, outline=FINE)
    box("hangar_annex_light_strip", (annex_w - 0.3, 0.05, 0.09), (annex_cx, annex_front_y, base_z + 1.75),
        GLASS_LIT, "glass", outline=0, bevel=0.01)
    box("hangar_annex_door", (0.55, 0.08, 1.05), (annex_cx - 1.05, annex_front_y, base_z),
        INK, "ink", outline=FINE, bevel=0.02)

    # 5. Storage tank beside the annex, plumbed back to it — ties the hangar
    # to the same industrial-facility language as the launchpad's tanks.
    tank_x = annex_cx + annex_w / 2 + 0.85
    _fuel_tank(tank_x, 0.10, base_z, radius=0.42, height=1.1)
    box("hangar_conduit", (1.3, 0.15, 0.12), (annex_cx + annex_w / 2 + 0.1, 0.55, base_z + 0.06),
        STEEL_DARK, "steel_dark", bevel=0.04)

    # 6. Workshop bench block, fused against the annex base.
    # y matches `annex_front_y` (flush on the annex face) — a first pass put
    # this behind the main bay wall's own front face, where it was fully
    # occluded and invisible despite being modelled. x is offset from the
    # door so the two don't overlap.
    box("hangar_bench", (1.1, 0.4, 0.55), (annex_cx + 0.30, annex_front_y, base_z + 0.26), RUST, "rust", bevel=0.06)

    return spec(w, h)


BUILDS = {
    "base/launchpad_flat": launchpad,
    "base/hangar_flat": hangar,
}

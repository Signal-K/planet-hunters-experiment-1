"""Modular background terrain — the "bricks" every outdoor scene is built from.

Liam, 2026-08-26 (KES-260): *"Create modular backgrounds in blender. This means
trees, mountains, hills, roads etc — whatever — all make up different 'bricks'
in the background. All of them can be individually modified and controlled."*

Every entry in `BUILDS` is one standalone sprite with its base at z=0 and
transparency everywhere else, so the scene layer can place it at any x, at any
scale, flipped or not, and overlap it with its neighbours to compose a ridge, a
tree line or a road. Nothing here is a baked plate: the thing this replaces was
`hub/earth_base_exterior_v1.jpg`, a single painted background that could not be
edited, rearranged, or reused between the Hub and Launchpad screens — which is
exactly why the Launchpad "zoom" showed an identical horizon to the Hub.

**Why terrain is in the same kit as the structures.** The reported bug was
"structures feel like they're just sprites pasted on top of a background image"
and "why do we have different styles between the buildings in the background
and in the foreground?". Both had one cause: three different art sources on one
screen — a painted JPG horizon, hand-written SVG skyline glyphs, and Blender
sprites for the foreground. Terrain rendered *here* shares the palette, the
`side` camera, the facet split and the inverted-hull outline weight with
the flat Earth Base sprites, so a mountain and a hangar are the same kind of object drawn
the same way. Depth is then applied by the scene layer as an atmospheric haze
wash over the silhouette (see `TerrainLayer` in the web app), which is how the
reference games do it — not by drawing distant things in a different style.

Camera is `side` for everything, matching the structures. A brick authored at a
different pitch reads as belonging to another game the moment it sits next to a
building, which is the failure mode this module exists to end.
"""

import math

import landnam_kit as kit

T = kit.TOKENS

# --- Terrain palette ---------------------------------------------------------
# Deliberately *mid-tone and saturated*, never pre-hazed. The scene layer washes
# each depth band toward the sky colour at render time, so one brick serves as a
# far blue ridge and a near green hill. Baking the haze in here would lock every
# brick to a single distance and defeat the point of a modular kit.

ROCK = "#6d7f92"
ROCK_DARK = "#4a5a6d"
ROCK_WARM = "#8a7f74"
SOIL = "#9a7d55"
SOIL_DARK = "#6d5638"
GRASS = "#4f8a52"
GRASS_DARK = "#356038"
SNOW = "#eef4f8"
CONIFER = "#2f6b46"
CONIFER_DARK = "#1e4a30"
TRUNK = "#5a3f28"
TARMAC = "#3f4a54"
TARMAC_LINE = "#c9d4dc"
CLOUD = "#f2f7fb"


def _lcg(seed):
    """Deterministic pseudo-random. Terrain wants irregularity, but the render
    has to be byte-identical run to run or every rebuild churns the committed
    PNGs and reviews become unreadable. `random` seeded globally is not enough —
    Blender's own operators consume from it."""
    state = seed

    def nxt(lo=0.0, hi=1.0):
        nonlocal state
        state = (1103515245 * state + 12345) % 2147483648
        return lo + (state / 2147483648) * (hi - lo)

    return nxt


# Silhouette profiles: (height fraction, radius fraction) control points from
# base to summit. A cone is the degenerate case — base to apex in one straight
# run — and it is why the first pass of this kit produced a horizon of near-
# identical triangles no matter how hard the base ring was jittered. Jitter
# varies a landform's *width*; only a profile with intermediate rings varies its
# *slope*, which is what the eye actually reads as "mountain" rather than "cone".
PROFILE_CONE = ((0.0, 1.0), (1.0, 0.0))
# Concave: broad skirt, slope steepening toward a sharp summit. Alpine.
PROFILE_ALPINE = ((0.0, 1.0), (0.30, 0.66), (0.58, 0.40), (0.82, 0.20), (1.0, 0.0))
# A pronounced shoulder partway up, then a steeper upper pyramid.
PROFILE_SHOULDER = ((0.0, 1.0), (0.22, 0.80), (0.40, 0.72), (0.68, 0.34), (1.0, 0.0))
# Convex: steep lower walls easing to a rounded crown. Eroded/older rock.
PROFILE_DOMED = ((0.0, 1.0), (0.34, 0.78), (0.64, 0.54), (0.86, 0.30), (1.0, 0.0))
# Near-vertical walls with a sudden cap — a horn or tor.
PROFILE_HORN = ((0.0, 1.0), (0.26, 0.58), (0.52, 0.44), (0.78, 0.30), (1.0, 0.0))


def _mass(name, base_r, height, color, key, segs=7, seed=1, jitter=0.34,
          lean=0.0, taper=0.0, outline=0.028, flat=False, profile=None):
    """One faceted landform: a jittered solid of revolution.

    A clean `create_cone` reads as a party hat. Two things fix that, and both
    are needed: displacing each ring vertex radially (silhouette gains gullies
    and shoulders), and running the surface through a `profile` of intermediate
    rings so the slope has breaks in it instead of being one straight line from
    skirt to summit. Because `apply_facets` assigns tones off the *world*
    normal, every profile break also picks up a different facet tone for free.
    """
    import bmesh
    import bpy
    from mathutils import Vector

    rnd = _lcg(seed)
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()

    if taper > 0:
        # Flat-topped landform (mesa/butte): base ring to a smaller top ring,
        # capped with its own face rather than converging on a point.
        levels = ((0.0, 1.0), (1.0, taper))
    else:
        levels = tuple(profile or PROFILE_CONE)

    rings = []
    for level_i, (hf, rf) in enumerate(levels):
        if rf <= 0.0:
            rings.append(None)  # apex, built below
            continue
        ring = []
        for i in range(segs):
            ang = (i / segs) * math.tau
            # Jitter tapers off with height so the base is the raggedest part
            # and the summit stays a readable point rather than dissolving.
            j = jitter * (1.0 - 0.45 * hf)
            r = base_r * rf * (1.0 - j * 0.5 + rnd(0.0, j))
            # Lean accumulates with height — the summit drifts off the base's
            # centre, which is what makes a peak asymmetric rather than a
            # perfectly balanced pyramid.
            z = height * hf * (1.0 if level_i == 0 else (0.96 + rnd(0.0, 0.09)))
            # Y is squashed: these are seen side-on, so depth costs silhouette
            # width for nothing. Keeping some depth is what lets the facets read.
            ring.append(bm.verts.new((
                math.cos(ang) * r + lean * hf,
                math.sin(ang) * r * 0.55,
                z,
            )))
        rings.append(ring)

    bm.faces.new(rings[0])  # base cap

    for a, b in zip(rings, rings[1:]):
        if b is None:
            apex = bm.verts.new((lean, 0.0, height))
            for i in range(segs):
                bm.faces.new((a[i], a[(i + 1) % segs], apex))
        else:
            for i in range(segs):
                j = (i + 1) % segs
                bm.faces.new((a[i], a[j], b[j], b[i]))

    if rings[-1] is not None:
        bm.faces.new(list(reversed(rings[-1])))  # top cap

    # Winding from `faces.new` is whatever vertex order happened to be passed.
    # The inverted-hull outline is a solidify modifier with flipped normals, so
    # an inconsistently-wound mesh renders its outline shell inside-out on some
    # faces and the sprite gains black patches. Recalculating is not optional.
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    if flat:
        # Single emission tone, no facet split. Clouds only: the three-way
        # lit/mid/shade split that makes rock read as rock turns a white cloud
        # into a grey lump, because the 0.68 shade tone of near-white is grey.
        obj.data.materials.clear()
        obj.data.materials.append(kit.emission_material(f"{key}_flat", color))
        for poly in obj.data.polygons:
            poly.material_index = 0
        obj.data.update()
        if outline:
            kit.add_outline(obj, outline)
        return obj
    return kit.solid(name, obj, color, key, outline=outline)


def _cap(name, base_r, z, height, color, key, segs=7, seed=9, jitter=0.3,
         lean=0.0, profile=None, on_lean=0.0, on_height=1.0):
    """Snow cap / crown — the same irregular mass, parked on a peak's shoulder
    so its ragged base line reads as a snow line rather than a painted stripe.

    `on_lean`/`on_height` are the *parent* peak's lean and height. A leaning
    peak's axis drifts sideways as it rises, so a cap placed at x=0 lands beside
    the summit rather than on it — which is exactly what happened the first time
    profiles were added and the leans were increased. Passing the parent's
    numbers puts the cap on the peak's own axis at the height it sits at.

    No outline: a black keyline between rock and snow on the same mountain reads
    as two stacked objects, not one peak with snow on it.
    """
    obj = _mass(name, base_r, height, color, key, segs=segs, seed=seed,
                jitter=jitter, lean=lean, outline=0.0, profile=profile)
    obj.location = (on_lean * (z / on_height) if on_height else 0.0, 0.0, z)
    return obj


# --- Mountains ---------------------------------------------------------------

def mtn_peak_tall():
    """188x150 — sharp glaciated peak. The dominant far-range silhouette."""
    _mass("peak", 3.0, 5.4, ROCK, "rock", segs=9, seed=17, jitter=0.44,
          lean=-0.55, profile=PROFILE_ALPINE)
    _cap("peak_snow", 1.46, 3.05, 2.55, SNOW, "snow", segs=8, seed=41, jitter=0.38,
         lean=-0.26, profile=PROFILE_ALPINE, on_lean=-0.55, on_height=5.4)
    # A secondary shoulder overlapping the main mass — even a well-profiled
    # single cone stays symmetrical about its own axis; two overlapping masses
    # of different heights is what reads as a range rather than a monument.
    sh = _mass("peak_shoulder", 1.9, 3.1, ROCK_DARK, "rockdark", segs=7, seed=73,
               jitter=0.42, lean=0.4, profile=PROFILE_SHOULDER)
    sh.location = (2.15, 0.35, 0.0)
    return dict(layout=(188, 150), ortho=7.4, mode="side", target=(0.2, 0, 2.6))


def mtn_peak_broad():
    """232x132 — wide twin-summit massif for the back of a range."""
    _mass("massif", 4.1, 4.2, ROCK, "rock", segs=10, seed=23, jitter=0.26,
          lean=0.75, profile=PROFILE_DOMED)
    _cap("massif_snow", 1.82, 2.1, 2.25, SNOW, "snow", segs=8, seed=57, jitter=0.34,
         lean=0.38, profile=PROFILE_ALPINE, on_lean=0.75, on_height=4.2)
    second = _mass("massif_second", 2.6, 3.35, ROCK_DARK, "rockdark", segs=8, seed=91,
                   jitter=0.3, lean=-0.5, profile=PROFILE_ALPINE)
    second.location = (-2.9, 0.4, 0.0)
    cap2 = _mass("massif_snow2", 1.05, 1.25, SNOW, "snow", segs=7, seed=113,
                 jitter=0.34, lean=-0.16, outline=0.0, profile=PROFILE_ALPINE)
    # -2.9 is `second`'s own x; the second term walks up its lean to z=2.2.
    cap2.location = (-2.9 + (-0.5 * (2.2 / 3.35)), 0.4, 2.2)
    return dict(layout=(232, 132), ortho=9.6, mode="side", target=(0, 0, 2.1))


def mtn_shoulder():
    """168x92 — low eroded rock shoulder, no snow. Fills gaps in a range so it
    doesn't read as evenly-spaced identical triangles."""
    _mass("shoulder", 3.4, 2.55, ROCK_DARK, "rockdark", segs=10, seed=131,
          jitter=0.5, lean=0.6, profile=PROFILE_DOMED)
    bump = _mass("shoulder_bump", 1.7, 1.5, ROCK, "rock", segs=8, seed=149,
                 jitter=0.45, lean=-0.25, profile=PROFILE_DOMED)
    bump.location = (-2.4, 0.3, 0.0)
    return dict(layout=(168, 92), ortho=8.0, mode="side", target=(0, 0, 1.2))


def mtn_horn():
    """152x162 — a steep asymmetric horn. Near-vertical lower walls and a
    hooked summit, so a range containing one is not read as evenly-graded
    pyramids. Deliberately the tallest-for-its-width brick in the kit."""
    _mass("horn", 2.0, 5.8, ROCK, "rock", segs=8, seed=521, jitter=0.34,
          lean=-0.95, profile=PROFILE_HORN)
    _cap("horn_snow", 0.78, 4.35, 1.7, SNOW, "snow", segs=7, seed=541,
         jitter=0.28, lean=-0.3, profile=PROFILE_HORN,
         on_lean=-0.95, on_height=5.8)
    buttress = _mass("horn_buttress", 1.55, 2.5, ROCK_DARK, "rockdark", segs=7,
                     seed=563, jitter=0.4, lean=0.45, profile=PROFILE_SHOULDER)
    buttress.location = (1.5, 0.3, 0.0)
    return dict(layout=(152, 162), ortho=6.4, mode="side", target=(-0.15, 0, 2.9))


def mtn_saw_ridge():
    """246x104 — a low jagged ridge of four unequal summits sharing one skirt.
    Fills the middle of a range with something that is neither a single peak nor
    a smooth shoulder, which is what the horizon was missing."""
    specs = ((-3.3, 1.6, 2.1, 601), (-1.15, 1.35, 2.9, 617), (0.9, 1.5, 2.35, 631), (2.95, 1.25, 3.15, 647))
    for i, (x, r, h, seed) in enumerate(specs):
        m = _mass(f"saw_{i}", r, h, ROCK if i % 2 else ROCK_DARK,
                  "rock" if i % 2 else "rockdark", segs=7, seed=seed,
                  jitter=0.4, lean=0.3 if i % 2 else -0.3, profile=PROFILE_ALPINE)
        m.location = (x, 0.18 * (i % 3) - 0.18, 0.0)
    skirt = _mass("saw_skirt", 4.6, 0.95, ROCK_DARK, "rockdark", segs=11,
                  seed=659, jitter=0.3, profile=PROFILE_DOMED)
    skirt.location = (-0.2, 0.4, 0.0)
    return dict(layout=(246, 104), ortho=10.2, mode="side", target=(-0.2, 0, 1.5))


def mesa():
    """140x86 — flat-topped butte. Reads as sedimentary rather than volcanic and
    breaks up a horizon made only of peaks."""
    _mass("mesa", 2.3, 2.4, ROCK_WARM, "rockwarm", segs=7, seed=167, jitter=0.22, taper=0.72)
    # Strata band — one darker course near the base. Flat colour, no gradient.
    band = kit.cylinder("mesa_band", 2.12, 0.26, location=(0, 0, 0.72), verts=7)
    kit.solid("mesa_band", band, SOIL_DARK, "soildark", outline=0)
    return dict(layout=(140, 86), ortho=5.6, mode="side", target=(0, 0, 1.2))


# --- Hills -------------------------------------------------------------------

def hill_round():
    """150x62 — grassy mound for the mid band.

    Tapered rather than pointed. A cone apex reads as a green pyramid; real
    hills are domed, and at this sprite size the difference between "hill" and
    "pyramid" is entirely whether the top is a point or a short flat crown.
    """
    _mass("hill", 3.0, 1.35, GRASS, "grass", segs=11, seed=181, jitter=0.22, taper=0.42)
    lobe = _mass("hill_lobe", 1.7, 0.82, GRASS, "grass", segs=9, seed=193, jitter=0.25, taper=0.45)
    lobe.location = (2.05, 0.25, 0)
    return dict(layout=(150, 62), ortho=6.6, mode="side", target=(0.3, 0, 0.62))


def hill_long():
    """206x54 — a broad low rise. Overlapped with `hill_round` this is what
    makes rolling country instead of a row of bumps."""
    _mass("hill_long", 4.4, 1.05, GRASS_DARK, "grassdark", segs=13, seed=199,
          jitter=0.24, lean=0.6, taper=0.5)
    lobe = _mass("hill_long_lobe", 2.2, 0.7, GRASS_DARK, "grassdark", segs=9,
                 seed=207, jitter=0.26, taper=0.5)
    lobe.location = (-3.1, 0.2, 0)
    return dict(layout=(206, 54), ortho=9.2, mode="side", target=(0, 0, 0.5))


def bluff():
    """124x70 — a steep soil bluff with an exposed earth face, for where the
    ground plane steps up behind the facility."""
    _mass("bluff", 2.2, 1.9, SOIL, "soil", segs=7, seed=211, jitter=0.3, taper=0.55)
    skirt = _mass("bluff_skirt", 2.8, 0.75, SOIL_DARK, "soildark", segs=8, seed=223, jitter=0.35)
    skirt.location = (0.15, 0.2, 0.0)
    return dict(layout=(124, 70), ortho=5.4, mode="side", target=(0, 0, 0.95))


# --- Facility ground --------------------------------------------------------

def ground_apron():
    """320x64 — a low sloped soil-and-grass shoulder for facility contact.

    The flat CSS ground fill is intentionally kept as the distant plane, but a
    facility needs a closer physical transition than a one-pixel horizon line.
    This shallow berm is the shared contact brick for the Launchpad and Hangar:
    a grass cap catches the rear edge, while the faceted soil face recedes into
    the plane below the structures. It is deliberately broad and low so it
    reads as terrain, not a platform or another building.
    """
    import bmesh
    import bpy

    mesh = bpy.data.meshes.new("ground_apron")
    obj = bpy.data.objects.new("ground_apron", mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    # Broad trapezoid: the narrow top makes the berm visibly slope away from
    # the structures instead of ending in a machined vertical wall.
    front = [
        bm.verts.new((-5.0, -0.42, 0.0)),
        bm.verts.new((5.0, -0.42, 0.0)),
        bm.verts.new((4.22, -0.42, 0.52)),
        bm.verts.new((-4.22, -0.42, 0.52)),
    ]
    back = [
        bm.verts.new((-5.0, 0.42, 0.0)),
        bm.verts.new((5.0, 0.42, 0.0)),
        bm.verts.new((4.22, 0.42, 0.52)),
        bm.verts.new((-4.22, 0.42, 0.52)),
    ]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    bm.faces.new((front[0], back[0], back[1], front[1]))
    bm.faces.new((front[1], back[1], back[2], front[2]))
    bm.faces.new((front[2], back[2], back[3], front[3]))
    bm.faces.new((front[3], back[3], back[0], front[0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    kit.solid("ground_apron", obj, SOIL, "soil", outline=0.014)

    # A narrow grass lip sits on the upper shoulder and shares the same camera
    # as the soil body. It is separate geometry so its silhouette stays crisp
    # when the brick is reused at different scales in a composition.
    cap = kit.box("ground_apron_cap", (8.44, 0.88, 0.12), location=(0, 0, 0.52), bevel=0.03)
    kit.solid("ground_apron_cap", cap, GRASS, "grass", outline=0.010)
    return dict(layout=(320, 64), ortho=10.8, mode="side", target=(0, 0, 0.32))


# --- Ground detail -----------------------------------------------------------

def rock_boulder():
    """44x34 — a single chunky boulder for the foreground apron."""
    _mass("boulder", 0.72, 0.62, ROCK, "rock", segs=6, seed=239, jitter=0.4, taper=0.4, outline=0.012)
    return dict(layout=(44, 34), ortho=1.9, mode="side", target=(0, 0, 0.3))


def rock_cluster():
    """72x40 — three boulders of different sizes sitting together."""
    a = _mass("rock_a", 0.66, 0.58, ROCK, "rock", segs=6, seed=251, jitter=0.4, taper=0.35, outline=0.012)
    a.location = (-0.62, 0.12, 0)
    b = _mass("rock_b", 0.86, 0.82, ROCK_DARK, "rockdark", segs=7, seed=263, jitter=0.42, taper=0.3, outline=0.012)
    b.location = (0.18, 0.0, 0)
    c = _mass("rock_c", 0.48, 0.36, ROCK_WARM, "rockwarm", segs=5, seed=277, jitter=0.4, taper=0.45, outline=0.012)
    c.location = (0.95, 0.22, 0)
    return dict(layout=(72, 40), ortho=3.1, mode="side", target=(0.1, 0, 0.36))


def scree():
    """88x20 — a low rubble drift. Sits at the foot of a ridge so the ridge does
    not meet the ground plane along one clean machined line."""
    rnd = _lcg(283)
    for i in range(9):
        x = -1.55 + i * 0.39 + rnd(-0.07, 0.07)
        s = rnd(0.16, 0.34)
        r = _mass(f"scree_{i}", s, s * rnd(0.5, 0.9), ROCK_DARK if i % 3 else ROCK,
                  "rockdark" if i % 3 else "rock", segs=5, seed=300 + i * 7,
                  jitter=0.45, taper=0.4, outline=0.010)
        r.location = (x, rnd(-0.1, 0.2), 0)
    return dict(layout=(88, 20), ortho=3.8, mode="side", target=(0, 0, 0.16))


# --- Vegetation --------------------------------------------------------------

def _conifer(name, height, radius, seed, dark=False, at=(0.0, 0.0)):
    """Stacked cones on a trunk. Three tiers with decreasing radius is the
    minimum that reads as a conifer rather than a cone; the tiers are offset
    slightly so the silhouette is not perfectly symmetric.

    `at` places the whole tree, so a cluster is just repeated calls — the tiers
    are positioned in world space as they are built rather than being grouped
    and moved afterwards.
    """
    rnd = _lcg(seed)
    body = CONIFER_DARK if dark else CONIFER
    key = "coniferdark" if dark else "conifer"
    ax, ay = at
    trunk = kit.cylinder(f"{name}_trunk", radius * 0.17, height * 0.26, location=(ax, ay, 0), verts=5)
    kit.solid(f"{name}_trunk", trunk, TRUNK, "trunk", outline=0.010)
    tiers = ((0.20, 1.0, 0.50), (0.46, 0.78, 0.42), (0.70, 0.52, 0.38))
    for i, (z, rs, hs) in enumerate(tiers):
        cone = kit.cone(f"{name}_t{i}", radius * rs, height * hs,
                        location=(ax + rnd(-0.05, 0.05) * radius,
                                  ay + rnd(-0.04, 0.04) * radius,
                                  height * z),
                        verts=6)
        kit.solid(f"{name}_t{i}", cone, body, key, outline=0.010)


def tree_pine_tall():
    """30x64 — a single tall conifer."""
    _conifer("pine", 2.6, 0.62, 311)
    return dict(layout=(30, 64), ortho=2.9, mode="side", target=(0, 0, 1.3))


def tree_pine_short():
    """26x44 — a shorter, darker conifer. Mixing two heights is what stops a
    tree line reading as a comb."""
    _conifer("pine_s", 1.75, 0.56, 331, dark=True)
    return dict(layout=(26, 44), ortho=2.1, mode="side", target=(0, 0, 0.88))


def tree_pine_cluster():
    """84x62 — five conifers at mixed heights and depths, as one placeable brick
    for filling a ridge quickly."""
    specs = ((-1.45, 0.18, 1.55, 0.5, True), (-0.72, -0.1, 2.35, 0.6, False),
             (0.0, 0.22, 1.85, 0.54, True), (0.75, -0.06, 2.6, 0.62, False),
             (1.5, 0.16, 1.65, 0.5, True))
    for i, (x, y, h, r, dark) in enumerate(specs):
        _conifer(f"cl{i}", h, r, 347 + i * 13, dark=dark, at=(x, y))
    return dict(layout=(84, 62), ortho=4.4, mode="side", target=(0, 0, 1.25))


def shrub():
    """26x16 — low scrub. Ground cover so bare soil isn't uniformly empty."""
    rnd = _lcg(389)
    for i in range(3):
        b = _mass(f"shrub_{i}", rnd(0.24, 0.36), rnd(0.22, 0.34), GRASS_DARK, "grassdark",
                  segs=7, seed=400 + i * 11, jitter=0.3, taper=0.6, outline=0.012)
        b.location = (-0.32 + i * 0.32, rnd(-0.08, 0.08), 0)
    return dict(layout=(26, 16), ortho=1.4, mode="side", target=(0, 0, 0.15))


# --- Infrastructure ----------------------------------------------------------

def road_segment():
    """160x22 — a straight run of graded roadway, seen side-on as a low causeway.

    A road drawn as a flat plane is invisible at this camera pitch (11 degrees
    of tilt reveals almost no ground). What reads as a road from the side is the
    *embankment*: a shallow berm with a darker running surface on top and a
    kerb line. Segments butt end-to-end, so any length of road is N of these.
    """
    berm = kit.box("road_berm", (5.6, 1.5, 0.16), bevel=0.04)
    kit.solid("road_berm", berm, SOIL_DARK, "soildark", outline=0.010)
    top = kit.box("road_top", (5.6, 1.16, 0.09), location=(0, 0, 0.16), bevel=0.02)
    kit.solid("road_top", top, TARMAC, "tarmac", outline=0.008)
    # Centre dashes. Small, flat, and the one cue that fixes this as a road
    # rather than a wall footing.
    for i in range(5):
        dash = kit.box("road_dash", (0.52, 0.10, 0.02), location=(-2.25 + i * 1.12, -0.02, 0.25))
        kit.solid("road_dash", dash, TARMAC_LINE, "roadline", outline=0)
    return dict(layout=(160, 22), ortho=6.2, mode="side", target=(0, 0, 0.14))


def road_ramp():
    """72x26 — the sloped end of a road run, so a road can stop somewhere
    instead of being chopped off mid-air."""
    berm = kit.box("ramp_berm", (2.5, 1.5, 0.16), rotation=(0, 0.055, 0), bevel=0.04)
    kit.solid("ramp_berm", berm, SOIL_DARK, "soildark", outline=0.010)
    top = kit.box("ramp_top", (2.5, 1.16, 0.09), location=(0, 0, 0.17), rotation=(0, 0.055, 0), bevel=0.02)
    kit.solid("ramp_top", top, TARMAC, "tarmac", outline=0.008)
    return dict(layout=(72, 26), ortho=2.9, mode="side", target=(0, 0, 0.16))


def pylon():
    """40x76 — a transmission pylon. Places a line of these across the middle
    distance and the base reads as connected to somewhere."""
    for sx in (-0.42, 0.42):
        leg = kit.box("pylon_leg", (0.07, 0.07, 2.7), location=(sx, 0, 0), rotation=(0, -0.055 if sx < 0 else 0.055, 0))
        kit.solid("pylon_leg", leg, ROCK_DARK, "rockdark", outline=0.008)
    for i, z in enumerate((0.7, 1.4, 2.1)):
        rail = kit.box("pylon_rail", (0.82 - i * 0.16, 0.06, 0.06), location=(0, 0, z))
        kit.solid("pylon_rail", rail, ROCK_DARK, "rockdark", outline=0.006)
        for sign in (1, -1):
            d = kit.box("pylon_x", (0.05, 0.05, 0.78), location=(0, 0, z - 0.35), rotation=(0, sign * 0.55, 0))
            kit.solid("pylon_x", d, ROCK, "rock", outline=0)
    for z in (2.35, 2.72):
        arm = kit.box("pylon_arm", (1.55, 0.07, 0.07), location=(0, 0, z))
        kit.solid("pylon_arm", arm, ROCK_DARK, "rockdark", outline=0.006)
    return dict(layout=(40, 76), ortho=3.3, mode="side", target=(0, 0, 1.45))


def fence_run():
    """96x14 — perimeter fencing. Marks the facility boundary along the ground
    line so the base has an edge instead of dissolving into open country."""
    for i in range(9):
        post = kit.box("fence_post", (0.06, 0.06, 0.52), location=(-1.7 + i * 0.42, 0, 0))
        kit.solid("fence_post", post, ROCK_DARK, "rockdark", outline=0.008)
    for z in (0.24, 0.44):
        wire = kit.box("fence_wire", (3.55, 0.03, 0.03), location=(0, 0, z))
        kit.solid("fence_wire", wire, ROCK, "rock", outline=0)
    return dict(layout=(96, 14), ortho=3.9, mode="side", target=(0, 0, 0.27))


# --- Distant facilities ------------------------------------------------------
# These replace HubWorldBackground's hand-written SVG glyphs (DomeBuilding /
# RadioTower / DishTower / TankSilo). Those were the literal source of "why do
# we have different styles between the buildings in the background and in the
# foreground" — SVG paths cannot match a Blender facet split no matter how they
# are tuned. Same kit, same camera, same outline; the scene layer hazes them
# back so they still sit behind the real, clickable structures.

def far_dome():
    """48x40 — a domed facility building for the distant industrial band."""
    body = kit.box("fd_body", (1.5, 1.0, 0.95), bevel=0.06)
    kit.solid("fd_body", body, ROCK, "rock")
    dome = kit.cone("fd_dome", 0.78, 0.62, location=(0, 0, 0.95), verts=8, radius2=0.12)
    kit.solid("fd_dome", dome, ROCK_DARK, "rockdark")
    mast = kit.box("fd_mast", (0.05, 0.05, 0.62), location=(0, 0, 1.55))
    kit.solid("fd_mast", mast, ROCK_DARK, "rockdark", outline=0.006)
    return dict(layout=(48, 40), ortho=2.4, mode="side", target=(0, 0, 1.0))


def far_silo():
    """34x46 — a storage tank pair."""
    for sx, r, h in ((-0.36, 0.34, 1.5), (0.42, 0.28, 1.15)):
        t = kit.cylinder("fs_tank", r, h, location=(sx, 0, 0), verts=8)
        kit.solid("fs_tank", t, ROCK, "rock")
        cap = kit.cone("fs_cap", r, 0.2, location=(sx, 0, h), verts=8, radius2=r * 0.5)
        kit.solid("fs_cap", cap, ROCK_DARK, "rockdark", outline=0.008)
    return dict(layout=(34, 46), ortho=1.9, mode="side", target=(0, 0, 0.85))


def far_mast():
    """26x74 — a lattice radio mast."""
    for sx in (-0.2, 0.2):
        leg = kit.box("fm_leg", (0.05, 0.05, 2.7), location=(sx, 0, 0), rotation=(0, -0.03 if sx < 0 else 0.03, 0))
        kit.solid("fm_leg", leg, ROCK_DARK, "rockdark", outline=0.006)
    for i in range(7):
        r = kit.box("fm_rung", (0.4 - i * 0.035, 0.04, 0.04), location=(0, 0, 0.34 + i * 0.36))
        kit.solid("fm_rung", r, ROCK, "rock", outline=0)
    tip = kit.cone("fm_tip", 0.07, 0.5, location=(0, 0, 2.7), verts=5, radius2=0.015)
    kit.solid("fm_tip", tip, ROCK_DARK, "rockdark", outline=0.006)
    return dict(layout=(26, 74), ortho=3.2, mode="side", target=(0, 0, 1.5))


def far_dish():
    """44x40 — a tracking dish on a tripod."""
    for ang in (0.0, 2.09, 4.19):
        leg = kit.box("fdh_leg", (0.06, 0.06, 1.1),
                      location=(math.cos(ang) * 0.22, math.sin(ang) * 0.12, 0),
                      rotation=(0, -math.cos(ang) * 0.2, 0))
        kit.solid("fdh_leg", leg, ROCK_DARK, "rockdark", outline=0.006)
    dish = kit.cone("fdh_dish", 0.66, 0.34, location=(0.05, 0, 1.1), rotation=(0, -0.5, 0), verts=9, radius2=0.1)
    kit.solid("fdh_dish", dish, ROCK, "rock")
    return dict(layout=(44, 40), ortho=2.3, mode="side", target=(0, 0, 0.85))


def far_block():
    """40x38 — a plain industrial block. The filler between the characterful
    distant buildings; a skyline made only of landmarks reads as a theme park."""
    body = kit.box("fb_body", (1.3, 0.95, 1.35), bevel=0.04)
    kit.solid("fb_body", body, ROCK_DARK, "rockdark")
    roof = kit.box("fb_roof", (1.4, 1.02, 0.12), location=(0, 0, 1.35), bevel=0.03)
    kit.solid("fb_roof", roof, ROCK, "rock", outline=0.008)
    return dict(layout=(40, 38), ortho=2.2, mode="side", target=(0, 0, 0.75))


# --- Sky ---------------------------------------------------------------------

def cloud_bank_a():
    """120x38 — a chunky faceted cloud. Flat colour with a shaded underside from
    the facet split, no soft edges — the same rule as everything else in the kit.
    Authored as a sprite rather than a CSS gradient so it obeys the same
    outline/facet language as the terrain it floats over."""
    rnd = _lcg(419)
    specs = ((-1.5, 0.62), (-0.6, 0.95), (0.35, 0.78), (1.25, 0.55))
    for i, (x, r) in enumerate(specs):
        c = _mass(f"cloud_{i}", r, r * rnd(0.72, 0.95), CLOUD, "cloud",
                  segs=7, seed=430 + i * 9, jitter=0.3, taper=0.55,
                  outline=0.0, flat=True)
        c.location = (x, rnd(-0.15, 0.15), rnd(0.0, 0.12))
    return dict(layout=(120, 38), ortho=5.0, mode="side", target=(0, 0, 0.4))


def cloud_bank_b():
    """82x28 — a smaller, flatter cloud for variety."""
    rnd = _lcg(457)
    specs = ((-0.9, 0.44), (-0.15, 0.66), (0.62, 0.42))
    for i, (x, r) in enumerate(specs):
        c = _mass(f"cloudb_{i}", r, r * rnd(0.6, 0.8), CLOUD, "cloud",
                  segs=6, seed=470 + i * 9, jitter=0.28, taper=0.55,
                  outline=0.0, flat=True)
        c.location = (x, rnd(-0.12, 0.12), 0)
    return dict(layout=(82, 28), ortho=3.4, mode="side", target=(0, 0, 0.28))


BUILDS = {
    "terrain/mtn_peak_tall": mtn_peak_tall,
    "terrain/mtn_peak_broad": mtn_peak_broad,
    "terrain/mtn_shoulder": mtn_shoulder,
    "terrain/mtn_horn": mtn_horn,
    "terrain/mtn_saw_ridge": mtn_saw_ridge,
    "terrain/mesa": mesa,
    "terrain/hill_round": hill_round,
    "terrain/hill_long": hill_long,
    "terrain/bluff": bluff,
    "terrain/ground_apron": ground_apron,
    "terrain/rock_boulder": rock_boulder,
    "terrain/rock_cluster": rock_cluster,
    "terrain/scree": scree,
    "terrain/tree_pine_tall": tree_pine_tall,
    "terrain/tree_pine_short": tree_pine_short,
    "terrain/tree_pine_cluster": tree_pine_cluster,
    "terrain/shrub": shrub,
    "terrain/road_segment": road_segment,
    "terrain/road_ramp": road_ramp,
    "terrain/pylon": pylon,
    "terrain/fence_run": fence_run,
    "terrain/far_dome": far_dome,
    "terrain/far_silo": far_silo,
    "terrain/far_mast": far_mast,
    "terrain/far_dish": far_dish,
    "terrain/far_block": far_block,
    "terrain/cloud_bank_a": cloud_bank_a,
    "terrain/cloud_bank_b": cloud_bank_b,
}

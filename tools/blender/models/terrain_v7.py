"""Launch complex ground for base kit v7 (Liam, 14 Oct: "it's a space agency complex", "wouldn't there be
more concrete?", no mountains, no forest, no buildings in the background).

The base is a cleared, paved launch site: concrete slab apron with expansion joints and stains, a service
road with lane markings, a gravel crawlerway and drain grates. Paving is site infrastructure, not a
building, so a fresh base is an empty paved site; the player builds every structure. Past the perimeter the
paving gives way to flat ground running to a low hazy horizon; the biome only changes that far ground.

One flat plane seen through the kit camera (orthographic, tipped TILT_DEG down), cut in two parts for parallax:
  ground  y -220..44   under the structures, pans 1:1 with the strip
  plain   y 44..640    back to the horizon, slower parallax

Run in Blender after kit_v7.py:
    exec(open(".../tools/blender/models/terrain_v7.py").read()); build_field("grassland", "ground")
"""

import math
import random

import bmesh
import bpy
from mathutils import Vector

FIELD_W = 680.0
NEAR_Y = -220.0
STRIP_BACK = 44.0   # matches base_v7.TOP_DEPTH: the back edge of the strip the structures stand on
PAVE_BACK = 146.0   # the paved complex ends here; beyond is open ground to the horizon
FAR_Y = 236.0       # horizon kept low: the sky stays big, as in Tiny Space Program
SLAB_W, SLAB_D = 24.0, 14.0

CONCRETE = ["#c2c0b9", "#bcbab3", "#c8c6bf", "#b8b6af", "#c0beb7"]
JOINT = "#8f8d87"
STAIN = "#a5a39c"
ASPHALT = "#55595f"
ASPHALT_LIT = "#62666c"
LANE = "#e9ecee"
MARK_BLUE = "#2f6fa8"
GRAVEL = ["#9c9a92", "#8d8b84", "#aaa8a0"]
RAIL = "#6b7076"

# Ground beyond the perimeter, per biome: base, patch, haze toward the horizon (all flat).
OPEN_GROUND = {
    "mountains": {"base": "#a9a496", "patch": "#9a9587", "haze": "#cbd6df"},
    "grassland": {"base": "#b3a989", "patch": "#a49a7b", "haze": "#cbd6df"},
    "desert": {"base": "#d6c19b", "patch": "#c7ae86", "haze": "#e2d6c6"},
    "tundra": {"base": "#e5edf3", "patch": "#d3dfe9", "haze": "#d9e3ec"},
    "coast": {"base": "#d4c6a2", "patch": "#c4b58f", "haze": "#cfdde7", "sea": "#5a93b6", "sea_lit": "#93c2da"},
}


def _hex_mix(a, b, k):
    pa = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    pb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * k):02x}" for x, y in zip(pa, pb))


def _haze(y):
    """Haze fraction by distance: none on the strip, about half at the horizon."""
    return max(0.0, min(0.6, (y - STRIP_BACK) / (FAR_Y - STRIP_BACK) * 0.6))


_FLAT = {}


def _flat(colour):
    m = _FLAT.get(colour)
    try:
        if m is not None and m.name in bpy.data.materials:
            return m
    except ReferenceError:
        pass
    m = bpy.data.materials.new(f"flat_{colour}")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = rgb(colour)
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    _FLAT[colour] = m
    return m


class Painter:
    """Collects flat quads lying on the ground (z layers keep later paint on top) into one mesh."""

    def __init__(self, name):
        self.me = bpy.data.meshes.new(name)
        self.bm = bmesh.new()
        self.colours = []
        self.index = {}

    def quad(self, x0, y0, x1, y1, colour, z=0.0, haze_with=None):
        if haze_with:
            colour = _hex_mix(colour, haze_with, _haze((y0 + y1) / 2))
        if colour not in self.index:
            self.index[colour] = len(self.colours)
            self.colours.append(colour)
        v = [self.bm.verts.new((x0, y0, z)), self.bm.verts.new((x1, y0, z)), self.bm.verts.new((x1, y1, z)), self.bm.verts.new((x0, y1, z))]
        f = self.bm.faces.new(v)
        f.material_index = self.index[colour]

    def finish(self):
        self.bm.to_mesh(self.me)
        self.bm.free()
        o = bpy.data.objects.new(self.me.name, self.me)
        bpy.context.collection.objects.link(o)
        for c in self.colours:
            o.data.materials.append(_flat(c))
        return o


def _pave(p, rng, y0, y1, haze):
    """Concrete slab apron: slabs of slightly varied tone, joints between them, the odd weathering stain."""
    x = -40.0
    while x < FIELD_W + 40:
        y = y0
        while y < y1:
            yb = min(y + SLAB_D, y1)
            p.quad(x, y, x + SLAB_W, yb, rng.choice(CONCRETE), haze_with=haze)
            if rng.random() < 0.12:
                sx, sy = x + rng.uniform(2, 10), y + rng.uniform(2, 7)
                p.quad(sx, sy, sx + rng.uniform(3, 6), min(sy + rng.uniform(2, 4), yb), STAIN, z=0.02, haze_with=haze)
            y += SLAB_D
        x += SLAB_W
    # Expansion joints: thin lines along both axes.
    x = -40.0
    while x < FIELD_W + 40:
        p.quad(x - 0.25, y0, x + 0.25, y1, JOINT, z=0.03, haze_with=haze)
        x += SLAB_W
    y = y0
    while y < y1:
        p.quad(-40, y - 0.3, FIELD_W + 40, y + 0.3, JOINT, z=0.03, haze_with=haze)
        y += SLAB_D


def _road(p, y0, y1, haze=None, dashes=True):
    """Service road across the site: asphalt, white edge lines, dashed centre line."""
    p.quad(-40, y0, FIELD_W + 40, y1, ASPHALT, z=0.05, haze_with=haze)
    p.quad(-40, y0 + 1, FIELD_W + 40, y0 + 1.8, LANE, z=0.06, haze_with=haze)
    p.quad(-40, y1 - 1.8, FIELD_W + 40, y1 - 1, LANE, z=0.06, haze_with=haze)
    if dashes:
        mid = (y0 + y1) / 2
        x = -40.0
        while x < FIELD_W + 40:
            p.quad(x, mid - 0.5, x + 9, mid + 0.5, LANE, z=0.06, haze_with=haze)
            x += 18


def _crawlerway(p, rng, y0, y1, haze=None):
    """Gravel crawlerway: two gravel lanes with a concrete median, as on a real launch complex."""
    lane = (y1 - y0) * 0.38
    for a, b in ((y0, y0 + lane), (y1 - lane, y1)):
        x = -40.0
        while x < FIELD_W + 40:
            w = rng.uniform(3, 7)
            p.quad(x, a, x + w, b, rng.choice(GRAVEL), z=0.05, haze_with=haze)
            x += w
    p.quad(-40, y0 + lane, FIELD_W + 40, y1 - lane, CONCRETE[1], z=0.05, haze_with=haze)


def _grates(p, rng, y, haze=None):
    """Drain grates and blue survey marks dotted along the apron."""
    for i in range(14):
        x = rng.uniform(0, FIELD_W)
        p.quad(x, y, x + 3.2, y + 1.6, RAIL, z=0.07, haze_with=haze)
        p.quad(x + 0.4, y + 0.4, x + 2.8, y + 1.2, ASPHALT, z=0.08, haze_with=haze)
    for i in range(8):
        x = rng.uniform(0, FIELD_W)
        p.quad(x, y + 6, x + 4, y + 6.8, MARK_BLUE, z=0.07, haze_with=haze)
        p.quad(x + 1.6, y + 4.8, x + 2.4, y + 8, MARK_BLUE, z=0.07, haze_with=haze)


def _open_ground(p, rng, spec, y0, y1):
    """Beyond the perimeter: flat open ground in long patches, hazing toward the horizon."""
    y = y0
    while y < y1:
        d = rng.uniform(6, 18)
        x = -40.0
        while x < FIELD_W + 40:
            w = rng.uniform(30, 120)
            p.quad(x, y, x + w, min(y + d, y1), spec["patch"] if rng.random() < 0.35 else spec["base"], haze_with=spec["haze"])
            x += w
        y += d


def _camera(v0, v1):
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("v7_cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("v7_cam", cam_data)
    scene.collection.objects.link(cam)
    tilt = math.radians(TILT_DEG)
    cam.rotation_euler = (math.pi / 2 - tilt, 0, 0)
    cam_data.ortho_scale = max(FIELD_W, v1 - v0)
    up = Vector((0, math.sin(tilt), math.cos(tilt)))
    fwd = Vector((0, math.cos(tilt), -math.sin(tilt)))
    cam.location = Vector((FIELD_W / 2, 0, 0)) + up * ((v0 + v1) / 2) - fwd * 1200
    cam_data.clip_end = 5000
    scene.camera = cam
    scene.render.resolution_x = int(FIELD_W * PX_PER_UNIT)
    scene.render.resolution_y = int(round((v1 - v0) * PX_PER_UNIT))
    cam["v7_frame"] = (0, FIELD_W, v0, v1)
    return cam


def build_field(biome="grassland", part="ground", seed=21):
    """`ground`: the paved strip and the apron in front of it. `plain`: apron, road and crawlerway behind the
    strip, the perimeter, then open ground (and the sea on the coast) to the horizon."""
    reset_scene()
    _FLAT.clear()
    spec = OPEN_GROUND[biome]
    rng = random.Random(seed + (0 if part == "ground" else 97))
    p = Painter(f"field_{part}")
    haze = spec["haze"]
    if part == "ground":
        y0, y1 = NEAR_Y, STRIP_BACK + 2
        _pave(p, rng, y0, y1, None)
        _road(p, -64, -40)
        _grates(p, rng, -16)
    else:
        y0, y1 = STRIP_BACK - 2, FAR_Y
        _pave(p, rng, y0, 98, haze)
        _crawlerway(p, rng, 60, 76, haze)
        _road(p, 98, 110, haze)
        _pave(p, rng, 110, PAVE_BACK, haze)
        # Perimeter: a thin fence line where the paving ends.
        p.quad(-40, PAVE_BACK, FIELD_W + 40, PAVE_BACK + 0.8, RAIL, z=0.09, haze_with=haze)
        sea_from = FAR_Y * 0.7 if spec.get("sea") else FAR_Y
        _open_ground(p, rng, spec, PAVE_BACK + 0.8, sea_from)
        if spec.get("sea"):
            p.quad(-40, sea_from, FIELD_W + 40, FAR_Y + 200, _hex_mix(spec["sea"], haze, 0.25), z=0.02)
            for i in range(26):
                yy = rng.uniform(sea_from + 6, FAR_Y)
                xx = rng.uniform(0, FIELD_W)
                p.quad(xx, yy, xx + rng.uniform(8, 22), yy + 1.2, _hex_mix(spec["sea_lit"], haze, 0.3), z=0.03)
    p.finish()
    v0 = screen_v(y0, 0)
    v1 = screen_v(y1, 0) + (0 if part == "ground" else 1.0)
    _camera(v0, v1)
    return f"field-{biome}-{part}"


def build_scene_preview(biome="grassland", view=(463, 214), built=("launchpad", "hangar"), sky="#7fb0dc"):
    """Look-only composite at a game frame (kit units across x up): sky colour, field, and built structures on
    their sites, framed with the ground line 20% up, as the game draws it. Needs base_v7.py loaded."""
    reset_scene()
    _FLAT.clear()
    spec = OPEN_GROUND[biome]
    rng = random.Random(21)
    p = Painter("preview_field")
    _pave(p, rng, NEAR_Y, 98, None)
    _road(p, -64, -40)
    _grates(p, rng, -16)
    _crawlerway(p, rng, 60, 76, spec["haze"])
    _road(p, 98, 110, spec["haze"])
    _pave(p, rng, 110, PAVE_BACK, spec["haze"])
    p.quad(-40, PAVE_BACK, FIELD_W + 40, PAVE_BACK + 0.8, RAIL, z=0.09, haze_with=spec["haze"])
    _open_ground(p, rng, spec, PAVE_BACK + 0.8, FAR_Y)
    p.finish()
    sites = {"hangar": 60, "launchpad": 190, "market": 340}
    for kind in built:
        before = {o.name for o in bpy.context.scene.objects}
        {"launchpad": build_launchpad, "hangar": build_hangar, "market": build_exchange}[kind](fresh=False, frame=False)
        width = {"launchpad": 120, "hangar": 72, "market": 110}[kind]
        for o in bpy.context.scene.objects:
            if o.name not in before:
                o.location.x += sites[kind] - width / 2
    scene = bpy.context.scene
    scene.render.film_transparent = False
    bg = next(n for n in scene.world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = rgb(sky)
    bg.inputs[1].default_value = 1.0
    w, h = view
    cam = _camera(-0.2 * h, 0.8 * h)
    cam.location.x = sites['launchpad']
    cam.data.ortho_scale = w
    scene.render.resolution_x = int(w * 2)
    scene.render.resolution_y = int(h * 2)
    return "preview"

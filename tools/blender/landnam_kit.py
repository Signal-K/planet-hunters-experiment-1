"""Shared Blender rig for Landnam's prebaked sprite pipeline.

PixiJS is a 2D renderer, so nothing modelled here ever ships as geometry. Blender
is an *authoring* tool: models are rendered to flat orthographic PNGs which load
through `AssetManager` exactly like any hand-drawn sprite. "Lightweight enough
for Pixi" is therefore about output pixel budget, not polycount — a 200k-tri
model and a cube cost the same at runtime once both are a 144x36 PNG.

Style comes from the design language doc: chunky cel-shaded faceted flat colour,
no grain, no noise, no gradients. Two decisions follow from that:

  * **No lights.** Every material is a pure emission shader, and the facet
    shading is baked into *which* material a face gets — top faces take the lit
    tone, side faces the mid tone, front faces the shade tone. Lighting rigs
    drift between renders and produce soft falloff; this cannot.
  * **Inverted-hull outlines**, not Freestyle. A solidify modifier pushed
    outward with flipped normals and a black emission material gives the hard
    1-2px edge the hand-drawn sprites have, renders in EEVEE with no extra
    config, and is deterministic headless.

Run via `render_all.py`; see README.md.
"""

import math
import os
import bmesh
import bpy
from mathutils import Vector

# --- Palette -----------------------------------------------------------------
# Straight from web/app/globals.css :root. Kept as hex strings so a token change
# can be diffed against the CSS by eye.

TOKENS = {
    "void": "#000d1f",
    "surface": "#002351",
    "surface_2": "#0d3468",
    "surface_3": "#16468a",
    "cyan": "#70d9ea",
    "cyan_bright": "#a3ecf5",
    "amber": "#f5a623",
    "crimson": "#c8293e",
    "hull": "#3d5a80",
    "hull_dark": "#28405e",
    "steel": "#8da9c4",
    "rust": "#a35a3a",
    "outline": "#04101f",
}

HUB_LIGHT_TOKENS = {
    "void": "#1d2933", "surface": "#4f7d96", "surface_2": "#6f9fb5",
    "surface_3": "#8db8c8", "cyan": "#1c7fbf", "cyan_bright": "#62c7d4",
    "amber": "#b5730a", "crimson": "#b53b4d", "hull": "#5f89a4",
    "hull_dark": "#29465a", "steel": "#d6e2df", "rust": "#a85d3d",
    "outline": "#14171c",
}
DEFAULT_TOKENS = dict(TOKENS)


def set_palette(name="default"):
    """Select a deterministic material palette for the next model render."""
    TOKENS.clear()
    TOKENS.update(HUB_LIGHT_TOKENS if name == "hub_light" else DEFAULT_TOKENS)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear_rgba(hex_str, alpha=1.0):
    """Blender works in linear; the tokens are sRGB. Converting matters — skip it
    and every colour renders visibly washed out against the CSS it must match."""
    h = hex_str.lstrip("#")
    rgb = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(srgb_to_linear(c) for c in rgb) + (alpha,)


def tint(hex_str, factor):
    """Lighten (>1) or darken (<1) a token, staying in sRGB so the result reads
    the same way the CSS `color-mix` fallbacks in globals.css do."""
    h = hex_str.lstrip("#")
    rgb = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    out = [max(0, min(255, int(round(c * factor)))) for c in rgb]
    return "#%02x%02x%02x" % tuple(out)


# Facet tones. Top catches the most light, the camera-facing front the least —
# the faceted look is entirely this three-way split.
FACET_LIT = 1.30
FACET_MID = 1.00
FACET_SHADE = 0.68


# --- Scene setup -------------------------------------------------------------

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    # Lossless maximum PNG compression keeps the supersampled flat-color
    # sprites under the manifest budget without quantizing their hard outlines.
    scene.render.image_settings.compression = 100
    scene.render.filter_size = 0.0  # No reconstruction blur — we want hard edges.
    scene.view_settings.view_transform = "Standard"  # Not Filmic; emission must
    scene.view_settings.look = "None"                # come out as the exact hex.
    # Emission-only scene: one sample is enough and keeps headless renders fast.
    if hasattr(scene, "eevee"):
        try:
            scene.eevee.taa_render_samples = 1
        except AttributeError:
            pass
    return scene


def emission_material(name, hex_str, alpha=1.0, grain=False):
    """Flat colour, no shading model. Reused by name so repeated calls across
    models share one material rather than accumulating duplicates.

    `grain=True` mixes in a faint procedural noise texture (Liam, 2026-08-03
    — see the ZenNotes art-pipeline decision doc for why this reverses the
    prior "no grain, ever" rule). Kept deliberately subtle: a ~8% multiply so
    the flat cel-shaded facets are still what reads, not a gradient wash.
    Opt-in per material rather than global, so only the models that have
    actually been checked against it (ships, parts) use it for now."""
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emit = nodes.new("ShaderNodeEmission")
    base_rgba = hex_to_linear_rgba(hex_str)
    if grain:
        # First pass (0.08 multiply, 0.4-0.6 ramp) was invisible at sprite
        # scale — checked the actual rendered PNG, not just the node graph.
        # Wider ramp (more contrast between noise cells) and a stronger mix
        # factor so it reads as texture rather than being technically present
        # but imperceptible.
        coord = nodes.new("ShaderNodeTexCoord")
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 22.0
        noise.inputs["Detail"].default_value = 3.0
        noise.inputs["Roughness"].default_value = 0.75
        links.new(coord.outputs["Object"], noise.inputs["Vector"])
        ramp = nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].position = 0.3
        ramp.color_ramp.elements[1].position = 0.7
        mix = nodes.new("ShaderNodeMixRGB")
        mix.blend_type = "MULTIPLY"
        mix.inputs["Fac"].default_value = 0.22
        mix.inputs["Color1"].default_value = base_rgba
        links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
        links.new(ramp.outputs["Color"], mix.inputs["Color2"])
        links.new(mix.outputs["Color"], emit.inputs["Color"])
    else:
        emit.inputs["Color"].default_value = base_rgba
    emit.inputs["Strength"].default_value = 1.0
    if alpha < 1.0:
        mix = nodes.new("ShaderNodeMixShader")
        transp = nodes.new("ShaderNodeBsdfTransparent")
        mix.inputs["Fac"].default_value = alpha
        links.new(transp.outputs[0], mix.inputs[1])
        links.new(emit.outputs[0], mix.inputs[2])
        links.new(mix.outputs[0], out.inputs["Surface"])
        mat.blend_method = "BLEND"
    else:
        links.new(emit.outputs[0], out.inputs["Surface"])
    return mat


def facet_materials(base_hex, key, grain=False):
    """The lit / mid / shade triple every solid uses."""
    return (
        emission_material(f"{key}_lit", tint(base_hex, FACET_LIT), grain=grain),
        emission_material(f"{key}_mid", tint(base_hex, FACET_MID), grain=grain),
        emission_material(f"{key}_shade", tint(base_hex, FACET_SHADE), grain=grain),
    )


def apply_facets(obj, base_hex, key, grain=False):
    """Assign the three tones by face normal.

    Uses the *world* normal so a rotated part still shades from the same light
    direction as everything else in the scene — assigning on local normals is
    the classic way to end up with one crate lit from underneath.
    """
    lit, mid, shade = facet_materials(base_hex, key, grain=grain)
    obj.data.materials.clear()
    for m in (lit, mid, shade):
        obj.data.materials.append(m)

    mw = obj.matrix_world
    rot = mw.to_3x3()
    for poly in obj.data.polygons:
        n = (rot @ poly.normal).normalized()
        if n.z > 0.5:
            poly.material_index = 0          # top
        elif n.y < -0.35:
            poly.material_index = 2          # facing camera
        else:
            poly.material_index = 1          # sides
    obj.data.update()


def add_outline(obj, thickness=0.012):
    """Inverted hull. Backfaces of an outward-offset shell, rendered black."""
    mat = emission_material("outline", TOKENS["outline"])
    # Without culling the shell's *near* faces render black over the whole
    # model. Culling them leaves only the far side visible, which is exactly
    # the silhouette ring we want.
    mat.use_backface_culling = True
    if mat.name not in [m.name for m in obj.data.materials]:
        obj.data.materials.append(mat)
    idx = [m.name for m in obj.data.materials].index(mat.name)

    mod = obj.modifiers.new("outline", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 1.0
    mod.use_flip_normals = True
    mod.use_rim = False
    mod.material_offset = idx
    mod.material_offset_rim = idx


# --- Geometry helpers --------------------------------------------------------

def box(name, size, location=(0, 0, 0), rotation=(0, 0, 0), bevel=0.0):
    """Axis-aligned box with its origin at the *base centre*, which is how the
    game positions sprites (anchor 0.5, 1.0)."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    sx, sy, sz = size
    bmesh.ops.scale(bm, vec=Vector((sx, sy, sz)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, 0, sz / 2)), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(
            bm, geom=list(bm.verts) + list(bm.edges), offset=bevel,
            segments=1, affect="EDGES", profile=0.5, clamp_overlap=True,
        )
    bm.to_mesh(mesh)
    bm.free()

    obj.location = location
    obj.rotation_euler = rotation
    return obj


def cylinder(name, radius, depth, location=(0, 0, 0), rotation=(0, 0, 0), verts=8):
    """Low-vertex cylinder — 8 sides by default, because the style is faceted and
    a smooth tube would read as the wrong game."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=verts,
        radius1=radius, radius2=radius, depth=depth,
    )
    bmesh.ops.translate(bm, vec=Vector((0, 0, depth / 2)), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()

    obj.location = location
    obj.rotation_euler = rotation
    return obj


def cone(name, radius, depth, location=(0, 0, 0), rotation=(0, 0, 0), verts=8, radius2=0.0):
    """Cone (radius2=0, the default) or frustum (radius2>0) — a tapered tail
    or nozzle flare needs the taper to stop short of a point."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=verts,
        radius1=radius, radius2=radius2, depth=depth,
    )
    bmesh.ops.translate(bm, vec=Vector((0, 0, depth / 2)), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def solid(name, obj, base_hex, key, outline=0.012, grain=False):
    """Finish a primitive: facet it, outline it, name it."""
    obj.name = name
    apply_facets(obj, base_hex, key, grain=grain)
    if outline:
        add_outline(obj, outline)
    return obj


# --- Camera ------------------------------------------------------------------
#
# Four projections, because the game has four kinds of sprite:
#
#   ISO  — matches takeon's isometric terrain. Its tiles are 32x16, a 2:1
#          ratio, so the camera pitch is atan(0.5) = 26.565 degrees, not the
#          35.264 of a true isometric cube. Getting this wrong is why
#          hand-drawn props sit at a subtly different angle to the ground.
#   FLAT — straight-on elevation, for sprites composited into 2D side views
#          (the launch stack, the hub structures) where there is no ground
#          plane to agree with.
#   ROOM — a shallow 3/4 interior-diorama view (2026-08-03, room icon
#          rebuild): a much milder pitch/yaw than ISO's true corner-view, so
#          a room shell (back wall + floor + one side wall) reads mostly
#          front-on with just enough tilt to reveal the floor and the near
#          side wall — the "dollhouse cutaway" look reference art like Out
#          There: Omega/Pixel Starships room interiors use, not a full
#          isometric corner view (ISO_YAW=45 showed too much of both side
#          walls and read as a diamond, not a room you're looking into).
#   SIDE — an oblique side-on world-art view (2026-08-25, Earth Base
#          correction). It reveals only a narrow top/side facet, preserving a
#          shared horizontal ground line while avoiding both dead-flat front
#          elevations and pasted-on isometric dioramas. This is the Out There
#          + Crashlands + Pixel Starships exterior/cutaway projection.

ISO_PITCH = math.degrees(math.atan(0.5))   # 26.565
ISO_YAW = 45.0
ROOM_PITCH = 22.0
ROOM_YAW = 20.0
SIDE_PITCH = 11.0
SIDE_YAW = 8.0


def setup_camera(mode, ortho_scale, target=(0, 0, 0), distance=20.0):
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    if mode == "iso":
        pitch = math.radians(90.0 - ISO_PITCH)
        yaw = math.radians(ISO_YAW)
    elif mode == "flat":
        pitch = math.radians(90.0)
        yaw = 0.0
    elif mode == "room":
        pitch = math.radians(90.0 - ROOM_PITCH)
        yaw = math.radians(ROOM_YAW)
    elif mode == "side":
        pitch = math.radians(90.0 - SIDE_PITCH)
        yaw = math.radians(SIDE_YAW)
    else:
        raise ValueError("mode must be 'iso', 'flat', 'room', or 'side'")

    cam.rotation_euler = (pitch, 0.0, yaw)
    direction = Vector((
        math.sin(pitch) * math.sin(yaw),
        math.sin(pitch) * math.cos(yaw) * -1.0,
        math.cos(pitch),
    ))
    cam.location = Vector(target) + direction * distance
    return cam


# --- Render ------------------------------------------------------------------

def render_to(path, width, height):
    scene = bpy.context.scene
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


# Sprites are authored at 3x their layout size so they stay crisp on a
# devicePixelRatio 2-3 display. Pixi downsamples; it cannot invent detail.
SUPERSAMPLE = 3


def sprite_render(path, layout_w, layout_h, ortho_scale, mode="flat", target=(0, 0, 0)):
    setup_camera(mode, ortho_scale, target=target)
    return render_to(path, layout_w * SUPERSAMPLE, layout_h * SUPERSAMPLE)

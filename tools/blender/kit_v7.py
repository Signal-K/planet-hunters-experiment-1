"""Landnam base kit v7: one look for every base asset (SSL-423, 14 Oct direction).

Crashlands / Out There: Omega surface language (flat facet colour, a little
grain, a heavy navy ink outline) seen the Tiny Space Program / Starbound way:
side-on, with the camera tipped 14 degrees down so every top surface shows.

Built and checked in the live Blender through the MCP: run this file in the
open Blender (`exec(open(path).read())`), then call a builder and look at the
viewport before rendering. Headless batch still works:

    blender --background --factory-startup --python tools/blender/kit_v7.py -- --all

Units: 1 Blender unit = 1 kit unit (the 402-wide base authoring grid).
Renders are 6 px per unit, shown smoothly at 2 to 3 pt per unit, so they stay
crisp on retina screens. Colour comes only from PALETTE below, which follows
docs/design/game-theme-spec.md section 2. No orange, no green (Liam, 14 Oct).
"""

import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__) if "__file__" in globals() else "/Users/scroobz/Navigation/Landnam/tools/blender", "..", ".."))
WEB_OUT = os.path.join(ROOT, "web", "public", "game", "assets", "base", "v7")
NATIVE_OUT = os.path.join(ROOT, "native", "App", "Resources", "Art", "base", "v7")
PX_PER_UNIT = 6
TILT_DEG = 14.0

PALETTE = {
    "outline": "#16293b",
    "hull": "#ece8df", "hull_shade": "#c9c4b8", "hull_lit": "#faf7f0", "seam": "#8d897f",
    "trim_blue": "#2f6fa8", "trim_blue_dark": "#1f4f7d", "trim_teal": "#2a9aa3",
    "glass": "#9fd6e4", "glass_dark": "#4d8fae",
    "steel": "#5d6b7a", "steel_lit": "#8796a6", "steel_dark": "#3b4654",
    "concrete": "#b9b7b0", "concrete_lit": "#d3d1ca", "concrete_dark": "#8f8d87",
    "asphalt": "#4b4f57",
    "soil": "#7a6a58", "soil_dark": "#5b4e42", "soil_deep": "#4a3f38",
    "rock": "#7c8088", "rock_lit": "#a3a8b0", "rock_dark": "#585c66",
    "gravel": "#8e939b", "gravel_lit": "#b4b9c0",
    "frost": "#e6eef4", "snow": "#f2f6fa", "snow_shade": "#c3d3e2", "ice": "#9cc4dc",
    "sand": "#d8c7a4", "sand_lit": "#e9dcc0", "sand_dark": "#b49f7c",
    "mesa": "#b88a72", "mesa_lit": "#d3a88f", "mesa_dark": "#8c6556",
    "water": "#3f7fa6", "water_lit": "#7fb6d2", "water_deep": "#2b5f84",
    "pine": "#34505e", "pine_lit": "#4c6d7c", "pine_dark": "#243a46",
    "slate_far": "#7f97b3", "slate_far_lit": "#a7bbd2", "slate_mid": "#5f7896", "slate_mid_lit": "#87a0bd",
}


def rgb(hex_value):
    h = hex_value.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # Emission colours are linear in Blender; convert so the PNG shows the exact hex.
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1.0]


# ---------------------------------------------------------------- scene

_MATS = {}


def reset_scene():
    _MATS.clear()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.curves):
        for item in list(block):
            if item.users == 0:
                block.remove(item)
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filter_size = 0.7
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[1].default_value = 0.0
    return scene




def mat(name, grain=0.05):
    """Flat emission colour with a faint object-space grain (the Out There paint texture)."""
    key = (name, grain)
    cached = _MATS.get(key)
    if cached is not None:
        try:
            if cached.name in bpy.data.materials:
                return cached
        except ReferenceError:
            pass
    m = bpy.data.materials.new(f"v7_{name}_{int(grain * 100)}")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    base = rgb(PALETTE[name])
    if grain > 0:
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = 0.9
        tex.inputs["Detail"].default_value = 3.0
        coord = nt.nodes.new("ShaderNodeTexCoord")
        nt.links.new(coord.outputs["Object"], tex.inputs["Vector"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.interpolation = "CONSTANT"
        ramp.color_ramp.elements[0].position = 0.0
        ramp.color_ramp.elements[0].color = [c * (1 - grain) for c in base[:3]] + [1]
        ramp.color_ramp.elements[1].position = 0.5
        ramp.color_ramp.elements[1].color = base
        nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], emit.inputs["Color"])
    else:
        emit.inputs["Color"].default_value = base
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    _MATS[key] = m
    return m


def outline_mat():
    if "v7_outline" in bpy.data.materials:
        return bpy.data.materials["v7_outline"]
    m = bpy.data.materials.new("v7_outline")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = rgb(PALETTE["outline"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    m.use_backface_culling = True
    return m


def ink(obj, width=1.0):
    """Inverted-hull outline. `width` in kit units: 1.0 reads as the spec's 2 px stroke at 2 pt per unit."""
    if obj.type != "MESH":
        return obj
    obj.data.materials.append(outline_mat())
    mod = obj.modifiers.new("ink", "SOLIDIFY")
    mod.thickness = width
    mod.offset = 1.0
    mod.use_flip_normals = True
    mod.use_rim = False
    mod.material_offset = len(obj.data.materials) - 1
    return obj


def faceted(obj, top, front, side, under=None):
    """Assign facet colours by face normal: top lit, front mid, sides shade. Light from the top left."""
    names = [top, front, side, under or side]
    for n in names:
        # Sky pieces stay flat colour; everything on the ground carries the paint grain.
        obj.data.materials.append((mat(n, grain=0) if n.startswith("cloud") else mat(n)) if isinstance(n, str) else n)
    for poly in obj.data.polygons:
        nz, ny, nx = poly.normal.z, poly.normal.y, poly.normal.x
        if nz > 0.55:
            poly.material_index = 0
        elif nz < -0.55:
            poly.material_index = 3
        elif ny < -0.4:
            poly.material_index = 1
        else:
            poly.material_index = 0 if nx < -0.4 else 2
    return obj


def box(name, x, z, w, h, d=10.0, y=0.0, colours=("hull_lit", "hull", "hull_shade"), outline=1.0, bevel=0.0):
    """Box with its bottom-left-front corner at (x, y, z). x right, z up, y into the scene."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, d, h)
    o.location = (x + w / 2, y + d / 2, z + h / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        bev = o.modifiers.new("bevel", "BEVEL")
        bev.width = bevel
        bev.segments = 1
        bev.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="bevel")
    faceted(o, *colours)
    if outline:
        ink(o, outline)
    return o


def prism(name, points, depth, y=0.0, colours=("rock_lit", "rock", "rock_dark"), outline=1.0):
    """Extrude a front-view polygon (list of (x, z)) into the scene by `depth`."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    front = [bm.verts.new((px, y, pz)) for px, pz in points]
    back = [bm.verts.new((px, y + depth, pz)) for px, pz in points]
    bm.faces.new(list(reversed(front)))
    bm.faces.new(back)
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([front[i], front[j], back[j], back[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    faceted(o, *colours)
    if outline:
        ink(o, outline)
    return o


def cylinder(name, x, z, r, h, y=5.0, colours=("hull_lit", "hull", "hull_shade"), outline=1.0, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(x, y, z + h / 2))
    o = bpy.context.active_object
    o.name = name
    faceted(o, *colours)
    if outline:
        ink(o, outline)
    return o


def screen_v(y, z):
    """Screen-up coordinate of a point under the tilted camera. v = 0 is the ground front edge (y = 0, z = 0)."""
    tilt = math.radians(TILT_DEG)
    return z * math.cos(tilt) + y * math.sin(tilt)


def scene_v_top(pad=2.0):
    """Highest screen-v of any visible geometry (outlines included), plus a little padding."""
    deps = bpy.context.evaluated_depsgraph_get()
    top = -1e9
    for o in bpy.context.scene.objects:
        if o.type != "MESH" or o.hide_render:
            continue
        ev = o.evaluated_get(deps)
        for corner in ev.bound_box:
            p = ev.matrix_world @ Vector(corner)
            top = max(top, screen_v(p.y, p.z))
    return top + pad


def camera_for(x0, x1, v0, v1=None):
    """Orthographic side camera tipped down TILT_DEG. Frames kit x0..x1 across and screen-v v0..v1 up
    (see `screen_v`; v1 defaults to the top of the geometry). The bottom pixel row is exactly v0, so the
    game can place a sprite by where v = 0 falls in it. Sets the render size."""
    scene = bpy.context.scene
    if v1 is None:
        v1 = scene_v_top()
    cam_data = bpy.data.cameras.new("v7_cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("v7_cam", cam_data)
    bpy.context.collection.objects.link(cam)
    tilt = math.radians(TILT_DEG)
    cam.rotation_euler = (math.pi / 2 - tilt, 0, 0)
    w, h = x1 - x0, v1 - v0
    cam_data.ortho_scale = max(w, h)
    vc = (v0 + v1) / 2
    # Camera up axis is (0, sin t, cos t) in world space; put the frame centre at screen-v vc.
    up = Vector((0, math.sin(tilt), math.cos(tilt)))
    fwd = Vector((0, math.cos(tilt), math.sin(tilt) * -1))
    centre = Vector(((x0 + x1) / 2, 0, 0)) + up * vc
    cam.location = centre - fwd * 600
    cam_data.clip_end = 3000
    scene.camera = cam
    scene.render.resolution_x = int(round(w * PX_PER_UNIT))
    scene.render.resolution_y = int(round(h * PX_PER_UNIT))
    scene.render.resolution_percentage = 100
    cam["v7_frame"] = (x0, x1, v0, v1)
    return cam


def render(name, subdir=""):
    """Render the current camera to web and native at the same path (base/v7/<subdir>/<name>.png)."""
    scene = bpy.context.scene
    paths = []
    for root in (WEB_OUT, NATIVE_OUT):
        folder = os.path.join(root, subdir) if subdir else root
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, f"{name}.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        paths.append(path)
    return paths


if __name__ == "__main__" and "--all" in sys.argv:
    print("kit_v7: builders live in tools/blender/models/base_v7.py")

"""Live-reloading preview of ships.py and parts.py (KES-88 color/detail pass).

Watches both files' mtimes and rebuilds the scene automatically on save — no
restart. This is the fix for closing/reopening Blender on every edit: run it
ONCE, leave the window open, and further code edits apply on their own within
about a second.

    blender --factory-startup --python tools/blender/preview_parts.py

Not part of render_all.py's pipeline; a throwaway interactive dev tool.
"""

import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, "models")
for p in (HERE, MODELS):
    if p not in sys.path:
        sys.path.insert(0, p)

import bpy
import landnam_kit as kit
import parts as parts_module
import ships as ships_module

MODULES = [parts_module, ships_module]
GAPS = [2.6, 9.5]
WATCHED = [
    os.path.join(MODELS, "parts.py"),
    os.path.join(MODELS, "ships.py"),
]

_created_object_names = []
_last_mtimes = {}


def _clear_previous():
    for name in _created_object_names:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)
    _created_object_names.clear()
    # Materials are cached by name inside emission_material(), so a colour
    # tweak that reuses an existing key (e.g. "hull_lit") would otherwise be
    # invisible on reload — the cached material from the first run would just
    # get reused unchanged. Clearing all of them forces every material to be
    # rebuilt fresh from the current TOKENS/hex values each rebuild.
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def _apply_viewport_settings():
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type != "VIEW_3D":
                continue
            for space in area.spaces:
                if space.type == "VIEW_3D":
                    space.shading.type = "MATERIAL"
                    space.shading.color_type = "MATERIAL"
                    space.overlay.show_floor = False
                    space.overlay.show_axis_x = False
                    space.overlay.show_axis_y = False
                    space.overlay.show_cursor = False
            region = next((r for r in area.regions if r.type == "WINDOW"), None)
            if region is None:
                continue
            with bpy.context.temp_override(window=window, area=area, region=region):
                bpy.ops.view3d.view_axis(type="FRONT")
                bpy.ops.view3d.view_all()


def rebuild(refit_view=True):
    _clear_previous()
    row_x = 0.0
    for mod, gap in zip(MODULES, GAPS):
        importlib.reload(mod)
        for key, build in mod.BUILDS.items():
            before = set(bpy.data.objects.keys())
            build()
            new_names = [n for n in bpy.data.objects.keys() if n not in before]
            for n in new_names:
                bpy.data.objects[n].location.x += row_x
            _created_object_names.extend(new_names)
            row_x += gap
    if refit_view:
        _apply_viewport_settings()


def _check_reload():
    changed = False
    for path in WATCHED:
        mtime = os.path.getmtime(path)
        if _last_mtimes.get(path) != mtime:
            _last_mtimes[path] = mtime
            changed = True
    if changed:
        # Re-import ships/parts by name after editing on disk — importlib
        # needs the *module objects* we already hold, done inside rebuild().
        global parts_module, ships_module
        rebuild(refit_view=False)
        print("[preview] reloaded ships.py / parts.py")
    return 1.0  # seconds until next check — a repeating bpy.app.timers callback


rebuild(refit_view=True)
for path in WATCHED:
    _last_mtimes[path] = os.path.getmtime(path)

if not bpy.app.timers.is_registered(_check_reload):
    bpy.app.timers.register(_check_reload, persistent=True)

"""Driver for the Blender sprite pipeline.

    blender --background --factory-startup --python tools/blender/render_all.py
    blender --background --factory-startup --python tools/blender/render_all.py -- --only actors

Each model function builds its objects into an empty scene and returns its
render settings; this walks them, renders one PNG per entry into
`web/public/game/assets/`, and reports what it wrote. Every model is rebuilt
from a clean scene, so nothing leaks between renders.

There are no `.blend` files on purpose. Models are Python, so they diff, review
and regenerate like any other source — a binary blob that only one machine can
open is how an asset pipeline quietly dies.
"""

import argparse
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT_ROOT = os.path.join(REPO, "web", "public", "game", "assets")

for p in (HERE, os.path.join(HERE, "models")):
    if p not in sys.path:
        sys.path.insert(0, p)

import landnam_kit as kit  # noqa: E402

MODULES = ["hub_structures", "launchpad", "actors", "ships", "rooms", "parts"]


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    ap = argparse.ArgumentParser(prog="render_all")
    ap.add_argument("--only", action="append", default=None,
                    help="Module or sprite key substring to render. Repeatable.")
    ap.add_argument("--out", default=OUT_ROOT)
    return ap.parse_args(argv)


def wanted(name, filters):
    return not filters or any(f in name for f in filters)


def main():
    args = parse_args()
    written, skipped = [], []

    for mod_name in MODULES:
        kit.set_palette("hub_light" if mod_name in {"hub_structures", "launchpad"} else "default")
        mod = importlib.import_module(mod_name)
        importlib.reload(mod)
        for key, build in mod.BUILDS.items():
            if not (wanted(mod_name, args.only) or wanted(key, args.only)):
                skipped.append(key)
                continue

            kit.reset_scene()
            spec = build()
            # Most keys are "hub/foo" and land under web/public/game/assets/.
            # A few (the shop icons in parts.py) live at web/public/parts/
            # instead — a sibling of game/assets, not a child of it — and use
            # a "../parts/foo" key so normpath resolves out of OUT_ROOT rather
            # than needing a second --out root threaded through every module.
            path = os.path.normpath(os.path.join(args.out, key + ".png"))
            layout_w, layout_h = spec["layout"]
            kit.sprite_render(
                path, layout_w, layout_h,
                ortho_scale=spec["ortho"],
                mode=spec.get("mode", "flat"),
                target=spec.get("target", (0, 0, 0)),
            )
            written.append((key, path, layout_w, layout_h))

    print("\n=== landnam sprite render ===")
    for key, path, w, h in written:
        size = os.path.getsize(path) if os.path.exists(path) else -1
        rel = os.path.relpath(path, REPO)
        status = "ok " if size > 0 else "FAIL"
        print(f"  {status} {key:24s} {w}x{h} @{kit.SUPERSAMPLE}x  {size/1024:7.1f} KB  {rel}")
    if skipped:
        print(f"  skipped {len(skipped)}: {', '.join(skipped)}")
    total = sum(os.path.getsize(p) for _, p, _, _ in written if os.path.exists(p))
    print(f"  {len(written)} sprites, {total/1024:.1f} KB total")


main()

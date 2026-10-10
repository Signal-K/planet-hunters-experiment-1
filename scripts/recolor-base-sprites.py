#!/usr/bin/env python3
"""Recolour the base structure sprites to the design palette (docs/design/base-layout-tsp-v4.png).

Walls off-white/light grey, teal and mint trim, dark window glass, rust-orange only on the silo.
Line art (navy ink) is untouched. Originals are in git history; run from the repo root:
    python3 -I scripts/recolor-base-sprites.py
"""
from pathlib import Path
from PIL import Image

ART = Path(__file__).resolve().parent.parent / "native/App/Resources/Art/base"

WALL, WALL_SHADE = (244, 248, 252), (223, 233, 243)
GLASS_SRC, TRIM_BLUE, TRIM_BLUE_LIGHT = (207, 230, 246), (31, 120, 193), (127, 178, 220)

OFF_WHITE, LIGHT_GREY = (236, 238, 236), (206, 212, 214)
DARK_GLASS, MINT = (44, 66, 82), (92, 196, 160)
RUST, RUST_SHADE = (184, 92, 52), (150, 70, 38)

COMMON = {WALL: OFF_WHITE, WALL_SHADE: LIGHT_GREY, GLASS_SRC: DARK_GLASS, TRIM_BLUE: MINT, TRIM_BLUE_LIGHT: MINT}
SILO = {WALL: RUST, WALL_SHADE: RUST_SHADE, GLASS_SRC: RUST, TRIM_BLUE: MINT, TRIM_BLUE_LIGHT: MINT}
MAPS = {"launchpad_flat": {**COMMON, GLASS_SRC: LIGHT_GREY}, "hangar_flat": COMMON, "exchange_flat": COMMON, "surface_silo_flat": SILO}
TOL = 6


def near(a, b):
    return all(abs(x - y) <= TOL for x, y in zip(a, b))


for name, mapping in MAPS.items():
    path = ART / f"{name}.png"
    img = Image.open(path).convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            for src, dst in mapping.items():
                if near((r, g, b), src):
                    px[x, y] = (*dst, a)
                    break
    img.save(path, optimize=True)
    print("recoloured", path.name)

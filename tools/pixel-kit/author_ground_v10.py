#!/usr/bin/env python3
"""Hand-pixel authoring of the layered ground kit (docs/STYLE.md): rock strata bands, boulders, embedded stones, mineral seams,
ore flecks, cracks, clods, shaded ridges, rock faces, a pebbled crust and sky dither strips. Every stamp is an explicit ASCII grid
placed at an explicit coordinate; no noise, no gradients, no antialiasing. Same Img helpers and palette as base-kit-v8.
Slots 1..5 are the neutral greys (light to dark). The laser scene tints them per world (Mars / Bennu / icy moon tones); the base
underground maps them to the kit's warm soil letters. Overwrites ug-soil (base kit) and soil, crust, ridge-* (laser kit); adds
soil-flecks, sky-dither-0..2 and ug-flecks. Run: python3 -I tools/pixel-kit/author_ground_v10.py"""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import author_kit_v8 as kit
import author_laser_v9 as laser  # noqa: F401  (registers grey palette slots 1..5)
from author_kit_v8 import Img, P, ROOT

LASER = os.path.join(ROOT, "native/App/Resources/Art/laser")
KIT = os.path.join(ROOT, "native/App/Resources/Art/base/kit")
SHEET = os.path.join(ROOT, "docs/art/ground-kit-v10")
P.update({"u": (46, 34, 36, 255), "v": (128, 98, 86, 255), "x": (150, 120, 104, 255),
          "z": (92, 232, 255, 255), "y": (232, 196, 96, 255), "i": (186, 214, 224, 255)})

GREY = {"1": "1", "2": "2", "3": "3", "4": "4", "5": "5"}
WARM = {"1": "x", "2": "v", "3": "p", "4": "q", "5": "r"}

class Tile(Img):
    """Img that wraps horizontally and vertically so stamps tile seamlessly."""
    def set(self, x, y, c):
        self.px[y % self.h][x % self.w] = c
    def stamp(self, rows, x, y, pal):
        for j, r in enumerate(rows):
            for i, c in enumerate(r):
                if c != ".": self.set(x + i, y + j, pal.get(c, c))

BOULDER = ["...1112221...", "..12222233321", ".122233333443", "1222333344443", "1223333444455", ".23334444555.", "..4444555555."]
BOULDER_S = ["..1122..", ".122333.", "12233344", "23334455", ".344555."]
STONE = [".122.", "12334", ".445."]
PEBBLE = ["12", "34"]
CLOD = [".11.", "1223", ".344"]
CRACK_A = ["5....", ".5...", "..55.", "....5", "...5."]
CRACK_B = ["..5", ".5.", "5..", ".5.", "..5", "..5"]
SEAM = ["1.", ".1"]

def bands(t, pal, edges, tones, wobble):
    """Fill horizontal strata. edges are the band start rows, tones the fill slot per band, wobble a repeating y offset table."""
    for x in range(t.w):
        w = wobble[x % len(wobble)]
        for k, (y0, tone) in enumerate(zip(edges, tones)):
            y1 = (edges[k + 1] if k + 1 < len(edges) else t.h) + (wobble[x % len(wobble)] if k + 1 < len(edges) else 0)
            for y in range(y0 + (w if k else 0), y1): t.set(x, y, pal[tone])
    for k, y0 in enumerate(edges[1:], 1):
        for x in range(t.w):
            y = y0 + wobble[x % len(wobble)]
            t.set(x, y, pal["5"] if x % 2 == 0 else pal[tones[k]])       # shadow line with a dithered edge
            t.set(x, y - 1, pal[tones[k - 1]] if x % 2 else pal["2"])    # lit lip on the band above

def ground(pal, flecks=False):
    t = Tile(64, 64)
    wob = [0, 0, 1, 1, 2, 1, 1, 0, 0, -1, -1, 0, 1, 1, 0, -1]
    bands(t, pal, (0, 14, 29, 45, 57), ("3", "4", "3", "2", "4"), wob)
    t_dith = ((14, "3", "4"), (45, "3", "2"))
    for y0, a, b in t_dith:
        for x in range(0, t.w):
            if (x + y0) % 2: t.set(x, y0 + wob[x % 16] + 2, pal[b]); t.set(x, y0 + wob[x % 16] - 3, pal[a])
    if flecks: return t
    for rows, x, y in ((BOULDER, 6, 17), (BOULDER, 44, 47), (BOULDER_S, 30, 33), (BOULDER_S, 52, 2), (BOULDER_S, 14, 52)):
        t.stamp(rows, x, y, pal)
    for x, y in ((24, 4), (40, 20), (3, 31), (57, 34), (22, 50), (36, 59), (60, 24), (12, 8), (48, 12), (28, 24), (50, 60)):
        t.stamp(STONE, x, y, pal)
    for x, y in ((1, 3), (18, 11), (34, 8), (45, 24), (10, 40), (38, 41), (58, 43), (26, 61), (61, 14), (21, 36), (4, 60)):
        t.stamp(PEBBLE, x, y, pal)
    for x, y in ((50, 7), (20, 20), (60, 52), (8, 46)): t.stamp(CLOD, x, y, pal)
    for x, y in ((32, 16), (9, 36), (42, 52)): t.stamp(CRACK_A, x, y, pal)
    for x, y in ((56, 18), (26, 44), (2, 24)): t.stamp(CRACK_B, x, y, pal)
    for i in range(20):                                    # light mineral seam running through the lower band
        t.stamp(SEAM, 2 + i * 2, 47 + (i // 4) % 3 + (0 if i < 12 else -1), pal)
    for i in range(14):                                    # second, thinner seam through the upper band
        t.stamp(SEAM, 38 + i * 2, 24 - (i // 5), pal)
    return t

def fleck_tile():
    t = Tile(64, 64)
    for x, y, c in ((10, 21, "z"), (11, 22, "i"), (48, 51, "y"), (49, 51, "y"), (8, 54, "z"), (24, 49, "y"), (25, 48, "i"),
                    (47, 25, "z"), (46, 26, "z"), (34, 36, "y"), (58, 8, "i"), (20, 6, "z"), (40, 29, "y"), (4, 38, "i"), (30, 58, "z")):
        t.set(x, y, c)
    return t

def crust():
    t = Tile(64, 8)
    t.rect(0, 0, 63, 0, "1"); t.rect(0, 1, 63, 1, "2"); t.rect(0, 2, 63, 6, "3"); t.rect(0, 7, 63, 7, "5")
    for x in (3, 4, 13, 21, 22, 28, 37, 45, 46, 55, 60): t.set(x, 0, "2")
    for x, y in ((2, 3), (9, 4), (17, 3), (26, 5), (33, 3), (41, 4), (50, 5), (57, 3)): t.stamp(PEBBLE, x, y, GREY)
    for x, y in ((6, 5), (30, 2), (48, 2)): t.stamp([".12.", "1234", ".44."], x, y, GREY)
    for x, y in ((14, 2), (38, 3), (53, 1)): t.stamp(["5.", ".5", "5."], x, y, GREY)
    for x in (12, 24, 35, 52): t.rect(x, 5, x + 2, 5, "4")
    t.rect(0, 6, 63, 6, "4")
    for x in range(0, 64, 2): t.set(x, 6, "3")             # dithered underside so the crust blends into the dirt
    return t

def ridge(kind):
    w, h = 128, 48
    t = Tile(w, h)
    tops = []
    for x in range(w):
        a = 2 * math.pi * x / w
        if kind == "dunes": top = 20 + round(9 * math.sin(a * 2) + 4 * math.sin(a * 3 + 1))
        elif kind == "ice": top = 14 + round(abs(((x * 3) % 32) - 16) * 1.3) + round(6 * math.sin(a * 2))
        else: top = 18 + round(5 * math.sin(a * 3) + 4 * math.sin(a * 5 + 2)) // 2 * 2
        tops.append(max(4, min(h - 4, top)))
    for x in range(w):
        slope = tops[(x + 2) % w] - tops[(x - 2) % w]      # >0 climbing to the right: lit face; <0 falling: shaded face
        for y in range(tops[x]):
            d = tops[x] - 1 - y                            # depth below the crest line
            lit, dark = ("2", "3") if slope > 0 else (("3", "4") if slope < 0 else ("2", "3"))
            if d == 0: c = "1"
            elif d == 1: c = "2" if slope >= 0 else "3"
            elif d < 6: c = lit if (x + d) % 4 else dark
            elif abs(slope) >= 5: c = dark if (x + d // 3) % 5 else "5"   # steep rock face: vertical strata cuts
            else: c = dark if (x // 2 + d) % 3 else lit
            if y < 5: c = "4" if (x + d) % 2 else "5"           # dark base, keeps the layer from glowing
            t.set(x, h - 1 - y, c)
    for x in range(5, w, 19):                              # boulders on the hill flank
        t.stamp(BOULDER_S, x, h - tops[x] + 3, GREY)
    return t

def sky_dither(level):
    """16x4 ordered-dither strip, 25 / 50 / 75 percent coverage. Tinted per world and laid across the sky in bands."""
    rows = {0: ["1...1...1...1...", "..1...1...1...1.", "1...1...1...1...", "..1...1...1...1."],
            1: ["1.1.1.1.1.1.1.1.", ".1.1.1.1.1.1.1.1", "1.1.1.1.1.1.1.1.", ".1.1.1.1.1.1.1.1"],
            2: ["1111.111.1111.11", ".1.11.1111.1.111", "1111.111.1111.11", "11.1.1111.11.111"]}[level]
    return Img.grid(rows)

def main():
    os.makedirs(SHEET, exist_ok=True)
    parts = {
        "laser/soil": ground(GREY), "laser/soil-flecks": fleck_tile(), "laser/crust": crust(),
        "laser/ridge-rubble": ridge("rubble"), "laser/ridge-dunes": ridge("dunes"), "laser/ridge-ice": ridge("ice"),
        "laser/sky-dither-0": sky_dither(0), "laser/sky-dither-1": sky_dither(1), "laser/sky-dither-2": sky_dither(2),
        "base/kit/ug-soil": ground(WARM), "base/kit/ug-flecks": fleck_tile(),
    }
    for n, im in parts.items():
        d, name = n.split("/", 1) if n.startswith("laser/") else ("base/kit", n.split("/")[-1])
        im.save(os.path.join(LASER if d == "laser" else KIT, name + ".png"))
    gut = 4
    sheet = Img(420, 210)
    x = y = gut; rowh = 0
    for n, im in parts.items():
        if x + im.w + gut > sheet.w: x = gut; y += rowh + gut; rowh = 0
        sheet.paste(im, x, y); x += im.w + gut; rowh = max(rowh, im.h)
    sheet.save(os.path.join(SHEET, "sheet.png"))
    open(os.path.join(SHEET, "README.md"), "w").write("# ground-kit-v10\n\nLayered ground, ridges, crust and sky dither, generated by `tools/pixel-kit/author_ground_v10.py`. Slices: " + ", ".join(parts) + ".\n")

main()

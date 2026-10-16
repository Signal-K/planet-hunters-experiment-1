#!/usr/bin/env python3
"""Hand-pixel authoring of base-kit-v7 parts (docs/STYLE.md). Every pixel is placed explicitly
from the kit palette: ASCII grids and explicit rects, no noise, no gradients, no antialiasing.
Writes the sliced parts to native/App/Resources/Art/base/kit and the full sheet to docs/art/base-kit-v7/sheet.png.
Run: python3 -I tools/pixel-kit/author_kit_v7.py"""
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KIT = os.path.join(ROOT, "native/App/Resources/Art/base/kit")
SHEET = os.path.join(ROOT, "docs/art/base-kit-v7")

P = {  # kit palette, sampled from the old pad-rocket.png; art-reference.png direction / asteroid-grey.png / starter-pad-platform.png
    ".": (0, 0, 0, 0), "K": (36, 32, 42, 255), "D": (52, 54, 62, 255), "S": (90, 96, 108, 255),
    "M": (176, 180, 188, 255), "L": (188, 194, 206, 255), "W": (242, 238, 230, 255),
    "B": (48, 108, 198, 255), "b": (28, 70, 146, 255), "C": (110, 188, 220, 255),
    "Y": (250, 214, 110, 255),
    "N": (22, 30, 48, 255), "G": (153, 153, 161, 255), "H": (102, 102, 110, 255), "J": (204, 204, 212, 255),
    "g": (51, 51, 59, 255),
    "A": (146, 138, 128, 255), "a": (112, 106, 100, 255), "e": (176, 168, 156, 255), "d": (74, 70, 68, 255),
    "F": (226, 218, 200, 255), "E": (186, 176, 158, 255),  # warm concrete greys, cream panel + panel shadow
}

class Img:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [["."] * w for _ in range(h)]
    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h: self.px[y][x] = c
    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.set(x, y, c)
    def paste(self, other, ox, oy):
        for y in range(other.h):
            for x in range(other.w):
                if other.px[y][x] != ".": self.set(ox + x, oy + y, other.px[y][x])
    def outline(self, c="K"):
        out = [row[:] for row in self.px]
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] == ".": continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < self.w and 0 <= ny < self.h) or self.px[ny][nx] == ".":
                        out[y][x] = c; break
        self.px = out
    def save(self, path):
        im = Image.new("RGBA", (self.w, self.h))
        im.putdata([P[c] for row in self.px for c in row])
        im.save(path)
    @staticmethod
    def grid(rows):
        w = max(len(r) for r in rows)
        im = Img(w, len(rows))
        for y, r in enumerate(rows):
            for x, c in enumerate(r): im.set(x, y, c)
        return im

# ---- Reference-style pad stack (docs/art-reference.png): dark steel lattice gantry, cream/blue rocket with boosters,
# chunky warm concrete pad, glazed cream hangar. No orange anywhere.
def tower():
    t = Img(30, 92)
    for y in range(92):
        for x, c in ((0, "K"), (1, "S"), (2, "D"), (3, "K"), (26, "K"), (27, "D"), (28, "S"), (29, "K")): t.set(x, y, c)
    bay = 10
    for i in range(8):
        y0 = 8 + i * bay
        for k in range(bay):
            x = 4 + round(k * 21 / (bay - 1))
            t.set(x, y0 + k, "S"); t.set(x + 1, y0 + k, "D")
            t.set(25 - round(k * 21 / (bay - 1)), y0 + k, "S"); t.set(24 - round(k * 21 / (bay - 1)), y0 + k, "D")
        t.rect(4, y0, 25, y0, "D")
    for y in (28, 58):                                              # service platforms with rails
        t.rect(0, y, 29, y, "S"); t.rect(0, y + 1, 29, y + 1, "D"); t.rect(0, y + 2, 29, y + 2, "K")
        for x in range(2, 28, 5): t.rect(x, y - 3, x, y - 1, "K")
        t.rect(0, y - 3, 29, y - 3, "K")
    for y in (18, 48, 74):                                          # blue status lamps
        t.rect(1, y, 2, y + 1, "B"); t.rect(27, y, 28, y + 1, "B")
    t.rect(4, 6, 25, 7, "S"); t.rect(0, 6, 29, 6, "K")              # top deck
    t.rect(13, 0, 15, 5, "D"); t.rect(14, 0, 14, 5, "S"); t.set(14, 0, "B")  # mast, blue beacon
    t.rect(0, 87, 29, 91, "D"); t.rect(0, 87, 29, 87, "S"); t.rect(0, 91, 29, 91, "K")  # foot
    return t

def arm(length, tip):
    a = Img(length, 5)
    a.rect(0, 0, length - 1, 0, "S"); a.rect(0, 1, length - 1, 2, "D"); a.rect(0, 3, length - 1, 3, "K")
    for x in range(2, length - 6, 4): a.set(x, 1, "S"); a.set(x + 1, 2, "S")   # truss ticks
    a.rect(length - 5, 0, length - 1, 4, "S"); a.rect(length - 5, 4, length - 1, 4, "K")
    a.set(length - 1, 2, "B"); a.set(length - 1, 1, "B")
    return a

def gantry_frame():
    f = Img(120, 92)
    f.paste(tower(), 6, 0)
    f.paste(arm(40, 0), 36, 24)          # reaches the core stage under the nose
    f.paste(arm(28, 0), 36, 46)          # clamps to the left booster
    f.paste(arm(28, 0), 36, 66)
    f.rect(58, 86, 105, 91, "D"); f.rect(58, 86, 105, 86, "S"); f.rect(58, 91, 105, 91, "K")
    for x in (62, 80, 98): f.rect(x, 88, x + 2, 89, "B")             # mount lamps
    f.rect(54, 88, 57, 91, "K"); f.rect(106, 88, 109, 91, "K")
    return f

def rocket():
    r = Img(44, 72)
    def cone(cx, y0, widths):
        for i, w in enumerate(widths):
            x0 = cx - w // 2
            r.rect(x0, y0 + i, x0 + w - 1, y0 + i, "B")
            r.set(x0, y0 + i, "C"); r.set(x0 + w - 1, y0 + i, "b")
    def stage(x0, x1, y0, y1):
        r.rect(x0, y0, x1, y1, "F"); r.rect(x0, y0, x0, y1, "W"); r.rect(x1 - 1, y0, x1, y1, "E")
    # boosters (behind), core stage, nose cones
    for bx in (4, 32):
        stage(bx, bx + 7, 28, 63); cone(bx + 4, 20, [2, 4, 4, 6, 6, 8, 8, 8])
        r.rect(bx, 46, bx + 7, 47, "B"); r.rect(bx, 48, bx + 7, 48, "b"); r.rect(bx, 38, bx + 7, 38, "E")
        r.rect(bx + 1, 64, bx + 6, 69, "D"); r.rect(bx + 1, 64, bx + 6, 64, "S"); r.rect(bx + 2, 70, bx + 5, 70, "K")
    for x0 in (12, 29):                                             # booster-to-core struts
        for y in (34, 52): r.rect(x0, y, x0 + 2, y + 1, "D"); r.set(x0 + 1, y, "S")
    stage(15, 28, 16, 63); cone(22, 4, [2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 14])
    for y, c in ((18, "B"), (19, "B"), (20, "b"), (46, "B"), (47, "B"), (48, "b"), (58, "B"), (59, "b")): r.rect(15, y, 28, y, c)
    for y in (28, 40, 52): r.rect(15, y, 28, y, "E")
    r.rect(19, 30, 24, 35, "K"); r.rect(20, 31, 23, 34, "N"); r.rect(20, 31, 21, 32, "C")   # porthole
    r.rect(16, 64, 27, 71, "D"); r.rect(15, 64, 28, 64, "S"); r.rect(18, 68, 25, 71, "D"); r.rect(16, 71, 27, 71, "K")
    r.outline()
    r.rect(21, 0, 22, 3, "S"); r.rect(21, 0, 22, 0, "K")            # antenna
    return r

def pad_slab():
    w, h = 120, 20
    s = Img(w, h)
    s.rect(2, 0, w - 3, 2, "e"); s.rect(2, 3, w - 3, 3, "A")
    s.rect(0, 4, w - 1, 15, "A"); s.rect(0, 4, w - 1, 4, "e"); s.rect(0, 16, w - 1, 17, "a"); s.rect(2, 18, w - 3, 19, "d")
    for x in range(14, w - 6, 20):                                   # panel seams and bolts
        s.rect(x, 5, x, 15, "a"); s.set(x - 2, 7, "e"); s.set(x + 2, 7, "e"); s.set(x - 2, 13, "e"); s.set(x + 2, 13, "e")
    s.rect(0, 9, w - 1, 9, "a")
    for x in range(6, w - 10, 20): s.rect(x, 11, x + 5, 12, "b")      # blue trim plates
    s.rect(0, 4, 0, 15, "a"); s.rect(w - 1, 4, w - 1, 15, "a")
    s.outline()
    return s

def hangar():
    w, h = 72, 44
    s = Img(w, h)
    for y, (a, b) in {5: (14, 57), 6: (10, 61), 7: (7, 64), 8: (5, 66), 9: (3, 68), 10: (2, 69), 11: (2, 69)}.items():
        s.rect(a, y, b, y, "F")
    s.rect(2, 12, 69, 43, "F"); s.rect(67, 12, 69, 43, "E")
    s.rect(10, 7, 61, 7, "W")
    for x0 in range(12, 60, 12):                                     # roof glass panels
        s.rect(x0, 8, x0 + 9, 10, "B"); s.rect(x0, 8, x0 + 9, 8, "C"); s.rect(x0, 10, x0 + 9, 10, "b")
    s.rect(3, 10, 8, 11, "B"); s.rect(63, 10, 68, 11, "b")
    s.rect(2, 12, 69, 12, "E")
    s.rect(2, 13, 69, 14, "B"); s.rect(2, 15, 69, 15, "b")           # blue trim band
    for x0 in (5, 17, 44, 56):                                       # glazed upper windows
        s.rect(x0, 17, x0 + 9, 24, "K"); s.rect(x0 + 1, 18, x0 + 8, 23, "B")
        s.rect(x0 + 1, 18, x0 + 8, 19, "C"); s.rect(x0 + 4, 18, x0 + 4, 23, "K"); s.rect(x0 + 5, 18, x0 + 5, 23, "W")
        s.rect(x0, 25, x0 + 9, 25, "E")
    s.rect(29, 17, 42, 25, "K"); s.rect(30, 18, 41, 24, "C"); s.rect(35, 18, 36, 24, "W")  # glazed clerestory over the door
    s.rect(18, 27, 53, 43, "K"); s.rect(19, 28, 52, 42, "D")         # door frame
    for x0 in (20, 28, 36, 44):                                      # four glazed door panels
        s.rect(x0, 29, x0 + 6, 41, "N"); s.rect(x0, 29, x0 + 6, 31, "B"); s.rect(x0 + 1, 29, x0 + 2, 30, "C")
        s.rect(x0 + 2, 36, x0 + 4, 41, "S")
    s.rect(2, 27, 15, 42, "E"); s.rect(3, 28, 14, 41, "F")          # side panels
    s.rect(56, 27, 69, 42, "E"); s.rect(57, 28, 68, 41, "F")
    for x in (8, 62): s.rect(x, 28, x, 41, "E")
    for x0 in (4, 59): s.rect(x0, 30, x0 + 8, 36, "K"); s.rect(x0 + 1, 31, x0 + 7, 35, "B"); s.rect(x0 + 1, 31, x0 + 7, 31, "C")
    s.rect(2, 41, 69, 43, "a"); s.rect(2, 43, 69, 43, "d")
    for x in (10, 61):                                               # antenna masts, blue tips
        s.rect(x, 0, x, 5, "S"); s.set(x, 0, "B"); s.rect(x - 1, 2, x + 1, 2, "D")
    s.outline()
    return s

def silo():
    w, h = 44, 36
    s = Img(w, h)
    s.rect(18, 0, 25, 13, "W"); s.rect(19, 0, 24, 13, "N")
    s.rect(1, 12, 42, 35, "W"); s.rect(2, 13, 41, 34, "N")
    s.rect(2, 31, 41, 34, "S"); s.rect(2, 31, 41, 31, "M")
    s.rect(17, 14, 26, 24, "L"); s.rect(18, 15, 25, 23, "N"); s.rect(17, 24, 26, 25, "B")  # cage
    s.rect(21, 0, 22, 24, "S")                                                           # cable
    for x in (6, 8, 10, 33, 35, 37): s.rect(x, 22, x, 30, "B")
    s.rect(4, 17, 12, 18, "b"); s.rect(31, 17, 39, 18, "b")
    s.outline()
    return s

# ---- Flight: hand-drawn asteroid 48x40
def asteroid():
    spans = [(18,30),(13,35),(9,39),(6,42),(4,44),(3,45),(2,46),(1,46),(1,47),(0,47),(0,47),(0,47),(0,47),(0,46),(1,46),
             (1,47),(0,47),(0,47),(0,46),(1,46),(1,45),(2,45),(2,46),(3,46),(3,45),(4,45),(5,44),(5,43),(6,42),(8,41),(9,40),(11,38),(13,36),(15,33),(18,30)]
    # 35 rows; pad to 40 with offset
    a = Img(48, 40)
    for i, (x0, x1) in enumerate(spans):
        y = i + 2
        a.rect(x0, y, x1, y, "G")
    # hand-shaded: light upper-left, dark lower-right (explicit per-row bands)
    for i, (x0, x1) in enumerate(spans):
        y = i + 2
        lit = max(0, 20 - i)             # lit width shrinks down the rock
        for x in range(x0, min(x1, x0 + lit)): a.set(x, y, "J" if x < x0 + lit // 2 else "G")
        dark = 5 + (i * 3) // 5
        for x in range(max(x0, x1 - dark), x1 + 1): a.set(x, y, "H")
    # craters: dark bowl lower-left, light rim upper-right
    for cx, cy, r in ((14, 14, 3), (30, 12, 2), (26, 24, 3), (10, 26, 2), (38, 22, 2)):
        a.rect(cx - r, cy, cx + r, cy + 1, "g"); a.rect(cx - r + 1, cy - 1, cx + r - 1, cy - 1, "g")
        a.rect(cx - r + 1, cy + 2, cx + r, cy + 2, "J")
    a.outline()
    return a

FLAME = [  # blue-white thruster flame, no orange
 ["..................",
  "..........BB......",
  "......BBBBCCCC....",
  "..BBBBCCCCWWWWWW..",
  "BBBCCCCWWWWWWWWWW.",
  "..BBBBCCCCWWWWWW..",
  "......BBBBCCCC....",
  "..........BB......",
  ".................."],
 ["..................",
  "............BB....",
  "........BBBCCC....",
  "....BBCCCCWWWWWW..",
  "..BBCCCCWWWWWWWWW.",
  "....BBCCCCWWWWWW..",
  "........BBBCCC....",
  "............BB....",
  ".................."],
 ["..................",
  "..........B.......",
  "....BBBBBCCCC.....",
  "BBBCCCCCWWWWWWWW..",
  "BBCCCCWWWWWWWWWWWW",
  "BBBBCCCCWWWWWWWW..",
  "....BBBBBCCCC.....",
  "..........B.......",
  ".................."],
]

# ---- Starfield tiles (hand-placed stars, repeat seamlessly) and a banded dusk strip
STARS = {
 "stars-far": [(5,9),(21,40),(37,17),(58,52),(70,6),(88,33),(101,60),(14,70),(46,82),(77,91),(112,22),(120,76),(30,108),(63,117),(95,105)],
 "stars-mid": [(12,20),(52,8),(84,44),(26,66),(108,90),(66,98),(118,12),(40,118)],
 "stars-near": [(30,30),(94,70),(60,110),(8,88)],
}
def star_tile(name):
    t = Img(128, 128)
    for i, (x, y) in enumerate(STARS[name]):
        c = "W" if name != "stars-far" else "M"
        t.set(x, y, c)
        if name == "stars-near":
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): t.set(x + dx, y + dy, "C")
        elif name == "stars-mid" and i % 2 == 0:
            t.set(x + 1, y, "M")
    return t

def space_bands():
    # 1px wide, 96 tall deep dusk bands with a 2-row checker dither at each seam (nearest-scaled to the screen).
    cols = [(15, 12, 48), (17, 13, 54), (20, 14, 60), (24, 15, 66)]
    im = Image.new("RGBA", (2, 96))
    for y in range(96):
        band = min(3, y // 24)
        near = y % 24
        c = cols[band]
        if band < 3 and near >= 22: c = cols[band + 1] if (y + 0) % 2 == 0 else cols[band]
        for x in range(2): im.putpixel((x, y), c + (255,))
    return im

def main():
    os.makedirs(SHEET, exist_ok=True)
    parts = {
        "pad-gantry-frame": gantry_frame(), "pad-slab-concrete": pad_slab(), "hangar-white": hangar(), "pad-rocket": rocket(),
        "silo-cutaway": silo(), "asteroid-pixel": asteroid(),
        "flame-0": Img.grid(FLAME[0]), "flame-1": Img.grid(FLAME[1]), "flame-2": Img.grid(FLAME[2]),
        "stars-far": star_tile("stars-far"), "stars-mid": star_tile("stars-mid"), "stars-near": star_tile("stars-near"),
    }
    for n, im in parts.items(): im.save(os.path.join(KIT, n + ".png"))
    space_bands().save(os.path.join(KIT, "space-bands.png"))
    # full sheet: parts laid out on a 4px-gutter row grid
    order = ["pad-gantry-frame", "pad-rocket", "pad-slab-concrete", "hangar-white", "silo-cutaway", "asteroid-pixel", "flame-0", "flame-1", "flame-2"]
    W = max(parts[n].w for n in order) + 8
    H = sum(parts[n].h + 4 for n in order) + 4
    sheet = Img(max(W, 140), H)
    y = 4
    for n in order:
        sheet.paste(parts[n], 4, y); y += parts[n].h + 4
    sheet.save(os.path.join(SHEET, "sheet.png"))
    open(os.path.join(SHEET, "README.md"), "w").write(
        "# base-kit-v7\n\nGenerated by `tools/pixel-kit/author_kit_v7.py`. `sheet.png` is the full sheet; sliced parts live in "
        "`native/App/Resources/Art/base/kit/`: " + ", ".join(sorted(list(parts) + ["space-bands"])) + ".\n")

main()

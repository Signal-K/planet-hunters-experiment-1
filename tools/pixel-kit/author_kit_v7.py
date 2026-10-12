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

P = {  # kit palette, sampled from pad-rocket.png / asteroid-grey.png / starter-pad-platform.png
    ".": (0, 0, 0, 0), "K": (36, 32, 42, 255), "D": (52, 54, 62, 255), "S": (90, 96, 108, 255),
    "M": (176, 180, 188, 255), "L": (188, 194, 206, 255), "W": (242, 238, 230, 255),
    "B": (48, 108, 198, 255), "b": (28, 70, 146, 255), "C": (110, 188, 220, 255),
    "O": (232, 140, 50, 255), "Y": (250, 214, 110, 255), "R": (210, 80, 40, 255),
    "N": (22, 30, 48, 255), "G": (153, 153, 161, 255), "H": (102, 102, 110, 255), "J": (204, 204, 212, 255),
    "g": (51, 51, 59, 255),
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

# ---- Gantry tower 20x84: white steel rails, lattice bays, blue cap and trim, orange beacon
def tower():
    t = Img(20, 84)
    for y in range(84):
        for x, c in ((0, "K"), (1, "W"), (2, "M"), (17, "M"), (18, "W"), (19, "K")): t.set(x, y, c)
    bay = 14
    for i in range(6):
        y0 = 4 + i * bay
        for k in range(bay):
            t.set(3 + k, y0 + k, "S"); t.set(16 - k, y0 + k, "S")      # X brace
            if k + 1 < bay: t.set(4 + k, y0 + k, "M"); t.set(15 - k, y0 + k, "M")
        t.rect(3, y0 + bay - 1, 16, y0 + bay - 1, "S")                  # strut
    t.rect(0, 0, 19, 3, "B"); t.rect(0, 3, 19, 3, "b"); t.rect(0, 0, 19, 0, "K")
    t.rect(8, 1, 11, 2, "O")
    for y in (27, 55):
        t.rect(1, y, 2, y + 2, "B"); t.rect(17, y, 18, y + 2, "B")
    t.rect(0, 83, 19, 83, "K"); t.rect(0, 80, 19, 82, "D")
    return t

def walkway(w):
    b = Img(w, 9)
    b.rect(0, 0, w - 1, 0, "B")
    for x in range(2, w, 6): b.set(x, 1, "M")
    b.rect(0, 1, w - 1, 1, "M") if False else None
    b.rect(0, 2, w - 1, 5, "W"); b.rect(0, 6, w - 1, 6, "S"); b.rect(0, 7, w - 1, 7, "K")
    b.rect(0, 8, w - 1, 8, "."); 
    for x in range(4, w, 8): b.set(x, 3, "M"); b.set(x, 4, "M")
    return b

def arm(left):
    a = Img(17, 5)
    a.rect(0, 0, 16, 1, "W"); a.rect(0, 2, 16, 2, "S"); a.rect(0, 3, 16, 3, "K")
    tip = (14, 16) if left else (0, 2)
    a.rect(tip[0], 0, tip[1], 3, "B"); a.set(tip[1] if left else tip[0], 1, "O")
    return a

def gantry_frame():
    f = Img(96, 84)
    f.paste(tower(), 0, 0); f.paste(tower(), 76, 0)
    for y in (4, 44): f.paste(walkway(56), 20, y)
    for y in (24, 62):
        f.paste(arm(True), 20, y); f.paste(arm(False), 59, y)
    return f

def pad_slab():
    w, h = 124, 20
    s = Img(w, h)
    s.rect(2, 0, w - 3, 2, "W"); s.rect(2, 3, w - 3, 3, "B")
    s.rect(0, 4, w - 1, 15, "L"); s.rect(0, 16, w - 1, 17, "S"); s.rect(2, 18, w - 3, 19, "D")
    for x in range(10, w - 6, 12): s.rect(x, 5, x, 14, "M")
    s.rect(0, 4, w - 1, 4, "W")
    for x in range(8, w - 8, 24): s.rect(x, 1, x + 5, 1, "M")   # painted pad marks
    s.rect(0, 4, 0, 15, "S"); s.rect(w - 1, 4, w - 1, 15, "S")
    s.outline()
    return s

def hangar():
    w, h = 72, 44
    s = Img(w, h)
    for y, (a, b) in {6: (12, 59), 7: (8, 63), 8: (6, 65), 9: (4, 67), 10: (3, 68), 11: (2, 69)}.items():
        s.rect(a, y, b, y, "W")
    s.rect(2, 12, 69, 43, "W")
    for x in range(10, 64, 8): s.rect(x, 8, x, 16, "M")          # roof panel seams
    s.rect(6, 17, 65, 17, "M")
    s.rect(2, 18, 69, 19, "B"); s.rect(2, 20, 69, 20, "b")
    s.rect(2, 41, 69, 43, "b")
    s.rect(14, 22, 57, 40, "B")                                     # door frame
    s.rect(15, 23, 56, 39, "N")
    for y in (27, 31, 35): s.rect(15, y, 56, y, "D")                # slats
    s.rect(15, 38, 56, 39, "C"); s.rect(24, 32, 30, 37, "S"); s.rect(40, 30, 46, 37, "S")  # lit bay, cradle shapes
    s.rect(14, 21, 57, 21, "O")
    s.rect(2, 36, 11, 40, "L"); s.rect(60, 36, 69, 40, "L")         # side panels
    s.rect(5, 38, 8, 38, "S"); s.rect(63, 38, 66, 38, "S")
    for x in (8, 63):                                               # antenna masts
        s.rect(x, 0, x, 6, "S"); s.set(x, 0, "O"); s.rect(x - 1, 1, x + 1, 1, "B")
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

FLAME = [
 ["..................",
  "..........RR......",
  "......RRRROOOO....",
  "..RRRROOOOYYYYWW..",
  "RRROOOOYYYYWWWWWW.",
  "..RRRROOOOYYYYWW..",
  "......RRRROOOO....",
  "..........RR......",
  ".................."],
 ["..................",
  "............RR....",
  "........RRROOO....",
  "....RROOOOYYYYWW..",
  "..RROOOOYYYYWWWWW.",
  "....RROOOOYYYYWW..",
  "........RRROOO....",
  "............RR....",
  ".................."],
 ["..................",
  "..........R.......",
  "....RRRRROOOO.....",
  "RRROOOOOYYYYYWWW..",
  "RROOOOYYYYYWWWWWWW",
  "RRRROOOOYYYYYWWW..",
  "....RRRRROOOO.....",
  "..........R.......",
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
        "pad-gantry-frame": gantry_frame(), "pad-slab-white": pad_slab(), "hangar-white": hangar(),
        "silo-cutaway": silo(), "asteroid-pixel": asteroid(),
        "flame-0": Img.grid(FLAME[0]), "flame-1": Img.grid(FLAME[1]), "flame-2": Img.grid(FLAME[2]),
        "stars-far": star_tile("stars-far"), "stars-mid": star_tile("stars-mid"), "stars-near": star_tile("stars-near"),
    }
    for n, im in parts.items(): im.save(os.path.join(KIT, n + ".png"))
    space_bands().save(os.path.join(KIT, "space-bands.png"))
    # full sheet: parts laid out on a 4px-gutter row grid
    order = ["pad-gantry-frame", "pad-slab-white", "hangar-white", "silo-cutaway", "asteroid-pixel", "flame-0", "flame-1", "flame-2"]
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

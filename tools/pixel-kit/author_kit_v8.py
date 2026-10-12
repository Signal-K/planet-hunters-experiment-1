#!/usr/bin/env python3
"""Hand-pixel authoring of base-kit-v8 parts (docs/STYLE.md). Every pixel is placed explicitly
from the kit palette: ASCII grids and explicit rects, no noise, no gradients, no antialiasing.
Writes the sliced parts to native/App/Resources/Art/base/kit and the full sheet to docs/art/base-kit-v8/sheet.png.
Run: python3 -I tools/pixel-kit/author_kit_v8.py"""
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KIT = os.path.join(ROOT, "native/App/Resources/Art/base/kit")
SHEET = os.path.join(ROOT, "docs/art/base-kit-v8")

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

# ---- base-kit-v8: underground cutaway, lift shaft, silo interior, empty dig site (art-reference.png lower half). No orange.
P.update({
    "r": (66, 48, 46, 255), "q": (88, 64, 58, 255), "p": (108, 80, 70, 255),      # warm brown-red soil (reference), no orange
    "n": (30, 36, 54, 255), "m": (46, 54, 76, 255), "t": (66, 76, 102, 255),      # cutaway wall navy
    "w": (250, 246, 232, 255),                                                    # lamp glow
})

def tile(rows):
    return Img.grid(rows)

def soil():
    t = Img(16, 16); t.rect(0, 0, 15, 15, "q")
    for x, y in ((2, 1), (9, 2), (13, 5), (5, 6), (11, 9), (1, 11), (7, 13), (14, 14), (4, 9)): t.set(x, y, "r")
    for x, y in ((6, 2), (1, 5), (12, 7), (8, 10), (3, 14), (14, 11), (10, 14)): t.set(x, y, "p")
    for x, y in ((4, 3), (10, 12)): t.rect(x, y, x + 1, y, "r")
    return t

def wall():
    t = Img(16, 16); t.rect(0, 0, 15, 15, "m")
    t.rect(0, 0, 15, 0, "n"); t.rect(0, 0, 0, 15, "n"); t.rect(0, 1, 15, 1, "t")
    t.rect(8, 8, 15, 8, "n"); t.rect(8, 9, 15, 9, "t"); t.rect(8, 8, 8, 15, "n")
    for x, y in ((3, 4), (12, 4), (3, 12), (12, 12)): t.set(x, y, "S")
    return t

def floor():
    t = Img(16, 8)
    t.rect(0, 0, 15, 0, "L"); t.rect(0, 1, 15, 1, "M"); t.rect(0, 2, 15, 6, "D"); t.rect(0, 7, 15, 7, "K")
    t.rect(0, 2, 0, 6, "K"); t.rect(8, 2, 8, 6, "S")
    for x in (3, 12): t.set(x, 4, "S")
    return t

def ceiling():
    t = Img(16, 6)
    t.rect(0, 0, 15, 0, "K"); t.rect(0, 1, 15, 3, "D"); t.rect(0, 4, 15, 4, "S"); t.rect(0, 5, 15, 5, "K")
    t.rect(7, 1, 8, 3, "S")
    return t

def shaft():
    t = Img(16, 16)
    for y in range(16):
        for x, c in ((0, "K"), (1, "S"), (2, "D"), (13, "D"), (14, "S"), (15, "K")): t.set(x, y, c)
        t.rect(3, y, 12, y, "N")
    for k in range(8):                                   # zigzag cross braces, tile loops every 16 rows
        t.set(3 + round(k * 9 / 7), k, "D"); t.set(12 - round(k * 9 / 7), 8 + k, "D")
    t.rect(7, 0, 8, 15, "S"); t.rect(7, 0, 7, 15, "M")   # cable
    t.rect(3, 0, 12, 0, "D"); t.rect(3, 8, 12, 8, "D")
    return t

def lift():
    c = Img(10, 18)
    c.rect(0, 0, 9, 17, "L"); c.rect(1, 3, 8, 12, "N"); c.rect(1, 3, 8, 3, "D")
    c.rect(2, 5, 7, 9, "B"); c.rect(2, 5, 3, 6, "C"); c.rect(0, 13, 9, 14, "D"); c.rect(0, 15, 9, 17, "S")
    c.rect(4, 0, 5, 1, "S"); c.rect(1, 1, 2, 1, "B"); c.rect(7, 1, 8, 1, "B"); c.rect(3, 16, 6, 16, "K")
    c.outline()
    return c

def hatch():
    h = Img(26, 16)
    h.rect(1, 4, 24, 15, "F"); h.rect(1, 4, 2, 15, "W"); h.rect(22, 4, 24, 15, "E")
    h.rect(0, 1, 25, 5, "b"); h.rect(1, 1, 24, 2, "B"); h.rect(0, 5, 25, 5, "K")
    h.rect(8, 8, 17, 15, "N"); h.rect(9, 9, 16, 15, "B"); h.rect(12, 9, 13, 15, "C")
    h.rect(4, 8, 5, 9, "C"); h.rect(20, 8, 21, 9, "C")
    h.rect(12, 0, 13, 0, "S"); h.set(12, 0, "B")
    h.outline()
    return h

def tank(w, hgt):
    t = Img(w, hgt)
    body0 = 14 if w > 34 else 10
    t.rect(1, body0, w - 2, hgt - 7, "F"); t.rect(1, body0, 3, hgt - 7, "W"); t.rect(w - 4, body0, w - 2, hgt - 7, "E")
    for i, ww in enumerate(range(w - 8, 3, -4) if False else ()): pass
    rows = [(w // 2 - 3 - 4 * i, 6 + 8 * i) for i in range(0)]
    for i in range(body0):                                            # domed cap
        half = round((w / 2 - 1) * (1 - ((body0 - 1 - i) / body0) ** 2) ** 0.5)
        x0, x1 = w // 2 - half, w // 2 + half - 1
        t.rect(x0, i, x1, i, "B"); t.set(x0, i, "C"); t.set(x1, i, "b")
    for y in (body0 + 3, body0 + 4, hgt - 14, hgt - 13): t.rect(1, y, w - 2, y, "B" if y % 2 else "b")
    t.rect(w // 2 - 4, body0 + 8, w // 2 + 3, body0 + 8 + 9, "N"); t.rect(w // 2 - 3, body0 + 9, w // 2 + 2, body0 + 16, "B"); t.rect(w // 2 - 3, body0 + 9, w // 2 - 2, body0 + 10, "C")
    t.rect(2, hgt - 6, w - 3, hgt - 1, "D"); t.rect(2, hgt - 6, w - 3, hgt - 6, "S")
    t.rect(w // 2, 0, w // 2, 0, "S")
    t.outline()
    return t

def crate():
    c = Img(16, 8)
    c.rect(0, 0, 15, 7, "D"); c.rect(0, 0, 15, 0, "S"); c.rect(1, 1, 14, 6, "N"); c.rect(0, 7, 15, 7, "K")
    c.rect(0, 0, 0, 7, "S"); c.rect(15, 0, 15, 7, "K")
    return c

def ore(frame):
    o = Img(16, 8)
    rocks = ((2, 5, 5, 6), (5, 3, 9, 6), (9, 4, 13, 6), (7, 1, 11, 3), (3, 2, 6, 4))
    for x0, y0, x1, y1 in rocks:
        o.rect(x0, y0, x1, y1, "G"); o.rect(x0, y0, x1, y0, "J"); o.rect(x0, y1, x1, y1, "H")
    o.rect(1, 6, 14, 6, "H")
    glints = ((7, 2), (11, 5), (4, 3)) if frame == 0 else ((8, 4), (3, 5), (10, 2))
    for x, y in glints: o.set(x, y, "C")
    o.set(*glints[0], "W")
    return o

def console(frame):
    c = Img(36, 28)
    c.rect(2, 12, 33, 27, "D"); c.rect(2, 12, 33, 12, "S"); c.rect(2, 27, 33, 27, "K"); c.rect(2, 12, 2, 27, "K"); c.rect(33, 12, 33, 27, "K")
    c.rect(5, 0, 30, 11, "K"); c.rect(6, 1, 29, 10, "N"); c.rect(7, 2, 28, 9, "b")
    for i, y in enumerate(range(3, 9, 2)):
        ln = 6 + ((i + frame * 2) % 3) * 5
        c.rect(9, y, 9 + ln, y, "C")
    c.rect(5, 14, 30, 16, "S"); c.rect(5, 14, 30, 14, "L")
    for x in range(7, 30, 4): c.rect(x, 19, x + 1, 20, "B" if (x // 4 + frame) % 2 else "C")
    c.rect(8, 22, 26, 24, "N")
    c.outline()
    return c

def pipe():
    t = Img(16, 6)
    t.rect(0, 0, 15, 0, "D"); t.rect(0, 1, 15, 1, "L"); t.rect(0, 2, 15, 3, "S"); t.rect(0, 4, 15, 4, "D"); t.rect(0, 5, 15, 5, "K")
    t.rect(7, 0, 8, 5, "B"); t.rect(7, 0, 7, 5, "C")
    return t

def lamp(frame):
    l = Img(9, 12)
    l.rect(4, 0, 4, 3, "S"); l.rect(2, 4, 6, 6, "D"); l.rect(2, 4, 6, 4, "S"); l.rect(3, 7, 5, 8, "Y")
    if frame: 
        l.rect(2, 7, 6, 9, "Y"); l.rect(3, 9, 5, 10, "w"); l.set(1, 8, "F"); l.set(7, 8, "F")
    else: l.rect(3, 9, 5, 9, "Y")
    return l

def cavity():
    t = Img(16, 16); t.rect(0, 0, 15, 15, "r")
    for x, y in ((3, 2), (11, 4), (6, 8), (13, 11), (2, 13), (9, 14)): t.set(x, y, "d")
    for x, y in ((8, 1), (1, 7), (12, 9), (5, 12)): t.set(x, y, "q")
    return t

def rim():
    t = Img(16, 4)
    t.rect(0, 0, 15, 0, "K"); t.rect(0, 1, 15, 1, "d"); t.rect(0, 2, 15, 2, "r"); t.rect(0, 3, 15, 3, "r")
    for x in (3, 4, 10): t.set(x, 1, "p")
    return t

def prop():
    t = Img(8, 56)
    t.rect(1, 0, 6, 55, "D"); t.rect(1, 0, 1, 55, "S"); t.rect(6, 0, 6, 55, "K")
    t.rect(0, 0, 7, 3, "S"); t.rect(0, 0, 7, 0, "L"); t.rect(0, 3, 7, 3, "K")
    t.rect(0, 52, 7, 55, "S"); t.rect(0, 55, 7, 55, "K")
    for y in (14, 28, 42): t.rect(2, y, 5, y, "K"); t.set(3, y + 1, "B")
    return t

def drill(frame):
    d = Img(26, 26)
    d.rect(2, 22, 23, 25, "D"); d.rect(2, 22, 23, 22, "S"); d.rect(2, 25, 23, 25, "K")
    d.rect(10, 6, 15, 21, "L"); d.rect(10, 6, 10, 21, "W"); d.rect(15, 6, 15, 21, "S")
    d.rect(8, 4, 17, 7, "D"); d.rect(8, 4, 17, 4, "S")
    d.rect(11, 9, 14, 11, "B"); d.rect(11, 9, 12, 9, "C")
    d.rect(12, 21, 13, 24, "S")
    for i in range(4): d.set(12 + (i + frame) % 2, 22 + i - 0, "M")
    d.set(12, 2, "S"); d.rect(12, 3, 13, 3, "S"); d.set(13 if frame else 12, 1, "B")
    d.rect(3, 18, 7, 21, "D"); d.rect(18, 18, 22, 21, "D"); d.set(4, 18, "S"); d.set(19, 18, "S")
    d.outline()
    return d

def sign():
    s = Img(18, 22)
    s.rect(8, 8, 9, 21, "D"); s.rect(8, 8, 8, 21, "S")
    s.rect(1, 0, 16, 9, "W"); s.rect(0, 1, 17, 8, "W")
    for i in range(0, 18, 4):
        for k in range(8):
            s.set(i + k - 2, 1 + k, "B") if 0 <= i + k - 2 < 18 else None
    s.rect(2, 3, 15, 6, "N"); s.rect(4, 4, 13, 5, "C")
    s.outline()
    return s

def mound():
    m = Img(30, 9)
    for y in range(9):
        half = round(14.5 * (1 - ((8 - y) / 9) ** 1.5)) if y < 8 else 14
        half = max(2, min(14, 2 + y * 2))
        m.rect(15 - half, y, 14 + half, y, "q")
        m.set(15 - half, y, "p"); m.set(14 + half, y, "r")
    for x, y in ((8, 5), (20, 6), (14, 3), (11, 7)): m.set(x, y, "r")
    for x, y in ((12, 2), (22, 7)): m.set(x, y, "p")
    m.outline("r")
    return m

def main():
    os.makedirs(SHEET, exist_ok=True)
    parts = {
        "ug-soil": soil(), "ug-wall": wall(), "ug-floor": floor(), "ug-ceiling": ceiling(), "ug-shaft": shaft(),
        "ug-lift": lift(), "ug-hatch": hatch(), "ug-tank-big": tank(40, 56), "ug-tank-small": tank(30, 44),
        "ug-crate": crate(), "ug-ore-0": ore(0), "ug-ore-1": ore(1), "ug-console-0": console(0), "ug-console-1": console(1),
        "ug-pipe": pipe(), "ug-lamp-0": lamp(0), "ug-lamp-1": lamp(1),
        "ug-cavity": cavity(), "ug-rim": rim(), "ug-prop": prop(), "ug-drill-0": drill(0), "ug-drill-1": drill(1),
        "ug-sign": sign(), "ug-mound": mound(),
    }
    for n, im in parts.items(): im.save(os.path.join(KIT, n + ".png"))
    order = list(parts)
    cols, gut = 6, 4
    cw = max(p.w for p in parts.values()) + gut
    rows = [order[i:i + cols] for i in range(0, len(order), cols)]
    rh = [max(parts[n].h for n in r) + gut for r in rows]
    sheet = Img(cols * cw + gut, sum(rh) + gut)
    y = gut
    for r, h in zip(rows, rh):
        for i, n in enumerate(r): sheet.paste(parts[n], gut + i * cw, y)
        y += h
    sheet.save(os.path.join(SHEET, "sheet.png"))
    open(os.path.join(SHEET, "README.md"), "w").write(
        "# base-kit-v8\n\nUnderground cutaway, lift shaft, silo interior and empty dig site. Generated by `tools/pixel-kit/author_kit_v8.py`. "
        "`sheet.png` is the full sheet; sliced parts live in `native/App/Resources/Art/base/kit/`: " + ", ".join(sorted(parts)) + ".\n")

main()

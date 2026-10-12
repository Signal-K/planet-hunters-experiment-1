#!/usr/bin/env python3
"""Hand-pixel authoring of the side-on laser scene kit (docs/STYLE.md). Same palette and Img helpers as base-kit-v8.
Neutral-grey parts (soil, crust, ridges, disc, star, mote) are tinted per world by LaserPalette at runtime; coloured parts
(ship, flame, beam, spark, deposit) are final. No orange. Writes slices to native/App/Resources/Art/laser and the sheet to docs/art/laser-kit-v9.
Run: python3 -I tools/pixel-kit/author_laser_v9.py"""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import author_kit_v8 as kit
from author_kit_v8 import Img, P, ROOT

OUT = os.path.join(ROOT, "native/App/Resources/Art/laser")
SHEET = os.path.join(ROOT, "docs/art/laser-kit-v9")
P.update({"1": (222, 222, 222, 255), "2": (186, 186, 186, 255), "3": (144, 144, 144, 255), "4": (104, 104, 104, 255), "5": (70, 70, 70, 255)})

def ship():
    s = Img(40, 18)
    s.rect(6, 4, 33, 13, "F"); s.rect(6, 4, 33, 4, "W"); s.rect(6, 13, 33, 13, "E")
    for x, (y0, y1) in zip(range(34, 39), ((5, 12), (6, 11), (7, 10), (8, 9), (8, 9))): s.rect(x, y0, x, y1, "F")
    s.rect(34, 5, 35, 5, "W")
    s.rect(2, 6, 5, 11, "D"); s.rect(2, 6, 5, 6, "S"); s.rect(0, 7, 1, 10, "S")
    s.rect(8, 9, 30, 10, "B"); s.rect(8, 10, 30, 10, "b")
    s.rect(23, 5, 31, 8, "b"); s.rect(24, 5, 30, 7, "C"); s.rect(24, 5, 26, 5, "W")
    s.rect(8, 3, 16, 3, "B"); s.rect(9, 2, 14, 2, "B"); s.rect(10, 1, 12, 1, "b")
    s.rect(14, 14, 15, 16, "D"); s.rect(26, 14, 27, 16, "D"); s.rect(12, 16, 17, 16, "S"); s.rect(24, 16, 29, 16, "S")
    s.outline()
    return s

def flame(frame):
    rows = ["..BBCCWWWWW.", ".BBCCCWWWWWW", "BBCCCWWWWWWW", "BBCCCWWWWWWW", ".BBCCCWWWWWW", "..BBCCWWWWW."]
    if frame == 1: rows = ["....BCWWWW..", "...BBCCWWWWW", "..BBCCWWWWWW", "..BBCCWWWWWW", "...BBCCWWWWW", "....BCWWWW.."]
    return Img.grid(rows)

def beam():
    b = Img(6, 8)
    b.rect(0, 0, 5, 7, "b"); b.rect(1, 0, 4, 7, "B"); b.rect(2, 0, 3, 7, "C")
    for y in (1, 5): b.rect(2, y, 3, y + 1, "W")
    return b

def spark(frame):
    s = Img(13, 13)
    r = 6 if frame == 0 else 4
    for i in range(-r, r + 1):
        c = "W" if abs(i) <= 1 else ("C" if abs(i) <= r - 2 else "B")
        s.set(6 + i, 6, c); s.set(6, 6 + i, c)
    s.rect(5, 5, 7, 7, "W")
    for dx, dy in ((-2, -2), (2, -2), (-2, 2), (2, 2)): s.set(6 + dx, 6 + dy, "C")
    return s

def deposit(frame):
    d = Img(22, 14)
    d.rect(2, 2, 19, 12, "D")
    for x, y in ((2, 2), (19, 2), (2, 12), (19, 12), (3, 1), (18, 1), (3, 13), (18, 13)): d.set(x, y, "D" if y in (1, 13) else ".")
    d.rect(4, 1, 17, 1, "D"); d.rect(4, 13, 17, 13, "D")
    d.set(2, 2, "."); d.set(19, 2, "."); d.set(2, 12, "."); d.set(19, 12, ".")
    for x, y in ((4, 3), (15, 4), (6, 11), (17, 10), (10, 2)): d.set(x, y, "S")
    for x0, y0, x1, y1 in ((5, 6, 9, 10), (8, 4, 13, 9), (12, 6, 16, 10), (9, 8, 14, 11)):
        d.rect(x0, y0, x1, y1, "G"); d.rect(x0, y0, x1, y0, "J"); d.rect(x0, y1, x1, y1, "H")
    glints = ((10, 5), (14, 7), (6, 7)) if frame == 0 else ((11, 6), (7, 8), (13, 9))
    for x, y in glints: d.set(x, y, "C")
    d.set(*glints[0], "W")
    return d

def soil():
    t = Img(32, 32); t.rect(0, 0, 31, 31, "3")
    for x, y in ((3, 2), (14, 5), (25, 3), (8, 11), (20, 14), (29, 10), (5, 19), (17, 22), (27, 26), (11, 28), (2, 27), (23, 20)): t.rect(x, y, x + 1, y, "4")
    for x, y in ((9, 3), (22, 8), (1, 14), (13, 16), (28, 18), (6, 24), (19, 27), (30, 30), (15, 11)): t.set(x, y, "2")
    for x, y in ((5, 6), (24, 13), (12, 21), (29, 23), (18, 2)): t.set(x, y, "5")
    return t

def crust():
    t = Img(32, 8)
    t.rect(0, 0, 31, 0, "1"); t.rect(0, 1, 31, 1, "2"); t.rect(0, 2, 31, 7, "3")
    for x in (3, 4, 13, 21, 22, 28): t.set(x, 0, "2")
    for x, y in ((6, 3), (17, 4), (25, 3), (10, 6), (29, 6)): t.rect(x, y, x + 1, y, "4")
    t.rect(0, 7, 31, 7, "4")
    return t

def ridge(kind):
    w, h = 128, 32
    t = Img(w, h)
    for x in range(w):
        a = 2 * math.pi * x / w
        if kind == "dunes": top = 12 + round(8 * math.sin(a * 2) + 4 * math.sin(a * 3 + 1))
        elif kind == "ice": top = 8 + round(abs(((x * 3) % 32) - 16) * 1.1) + round(6 * math.sin(a * 2))
        else: top = 10 + round(5 * math.sin(a * 3) + 4 * math.sin(a * 5 + 2)) // 2 * 2
        t.rect(x, h - max(2, min(h - 1, top)), x, h - 1, "1")
    return t

def disc(d):
    t = Img(d, d)
    r = d / 2
    for y in range(d):
        for x in range(d):
            if (x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2 <= r * r: t.set(x, y, "1")
    return t

def star():
    s = Img(3, 3); s.rect(1, 0, 1, 2, "1"); s.rect(0, 1, 2, 1, "1")
    return s

def mote():
    m = Img(2, 2); m.rect(0, 0, 1, 1, "1")
    return m

def main():
    os.makedirs(OUT, exist_ok=True); os.makedirs(SHEET, exist_ok=True)
    parts = {
        "ship": ship(), "flame-0": flame(0), "flame-1": flame(1), "beam": beam(), "spark-0": spark(0), "spark-1": spark(1),
        "deposit-0": deposit(0), "deposit-1": deposit(1), "soil": soil(), "crust": crust(),
        "ridge-rubble": ridge("rubble"), "ridge-dunes": ridge("dunes"), "ridge-ice": ridge("ice"),
        "disc-48": disc(48), "disc-24": disc(24), "star": star(), "mote": mote(),
    }
    for n, im in parts.items(): im.save(os.path.join(OUT, n + ".png"))
    gut = 4
    sheet = Img(300, 190)
    x = y = gut; rowh = 0
    for n, im in parts.items():
        if x + im.w + gut > sheet.w: x = gut; y += rowh + gut; rowh = 0
        sheet.paste(im, x, y); x += im.w + gut; rowh = max(rowh, im.h)
    sheet.save(os.path.join(SHEET, "sheet.png"))
    open(os.path.join(SHEET, "README.md"), "w").write("# laser-kit-v9\n\nSide-on laser scene parts, generated by `tools/pixel-kit/author_laser_v9.py`. Slices in `native/App/Resources/Art/laser/`: " + ", ".join(parts) + ".\n")

if __name__ == "__main__":
    main()

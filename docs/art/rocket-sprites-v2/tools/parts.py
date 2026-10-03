"""v2 customizer parts: cut from gen/parts-a.jpg + parts-b.jpg, framed in a chalky icon tile (192) and detail room (288)."""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from key import halo_count, neutralize
V2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PD = os.path.join(V2, 'parts'); PSRC = os.path.join(V2, 'src', 'parts')
SS = 2
A_BOX = [(313,47,431,218), (581,23,692,234), (860,24,923,232), (305,277,436,434), (585,255,687,443), (857,260,925,448), (313,471,422,676), (587,471,682,690), (855,476,927,688)]
B_BOX = [(214,34,390,223), (530,61,735,209), (866,62,1061,211), (220,251,377,426), (539,257,719,427), (857,259,1075,432), (227,455,370,669), (518,467,742,678)]
PARTS = [('pulse-thruster-t1', 'Pulse Thruster'), ('vulcan-booster-t1', 'Vulcan Booster'), ('strap-booster-t1', 'Strap Booster'),
         ('cockpit-command-t1', 'Command Cockpit'), ('guidance-cockpit-t1', 'Guidance Cockpit'), ('mining-payload-t1', 'Mining Payload'),
         ('kerosene-stage-t1', 'Kerosene Stage'), ('lox-lh2-stage-t1', 'LOX/LH2 Stage'), ('standard-fairing-t1', 'Standard Fairing'),
         ('heavy-fairing-t1', 'Heavy Fairing'), ('standard-port-t1', 'Standard Port'), ('magnetic-port-t1', 'Magnetic Port'),
         ('ablative-shield-t1', 'Ablative Shield'), ('ceramic-shield-t1', 'Ceramic Shield'), ('crew-transport-t2', 'Crew Transport II'),
         ('crew-transport-t5', 'Crew Transport V'), ('lander-module-t1', 'Lander Module')]
INK = (14, 20, 28, 255)

def cuts():
    KA = Image.open(os.path.join(V2, 'cut', 'parts-a_keyed.png')); KB = Image.open(os.path.join(V2, 'cut', 'parts-b_keyed.png'))
    GA = Image.open(os.path.join(V2, 'gen', 'parts-a.jpg')).convert('RGB'); GB = Image.open(os.path.join(V2, 'gen', 'parts-b.jpg')).convert('RGB')
    out = []
    for i, (pid, name) in enumerate(PARTS):
        K, G, b = (KA, GA, A_BOX[i]) if i < 9 else (KB, GB, B_BOX[i - 9])
        m = 6; bb = (b[0] - m, b[1] - m, b[2] + m, b[3] + m)
        im = K.crop(bb); a = np.asarray(im)[..., 3]
        ys, xs = np.where(a > 8); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        G.crop(bb).save(os.path.join(PSRC, f'{pid}_green.png')); im.save(os.path.join(PSRC, f'{pid}_cut.png'))
        out.append((pid, name, im))
    return out

# ---------------- chalky painting helpers ----------------
def noise_field(w, h, cell, seed):
    r = np.random.RandomState(seed).rand(max(2, h // cell + 2), max(2, w // cell + 2)).astype(np.float32)
    return np.asarray(Image.fromarray((r * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(np.float32) / 255 - 0.5

def paint(w, h, top, bot, seed, blot=10, grain=7, axis='y'):
    """Vertical (or horizontal) painted gradient with soft blotches + fine grain."""
    t = np.linspace(0, 1, h if axis == 'y' else w, dtype=np.float32)
    t = t[:, None] if axis == 'y' else t[None, :]
    a = np.zeros((h, w, 3), np.float32)
    for c in range(3): a[..., c] = top[c] + (bot[c] - top[c]) * t
    a += (noise_field(w, h, 18, seed) * blot + noise_field(w, h, 5, seed + 1) * blot * 0.5)[..., None]
    a += np.random.RandomState(seed + 2).randint(-grain, grain + 1, (h, w))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA')

def fill_poly(canvas, pts, tex):
    m = Image.new('L', canvas.size, 0); ImageDraw.Draw(m).polygon([(x * SS, y * SS) for x, y in pts], fill=255)
    canvas.paste(tex.resize(canvas.size) if tex.size != canvas.size else tex, (0, 0), m)

def ink(canvas, pts, w=4, closed=True):
    d = ImageDraw.Draw(canvas); P = [(x * SS, y * SS) for x, y in pts] + ([(pts[0][0] * SS, pts[0][1] * SS)] if closed else [])
    d.line(P, fill=INK, width=w * SS, joint='curve')
    for x, y in P: d.ellipse([x - w * SS / 2, y - w * SS / 2, x + w * SS / 2, y + w * SS / 2], fill=INK)

def soft(canvas, pts, color, blur, alpha=255, mode='ell'):
    L = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    P = [(x * SS, y * SS) for x, y in pts]
    if mode == 'ell': d.ellipse(P, fill=color[:3] + (alpha,))
    else: d.polygon(P, fill=color[:3] + (alpha,))
    canvas.alpha_composite(L.filter(ImageFilter.GaussianBlur(blur * SS)))

def finish(canvas, size):
    im = canvas.resize((size, size), Image.LANCZOS)
    a = np.array(im).astype(np.int16); n = np.random.RandomState(size).randint(-4, 5, a.shape[:2])
    for c in range(3): a[..., c] = np.clip(a[..., c] + n, 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

# ---------------- frames ----------------
def tile():
    N = 192 * SS; C = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    m = Image.new('L', (N, N), 0); ImageDraw.Draw(m).rounded_rectangle([7 * SS, 7 * SS, 185 * SS, 185 * SS], 18 * SS, fill=255)
    C.paste(paint(N, N, (52, 66, 80), (30, 40, 52), 41, blot=9, grain=6), (0, 0), m)
    hi = Image.new('RGBA', (N, N), (0, 0, 0, 0)); ImageDraw.Draw(hi).rounded_rectangle([18 * SS, 14 * SS, 174 * SS, 40 * SS], 12 * SS, fill=(150, 180, 200, 40))
    C.alpha_composite(hi.filter(ImageFilter.GaussianBlur(6 * SS)))
    soft(C, [(46, 154), (146, 178)], (8, 12, 18), 6, 150)                     # contact shadow
    ImageDraw.Draw(C).rounded_rectangle([7 * SS, 7 * SS, 185 * SS, 185 * SS], 18 * SS, outline=INK, width=5 * SS)
    return C

ROOM_SKY = None
def room():
    N = 288 * SS; C = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    back = [(80, 21), (273, 45), (273, 175), (82, 148)]
    left = [(18, 84), (80, 21), (82, 148), (18, 213)]
    floor = [(82, 148), (273, 175), (210, 240), (18, 213)]
    lip_f = [(18, 213), (210, 240), (210, 250), (18, 223)]
    lip_r = [(210, 240), (273, 175), (273, 185), (210, 250)]
    fill_poly(C, back, paint(N, N, (66, 84, 100), (88, 106, 120), 51))
    fill_poly(C, left, paint(N, N, (40, 54, 68), (56, 70, 84), 52))
    fill_poly(C, floor, paint(N, N, (98, 112, 122), (128, 140, 148), 53, blot=12))
    fill_poly(C, lip_f, paint(N, N, (40, 50, 60), (40, 50, 60), 54)); fill_poly(C, lip_r, paint(N, N, (30, 38, 48), (30, 38, 48), 55))
    # window: painted daytime sky + pale peaks like the game backdrop
    sl = 24 / 193; x0, x1 = 98, 254
    t0, t1 = 21 + (x0 - 80) * sl + 18, 21 + (x1 - 80) * sl + 18
    win = [(x0, t0), (x1, t1), (x1, t1 + 72), (x0, t0 + 72)]
    fill_poly(C, win, paint(N, N, (110, 160, 205), (196, 222, 236), 56, blot=6, grain=4))
    W = Image.new('RGBA', (N, N), (0, 0, 0, 0)); d = ImageDraw.Draw(W)
    def S(p): return [(x * SS, y * SS) for x, y in p]
    def wy(x): return t0 + (x - x0) * sl
    d.polygon(S([(x0, wy(x0) + 72), (x0 + 10, wy(x0) + 50), (x0 + 30, wy(x0) + 28), (x0 + 46, wy(x0) + 46), (x0 + 64, wy(x0) + 22), (x0 + 82, wy(x0) + 44),
                 (x0 + 104, wy(x0) + 30), (x0 + 126, wy(x0) + 50), (x1 - 12, wy(x1) + 36), (x1, wy(x1) + 48), (x1, wy(x1) + 72)]), fill=(124, 146, 168, 255))
    d.polygon(S([(x0 + 22, wy(x0) + 38), (x0 + 30, wy(x0) + 28), (x0 + 38, wy(x0) + 38)]), fill=(236, 242, 246, 255))
    d.polygon(S([(x0 + 56, wy(x0) + 30), (x0 + 64, wy(x0) + 22), (x0 + 72, wy(x0) + 32)]), fill=(236, 242, 246, 255))
    d.polygon(S([(x0, wy(x0) + 72), (x0, wy(x0) + 62), (x0 + 40, wy(x0) + 54), (x0 + 90, wy(x0) + 60), (x1, wy(x1) + 58), (x1, wy(x1) + 72)]), fill=(92, 112, 132, 255))
    d.ellipse(S([(x0 + 92, wy(x0) + 4), (x0 + 128, wy(x0) + 16)]), fill=(246, 249, 252, 230))
    d.ellipse(S([(x0 + 108, wy(x0) + 0), (x0 + 132, wy(x0) + 14)]), fill=(246, 249, 252, 230))
    m = Image.new('L', (N, N), 0); ImageDraw.Draw(m).polygon(S(win), fill=255)
    W.putalpha(Image.fromarray(np.minimum(np.asarray(W)[..., 3], np.asarray(m))))
    C.alpha_composite(W)
    # mullion + frame
    mx = (x0 + x1) / 2; ink(C, [(mx, wy(mx)), (mx, wy(mx) + 72)], 4, closed=False)
    ink(C, win, 5)
    # soft painted occlusion in the corners / along the floor seam
    soft(C, [(82, 148), (273, 175), (273, 186), (82, 160)], (10, 14, 20), 5, 110, mode='poly')
    soft(C, [(80, 21), (88, 22), (90, 150), (82, 152)], (10, 14, 20), 5, 110, mode='poly')
    soft(C, [(18, 207), (82, 146), (90, 152), (26, 214)], (10, 14, 20), 4, 90, mode='poly')
    # cyan wall light strip with soft glow
    soft(C, [(58, 56), (74, 168)], (112, 217, 234), 7, 90)
    fill_poly(C, [(62, 64), (70, 56), (70, 154), (62, 162)], paint(N, N, (150, 228, 240), (112, 217, 234), 57, blot=6, grain=4))
    fill_poly(C, [(62, 64), (65, 61), (65, 159), (62, 162)], paint(N, N, (220, 246, 250), (200, 240, 246), 58, blot=4, grain=3))
    ink(C, [(62, 64), (70, 56), (70, 154), (62, 162)], 3)
    # top rim highlight (matte)
    fill_poly(C, [(80, 18), (273, 42), (273, 47), (80, 23)], paint(N, N, (130, 170, 182), (130, 170, 182), 59, blot=6))
    fill_poly(C, [(18, 81), (80, 18), (80, 23), (18, 86)], paint(N, N, (100, 140, 154), (100, 140, 154), 60, blot=6))
    # thick outlines
    for p in (back, left, floor): ink(C, p, 4)
    ink(C, [(18, 81), (80, 18), (273, 42), (273, 185), (210, 250), (18, 223)], 5)
    # floor pad: soft cyan glow ring + contact shadow
    soft(C, [(104, 186), (196, 212)], (112, 217, 234), 5, 80)
    soft(C, [(116, 190), (184, 208)], (163, 236, 245), 3, 90)
    soft(C, [(118, 192), (182, 206)], (10, 14, 20), 4, 150)
    return C

def place(base, obj, size, cx, bottom, maxw, maxh):
    s = min(maxw / obj.width, maxh / obj.height)
    o = obj.convert('RGBa').resize((max(1, round(obj.width * s * SS)), max(1, round(obj.height * s * SS))), Image.LANCZOS).convert('RGBA')
    base.alpha_composite(o, (int(cx * SS - o.width / 2), int(bottom * SS - o.height)))

def despill(im):
    a = np.array(im).astype(np.int16); a[a[..., 3] < 3] = 0
    a[..., 1] = np.minimum(a[..., 1], np.maximum(a[..., 0], a[..., 2]) + 3)
    return neutralize(Image.fromarray(a.astype(np.uint8), 'RGBA'))

if __name__ == '__main__':
    os.makedirs(PD, exist_ok=True)
    T = tile(); R = room()
    for pid, name, obj in cuts():
        ic = T.copy(); place(ic, obj, 192, 96, 168, 138, 142); ic = despill(finish(ic, 192))
        de = R.copy(); place(de, obj, 288, 150, 201, 150, 168); de = despill(finish(de, 288))
        ic.save(os.path.join(PD, f'{pid}_icon.png'), optimize=True); de.save(os.path.join(PD, f'{pid}.png'), optimize=True)
        print(pid, obj.size, 'halo', halo_count(ic), halo_count(de))

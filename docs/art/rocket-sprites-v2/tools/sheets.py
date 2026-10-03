"""v2 launch-stack sheets with real animations (24 fps), Pixi Spritesheet-compatible JSON."""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageOps, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from pieces import CFG, booster, core, upper, resize
import fxcut
from key import halo_count, neutralize
V2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 24
RNG = np.random.RandomState(5)

# ---------------- image helpers ----------------
def with_alpha(im, a):
    if a >= 0.999: return im
    im = im.copy(); im.putalpha(im.split()[3].point(lambda v: int(v * max(0.0, a)))); return im

def scale_wh(im, w, h):
    return im.convert('RGBa').resize((max(1, int(round(w))), max(1, int(round(h)))), Image.LANCZOS).convert('RGBA')

def scale_w(im, w):
    return scale_wh(im, w, im.height * w / im.width)

def rotate(im, deg):
    return im.rotate(deg, resample=Image.BICUBIC, expand=True)

def grain(im, amt=7, seed=0):
    a = np.array(im).astype(np.int16)
    n = np.random.RandomState(seed).randint(-amt, amt + 1, a.shape[:2])
    for c in range(3): a[..., c] = np.clip(a[..., c] + n, 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

_NOISE = {}
def dissolve(im, keep, seed=0):
    """Chunky dissolve instead of an alpha fade (smoke stays white instead of going grey)."""
    if keep >= 0.999: return im
    key = (im.size, seed)
    if key not in _NOISE:
        n = np.random.RandomState(seed).rand(im.height, im.width).astype(np.float32)
        n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(2, im.width / 40)))).astype(np.float32)
        n = (np.argsort(np.argsort(n.ravel())).reshape(n.shape) / float(n.size - 1)).astype(np.float32)   # uniform ranks
        _NOISE[key] = n
    n = _NOISE[key]
    thr = 1 - keep
    m = np.clip((n - thr) / 0.08, 0, 1)
    a = np.array(im); a[..., 3] = (a[..., 3] * m).astype(np.uint8)
    return Image.fromarray(a)

def paste_d(canvas, im, cx, cy, keep=1.0, seed=0):
    if keep <= 0.01: return
    im = dissolve(im, keep, seed)
    canvas.alpha_composite(im, (int(round(cx - im.width / 2)), int(round(cy - im.height / 2))))

def paste_c(canvas, im, cx, cy, alpha=1.0):
    """paste centred at (cx, cy)"""
    if alpha <= 0.01: return
    canvas.alpha_composite(with_alpha(im, alpha), (int(round(cx - im.width / 2)), int(round(cy - im.height / 2))))

def paste_top(canvas, im, cx, ty, alpha=1.0):
    if alpha <= 0.01: return
    canvas.alpha_composite(with_alpha(im, alpha), (int(round(cx - im.width / 2)), int(round(ty))))

def warp_rows(im, phase, amp):
    a = np.array(im); h = a.shape[0]; out = np.zeros_like(a)
    for y in range(h):
        d = amp * (y / h) ** 1.2 * math.sin(2 * math.pi * (y / (h * 0.55)) - phase)
        s = int(round(d)); out[y] = np.roll(a[y], s, axis=0)
        if s > 0: out[y, :s] = 0
        elif s < 0: out[y, s:] = 0
    return Image.fromarray(out)

# ---------------- fx sources ----------------
PLUMES = [fxcut.plume(i) for i in range(5)]
SMOKES = [fxcut.smoke(i) for i in range(5)]
FLASH = fxcut.other('flash'); DEBRIS = fxcut.other('debris'); PUFF = fxcut.other('puff'); CLAMP = fxcut.other('clamp')

def plume_img(exit_w, length, shape=4.0, phase=0.0, amp=2.5, seed=0):
    """Plume scaled so its top width matches the nozzle exit; shape is a float index into the 5 drawn sizes."""
    k0 = int(math.floor(shape)); k1 = min(4, k0 + 1); t = shape - k0
    def one(k):
        im, w0 = PLUMES[k]
        sx = exit_w * 1.06 / w0
        return scale_wh(im, im.width * sx, max(4, length))
    a = one(k0)
    if t > 0.02 and k1 != k0:
        b = one(k1); W = max(a.width, b.width); H = max(a.height, b.height)
        A = Image.new('RGBA', (W, H)); A.alpha_composite(a, ((W - a.width) // 2, 0))
        B = Image.new('RGBA', (W, H)); B.alpha_composite(b, ((W - b.width) // 2, 0))
        a = Image.blend(A, B, t)
    if amp > 0:
        a = warp_rows(a, phase, amp)
    a = grain(a, 6, seed)
    # soft glow under the flame (white-cyan, keeps it reading on the dark sky)
    g = a.split()[3].filter(ImageFilter.GaussianBlur(max(3, exit_w * 0.18)))
    pad = int(exit_w * 0.4)
    G = Image.new('RGBA', (a.width + 2 * pad, a.height + pad), (112, 217, 234, 0))
    ga = Image.new('L', G.size, 0); ga.paste(g, (pad, 0)); G.putalpha(ga.point(lambda v: int(v * 0.45)))
    G.alpha_composite(a, (pad, 0))
    return G

def smooth(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)

# ---------------- row definitions ----------------
GEOM = {  # canvas (sourceSize) and anchor per row
    'booster': dict(W=240, H=620, ax=120, ay=410),
    'lower-stage': dict(W=300, H=680, ax=150, ay=410),
    'upper-stage': dict(W=260, H=600, ax=130, ay=230),
}
PL = {  # exit widths / plume lengths in sheet px
    'explorer': dict(b_exit=40, b_len=150, c_exit=46, c_len=222, u_exit=36, u_len=205),
    'prospector': dict(b_exit=43, b_len=160, c_exit=50, c_len=230, u_exit=42, u_len=215),
}
IGN_E = [0.08, 0.18, 0.31, 0.46, 0.61, 0.75, 0.87, 0.96]

class Pieces:
    def __init__(self, model):
        self.m = model
        self.b = booster(model)
        self.c_cut, _ = core(model, cut_ring=True)
        self.c_full, _ = core(model, cut_ring=False)
        self.u = upper(model, nozzle=False)
        self.un = upper(model, nozzle=True)
        bx = CFG[model]['booster']
        sy = self.b.im.height / (bx['box'][3] - bx['box'][1])
        # clamp pod on the booster's inner side: rows ~250..385 of the source crop
        top, bot = (250, 385) if model == 'explorer' else (270, 410)
        self.pod = ((bx['box'][2] - bx['box'][0] - bx['cx']) * bx['sx'] - 4,
                    (top - (bx['box'][3] - bx['box'][1])) * sy, (bot - (bx['box'][3] - bx['box'][1])) * sy)

def place_piece(canvas, p, ax, ay, flip=False):
    im = ImageOps.mirror(p.im) if flip else p.im
    px = (im.width - p.ax) if flip else p.ax
    canvas.alpha_composite(im, (int(round(ax - px)), int(round(ay - p.ay))))

def booster_frame(P, side, anim, i):
    g = GEOM['booster']; C = Image.new('RGBA', (g['W'], g['H']))
    ax, ay = g['ax'], g['ay']; pl = PL[P.m]; inner = -side
    flip = side > 0
    fx_front = Image.new('RGBA', C.size)
    if anim == 'ignition':
        e = IGN_E[i]
        paste_top(C, plume_img(pl['b_exit'] * (0.72 + 0.28 * e), pl['b_len'] * e, shape=4 * e, phase=0, amp=2.5 * e, seed=i), ax, ay - 6)
        if i < 3: paste_c(fx_front, scale_w(FLASH, pl['b_exit'] * (1.3 + 0.3 * i)), ax, ay + 6, [1, .7, .35][i])
    elif anim == 'burn':
        ph = 2 * math.pi * i / 8
        paste_top(C, plume_img(pl['b_exit'] * (1 + 0.03 * math.cos(ph)), pl['b_len'] * (1 + 0.05 * math.sin(ph)), 4.0, ph, 2.5, seed=10 + i), ax, ay - 6)
    elif anim == 'separate':
        k = max(0.0, 1 - i / 5.5)
        if k > 0:
            ph = 2 * math.pi * i / 8
            paste_top(C, with_alpha(plume_img(pl['b_exit'] * (0.8 + 0.2 * k), pl['b_len'] * k ** 1.4 + 6, 4 * k, ph, 2.0, seed=20 + i), 0.4 + 0.6 * k), ax, ay - 6)
    place_piece(C, P.b, ax, ay, flip)
    if anim == 'separate':
        px, y0, y1 = P.pod
        for j, py in enumerate((y0 + 8, y1 - 8)):
            X = ax + inner * px; Y = ay + py
            if i <= 4:
                paste_c(fx_front, scale_w(FLASH, 46 * [0.55, 0.95, 1.15, 1.25, 1.3][i]), X + inner * 6, Y, [1, 1, .75, .45, .15][i])
            if 1 <= i <= 9:
                t = (i - 1) / 8
                paste_d(fx_front, scale_w(DEBRIS, 40 + 34 * t), X + inner * (10 + 22 * t), Y + 10 * t, 1 - smooth((t - 0.55) / 0.45), seed=j)
            if i >= 1:
                t = (i - 1)
                cl = rotate(scale_w(CLAMP, 26), inner * -14 * t)
                paste_c(fx_front, cl, X + inner * (8 + 4.2 * t), Y + 2.2 * t + 0.25 * t * t, 1 - smooth((i - 8) / 3.5))
            if i >= 2:
                t = (i - 2) / 9
                pf = scale_w(PUFF, 34 + 70 * smooth(t) + 4 * j)
                pf = ImageOps.mirror(pf) if inner < 0 else pf
                paste_d(fx_front, pf, X + inner * (18 + 26 * t), Y - 6 - 8 * t, 1 - smooth((t - 0.55) / 0.45), seed=3 + j)
    C.alpha_composite(fx_front)
    return C

def lower_frame(P, anim, i):
    g = GEOM['lower-stage']; C = Image.new('RGBA', (g['W'], g['H'])); ax, ay = g['ax'], g['ay']; pl = PL[P.m]
    fx_front = Image.new('RGBA', C.size)
    piece = P.c_cut
    if anim == 'ignition':
        e = IGN_E[i]
        paste_top(C, plume_img(pl['c_exit'] * (0.72 + 0.28 * e), pl['c_len'] * e, 4 * e, 0, 3.2 * e, seed=40 + i), ax, ay - 7)
        if i < 3: paste_c(fx_front, scale_w(FLASH, pl['c_exit'] * (1.4 + 0.35 * i)), ax, ay + 8, [1, .7, .35][i])
    elif anim == 'burn':
        ph = 2 * math.pi * i / 8
        paste_top(C, plume_img(pl['c_exit'] * (1 + 0.03 * math.cos(ph)), pl['c_len'] * (1 + 0.05 * math.sin(ph)), 4.0, ph, 3.2, seed=50 + i), ax, ay - 7)
    elif anim == 'separate':
        k = max(0.0, 1 - i / 5.5)
        if k > 0:
            ph = 2 * math.pi * i / 8
            paste_top(C, with_alpha(plume_img(pl['c_exit'] * (0.8 + 0.2 * k), pl['c_len'] * k ** 1.4 + 8, 4 * k, ph, 2.5, seed=60 + i), 0.4 + 0.6 * k), ax, ay - 7)
        if i >= 4: piece = P.c_full
    elif anim == 'coast':
        piece = P.c_full
    place_piece(C, piece, ax, ay)
    if anim == 'separate':
        sy = ay - 296; half = piece.im.width * 0.5
        if i <= 4:
            fl = scale_wh(FLASH, half * 2.6 * [0.6, 1.0, 1.15, 1.25, 1.3][i], 60 * [0.6, 1.0, 1.1, 1.1, 1.1][i])
            paste_c(fx_front, fl, ax, sy, [1, 1, .75, .45, .15][i])
        if 1 <= i <= 10:
            t = (i - 1) / 9
            for s in (-1, 1):
                d = scale_w(DEBRIS, 44 + 40 * t); d = ImageOps.mirror(d) if s < 0 else d
                paste_d(fx_front, d, ax + s * (half * 0.7 + 34 * t), sy - 6 - 18 * t + 10 * t * t, 1 - smooth((t - 0.55) / 0.45), seed=5 + s)
        if i >= 2:
            t = (i - 2) / 9
            for s in (-1, 1):
                pf = scale_w(PUFF, 40 + 80 * smooth(t)); pf = ImageOps.mirror(pf) if s < 0 else pf
                paste_d(fx_front, pf, ax + s * (half + 22 * t), sy + 4 - 10 * t, 1 - smooth((t - 0.55) / 0.45), seed=8 + s)
    C.alpha_composite(fx_front)
    return C

def upper_frame(P, anim, i):
    g = GEOM['upper-stage']; C = Image.new('RGBA', (g['W'], g['H'])); ax, ay = g['ax'], g['ay']; pl = PL[P.m]
    fx_front = Image.new('RGBA', C.size)
    piece = P.u if anim == 'idle' else P.un
    exit_y = ay + (P.un.im.height - P.un.ay)
    if anim == 'relight':
        e = IGN_E[i]
        paste_top(C, plume_img(pl['u_exit'] * (0.85 + 0.4 * e), pl['u_len'] * e, 4 * e, 0, 3.0 * e, seed=70 + i), ax, exit_y - 5)
        if i < 3: paste_c(fx_front, scale_w(FLASH, pl['u_exit'] * (1.5 + 0.4 * i)), ax, exit_y + 6, [1, .7, .35][i])
    elif anim == 'burn':
        ph = 2 * math.pi * i / 8
        paste_top(C, plume_img(pl['u_exit'] * 1.25 * (1 + 0.03 * math.cos(ph)), pl['u_len'] * (1 + 0.05 * math.sin(ph)), 4.0, ph, 3.0, seed=80 + i), ax, exit_y - 5)
    place_piece(C, piece, ax, ay)
    if anim == 'separate':
        half = P.u.im.width * 0.5
        if i <= 3:
            paste_c(fx_front, scale_wh(FLASH, half * 2.4 * [0.6, 1.0, 1.15, 1.2][i], 44), ax, ay + 4, [0.9, .8, .5, .2][i])
        if i >= 1:
            t = (i - 1) / 8
            for s in (-1, 1):
                pf = scale_w(PUFF, 30 + 54 * smooth(t)); pf = ImageOps.mirror(pf) if s < 0 else pf
                paste_d(fx_front, pf, ax + s * (half + 8 + 22 * t), ay + 10 + 8 * t, 1 - smooth((t - 0.55) / 0.45), seed=11 + s)
    C.alpha_composite(fx_front)
    return C

ANIMS = {
    'booster-l': [('idle', 1, False), ('ignition', 8, False), ('burn', 8, True), ('separate', 12, False)],
    'booster-r': [('idle', 1, False), ('ignition', 8, False), ('burn', 8, True), ('separate', 12, False)],
    'lower-stage': [('idle', 1, False), ('ignition', 8, False), ('burn', 8, True), ('separate', 12, False), ('coast', 1, False)],
    'upper-stage': [('idle', 1, False), ('separate', 10, False), ('relight', 8, False), ('burn', 8, True), ('coast', 1, False)],
}

def render(P, row, anim, i):
    if row == 'booster-l': return booster_frame(P, -1, anim, i)
    if row == 'booster-r': return booster_frame(P, 1, anim, i)
    if row == 'lower-stage': return lower_frame(P, anim, i)
    return upper_frame(P, anim, i)

# ---------------- packing + JSON ----------------
def bbox(im):
    a = np.asarray(im)[..., 3]; ys, xs = np.where(a > 0)
    if len(xs) == 0: return (0, 0, 1, 1)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)

def pack(items, maxw=4096, pad=2):
    """items: list of (name, trimmed_im). Shelf packer, keeps order. Returns positions and sheet size."""
    x = y = 0; shelf = 0; pos = {}; W = 0
    for name, im in items:
        if x + im.width + pad > maxw:
            x = 0; y += shelf + pad; shelf = 0
        pos[name] = (x, y); x += im.width + pad; shelf = max(shelf, im.height); W = max(W, x)
    return pos, (W, y + shelf)

def build_sheet(items_full, image_name, extra):
    """items_full: list of (name, full_canvas_im, (W,H), (ax,ay))."""
    trimmed = []; info = {}
    for name, im, (W, H), (ax, ay) in items_full:
        b = bbox(im); t = im.crop(b); trimmed.append((name, t)); info[name] = (b, W, H, ax, ay)
    pos, (SW, SH) = pack(trimmed)
    sheet = Image.new('RGBA', (SW, SH))
    frames = {}
    for name, t in trimmed:
        x, y = pos[name]; sheet.alpha_composite(t, (x, y))
        b, W, H, ax, ay = info[name]
        frames[name] = {'frame': {'x': x, 'y': y, 'w': t.width, 'h': t.height}, 'rotated': False, 'trimmed': True,
                        'spriteSourceSize': {'x': b[0], 'y': b[1], 'w': t.width, 'h': t.height},
                        'sourceSize': {'w': W, 'h': H}, 'anchor': {'x': round(ax / W, 6), 'y': round(ay / H, 6)},
                        'anchorPx': {'x': ax, 'y': ay}}
    data = {'frames': frames, 'meta': {'app': 'landnam rocket-sprites v2', 'image': image_name, 'format': 'RGBA8888',
                                       'size': {'w': SW, 'h': SH}, 'scale': '1'}}
    data.update(extra)
    return sheet, data

def clean(im):
    a = np.array(im).astype(np.int16)
    a[a[..., 3] < 3] = 0
    m = np.maximum(a[..., 0], a[..., 2]) + 3
    a[..., 1] = np.minimum(a[..., 1], m)
    return neutralize(Image.fromarray(a.astype(np.uint8), 'RGBA'))

def save_keyed(sheet, path, src_path):
    sheet = clean(sheet)
    g = Image.new('RGBA', sheet.size, (0, 255, 0, 255)); g.alpha_composite(sheet); g.convert('RGB').save(src_path)
    sheet.save(path, optimize=True)

HOOKS = [
    {'name': 'launch:ignition', 't': 2.6, 'play': {'booster-l': ['ignition', 'burn'], 'booster-r': ['ignition', 'burn'], 'lower-stage': ['ignition', 'burn'], 'upper-stage': ['idle']},
     'fx': [{'anim': 'fx/pad-smoke', 'at': 'pad', 'count': '4-6, staggered 0.1-0.4 s, runtime drift/scale'}]},
    {'name': 'launch:liftoff', 't': 3.5, 'play': {'booster-l': ['burn'], 'booster-r': ['burn'], 'lower-stage': ['burn']}, 'note': 'keep looping burn; more fx/pad-smoke while the stack clears the pad'},
    {'name': 'launch:booster-separation', 't': 6.4, 'play': {'booster-l': ['separate', 'idle'], 'booster-r': ['separate', 'idle']},
     'detach': {'booster-l': {'vx': -70, 'vy': 55, 'spin': -0.9, 'pivot': 'nozzle (frame anchor)'}, 'booster-r': {'vx': 70, 'vy': 55, 'spin': 0.9, 'pivot': 'nozzle (frame anchor)'}}},
    {'name': 'launch:stage-separation', 't': 8.2, 'play': {'lower-stage': ['separate', 'coast'], 'upper-stage': ['separate', 'relight', 'burn']},
     'detach': {'lower-stage': {'vx': 'small random', 'vy': 90}}, 'note': 'upper-stage separate = 10 frames of coast + ullage puffs (~0.42 s) before relight'},
    {'name': 'launch:fade', 't': 14.2, 'action': 'hide stack'},
    {'name': 'launch:complete', 't': 15.0, 'action': 'unmount'},
]

def build_model(model):
    P = Pieces(model); c = CFG[model]; wide = c['wide']
    items = []; anims = {}
    for row, lst in ANIMS.items():
        gk = 'booster' if row.startswith('booster') else row; g = GEOM[gk]
        for anim, n, loop in lst:
            names = []
            for i in range(n):
                nm = f'{row}/{anim}/{i:02d}'
                items.append((nm, render(P, row, anim, i), (g['W'], g['H']), (g['ax'], g['ay']))); names.append(nm)
            anims[f'{row}/{anim}'] = names
    attach = {'booster-l': (-(wide + 12), 0), 'booster-r': (wide + 12, 0), 'lower-stage': (0, 0), 'upper-stage': (0, -148)}
    extra = {'animations': anims,
             'landnam': {
                 'model': model, 'fps': FPS, 'pxPerAuthorUnit': 2, 'spriteScaleForAuthorUnits': 0.5,
                 'authorWide': wide, 'authorBoosterH': c['H'], 'stackHeightAuthor': 248,
                 'rows': {r: {'attachAuthor': {'x': attach[r][0], 'y': attach[r][1]},
                              'zIndex': {'upper-stage': 0, 'lower-stage': 1, 'booster-l': 2, 'booster-r': 2}[r],
                              'anchor': {'booster-l': 'booster nozzle exit centre', 'booster-r': 'booster nozzle exit centre',
                                         'lower-stage': 'core engine exit centre (stack origin)', 'upper-stage': 'author y=-148 (seats inside the core ring)'}[r]}
                          for r in ANIMS},
                 'animations': {f'{r}/{a}': {'frames': n, 'fps': FPS, 'loop': loop, 'durationSec': round(n / FPS, 3)} for r, l in ANIMS.items() for (a, n, loop) in l},
                 'hooks': HOOKS,
                 'notes': [
                     'Pixi: Spritesheet(texture, json); AnimatedSprite(sheet.animations[name]) with animationSpeed = 24/60; frame anchors are baked per frame.',
                     'Draw order: upper-stage BEHIND lower-stage. The core ring top is punched open for the stacked frames, so the upper stage shows through it and the ring front lip overlaps its base.',
                     'lower-stage separate frames 0-3 still use the punched ring; from frame 4 (and coast) the ring is closed again.',
                     'Rotation/translation (detach velocities, spin about the booster nozzle) stay at runtime; fx inside the separate frames (flash, broken clamp, debris, puffs) are baked.',
                 ]}}
    sheet, data = build_sheet(items, f'{model}-launch-sheet.png', extra)
    save_keyed(sheet, os.path.join(V2, f'{model}-launch-sheet.png'), os.path.join(V2, 'src', f'{model}-launch-sheet_green.png'))
    json.dump(data, open(os.path.join(V2, f'{model}-launch-sheet.json'), 'w'), indent=1)
    print(model, 'sheet', sheet.size, 'frames', len(items), 'halo', halo_count(Image.open(os.path.join(V2, f'{model}-launch-sheet.png'))))

# ---------------- fx sheet ----------------
def fx_sheet():
    items = []; anims = {}; meta = {}
    def add(name, frames, W, H, ax, ay, loop=False, fps=FPS, note=''):
        names = []
        for i, im in enumerate(frames):
            nm = f'fx/{name}/{i:02d}'; items.append((nm, im, (W, H), (ax, ay))); names.append(nm)
        anims[f'fx/{name}'] = names; meta[f'fx/{name}'] = {'frames': len(frames), 'fps': fps, 'loop': loop, 'durationSec': round(len(frames) / fps, 3), 'anchor': note}
    # pad smoke billow: 24 frames, grows through the 5 drawn clouds, drifts and thins out
    W, H = 420, 300; fr = []
    for i in range(24):
        t = i / 23; c = min(3.999, t * 4.6); k = int(c); u = c - k
        w = 70 + 300 * smooth(t) ** 0.8
        a = scale_w(SMOKES[k], w); b = scale_w(SMOKES[min(4, k + 1)], w)
        hh = max(a.height, b.height)
        A = Image.new('RGBA', (int(w) + 2, hh)); A.alpha_composite(a, (0, hh - a.height))
        B = Image.new('RGBA', (int(w) + 2, hh)); B.alpha_composite(b, (0, hh - b.height))
        cl = Image.blend(A, B, u)
        C = Image.new('RGBA', (W, H)); al = 1 - smooth((t - 0.72) / 0.28) * 0.85
        cl = dissolve(cl, 1 - min(1.0, max(0.0, (t - 0.5) / 0.5)) ** 1.15, seed=21)
        C.alpha_composite(cl, (int(W / 2 - cl.width / 2 + 26 * t), int(H - 8 - cl.height - 26 * t)))
        fr.append(C)
    add('pad-smoke', fr, W, H, W // 2, H - 8, note='ground contact point, bottom-centre')
    # booster/stage sep gas puff: 12 frames
    W, H = 260, 200; fr = []
    for i in range(12):
        t = i / 11; C = Image.new('RGBA', (W, H))
        paste_d(C, scale_w(PUFF, 40 + 190 * smooth(t) ** 0.8), W / 2 + 10 * t, H / 2 - 8 * t, 1 - smooth((t - 0.55) / 0.45), seed=31)
        fr.append(C)
    add('sep-puff', fr, W, H, W // 2, H // 2, note='centre of the vent')
    # pyro flash: 8 frames
    W, H = 220, 200; fr = []
    for i in range(8):
        t = i / 7; C = Image.new('RGBA', (W, H))
        paste_c(C, scale_w(FLASH, 60 + 150 * smooth(t) ** 0.6), W / 2, H / 2, [1, 1, .9, .7, .5, .32, .16, .05][i])
        fr.append(C)
    add('stage-sep-flash', fr, W, H, W // 2, H // 2, note='centre of the flash (sep plane)')
    # debris ring: 10 frames
    W, H = 300, 240; fr = []
    for i in range(10):
        t = i / 9; C = Image.new('RGBA', (W, H))
        paste_d(C, scale_w(DEBRIS, 70 + 210 * smooth(t) ** 0.7), W / 2, H / 2 + 20 * t * t, 1 - smooth((t - 0.55) / 0.45), seed=33)
        fr.append(C)
    add('debris', fr, W, H, W // 2, H // 2, note='centre of the burst')
    # broken clamp tumble: 12 frames, loop (runtime moves it)
    W, H = 120, 120; fr = []
    for i in range(12):
        C = Image.new('RGBA', (W, H)); paste_c(C, rotate(scale_w(CLAMP, 70), -30 * i), W / 2, H / 2); fr.append(C)
    add('clamp-tumble', fr, W, H, W // 2, H // 2, loop=True, note='centre; runtime translates')
    extra = {'animations': anims, 'landnam': {'fps': FPS, 'animations': meta,
             'hooks': {'launch:ignition': ['fx/pad-smoke'], 'launch:liftoff': ['fx/pad-smoke'], 'launch:booster-separation': ['fx/sep-puff', 'fx/debris', 'fx/clamp-tumble'],
                       'launch:stage-separation': ['fx/stage-sep-flash', 'fx/debris', 'fx/sep-puff'], 'launch:fade': [], 'launch:complete': []},
             'note': 'Stand-alone copies of the fx that are also baked into the launch-sheet separate frames, for runtime spawning (pad smoke has no baked equivalent).'}}
    sheet, data = build_sheet(items, 'fx-sheet.png', extra)
    save_keyed(sheet, os.path.join(V2, 'fx-sheet.png'), os.path.join(V2, 'src', 'fx-sheet_green.png'))
    json.dump(data, open(os.path.join(V2, 'fx-sheet.json'), 'w'), indent=1)
    print('fx sheet', sheet.size, 'frames', len(items), 'halo', halo_count(Image.open(os.path.join(V2, 'fx-sheet.png'))))

if __name__ == '__main__':
    for m in (sys.argv[1:] or ['explorer', 'prospector', 'fx']):
        if m == 'fx': fx_sheet()
        else: build_model(m)

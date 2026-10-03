"""v2 separation preview: plays the sheet animations frame-exact at 24 fps (both models)."""
import json, math, os, sys, shutil, subprocess
sys.path.insert(0, os.path.dirname(__file__))
from key import neutralize
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
V2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FR = '/tmp/lp2/frames'
W, H = 1280, 1080
U = 1.6                    # screen px per author unit
SC = U / 2                 # sheet px (2 / author unit) -> screen
FPS = 24
T0, T1 = 1.8, 12.0
SKY = (11, 16, 24)
GROUND_Y = 960
TARGET_Y = 640
A1, A2, G = 62.0, 74.0, 46.0
T_IGN, T_LIFT, T_BSEP, T_SSEP = 2.6, 3.5, 6.4, 8.2
FONT = '/usr/share/fonts/truetype/sand-box/google/Oxanium/Oxanium-VariableFont_wght.ttf'
def font(sz, w=b'Bold'):
    f = ImageFont.truetype(FONT, sz)
    try: f.set_variation_by_name(w)
    except Exception: pass
    return f

def smooth(x): x = min(max(x, 0), 1); return x * x * (3 - 2 * x)

class Sheet:
    def __init__(self, name):
        self.m = json.load(open(f'{V2}/{name}.json'))
        sh = Image.open(f'{V2}/{self.m["meta"]["image"]}').convert('RGBA')
        self.cells = {}
        for k, f in self.m['frames'].items():
            r = f['frame']; ss = f['spriteSourceSize']; so = f['sourceSize']
            im = sh.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
            ox = (ss['x'] - f['anchorPx']['x']) * SC; oy = (ss['y'] - f['anchorPx']['y']) * SC
            # resize trimmed cell, remember offset of its top-left from the anchor (screen px)
            w = max(1, round(r['w'] * SC)); h = max(1, round(r['h'] * SC))
            im = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
            self.cells[k] = (im, -ox, -oy)    # anchor position inside the cell
        self.anims = self.m['animations']

    def frame(self, anim, age, loop=False, rate=1.0):
        fr = self.anims[anim]; i = int(math.floor(max(0, age) * FPS * rate + 1e-6))
        i = i % len(fr) if loop else min(i, len(fr) - 1)
        return self.cells[fr[i]], fr[i]

def place(canvas, cell, pos, angle=0.0, scale=1.0):
    im, ax, ay = cell
    if scale != 1.0:
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.BILINEAR); ax *= scale; ay *= scale
    if abs(angle) > 1e-4:
        R = int(math.hypot(max(ax, im.width - ax), max(ay, im.height - ay))) + 2
        pad = Image.new('RGBA', (2 * R, 2 * R), (0, 0, 0, 0))
        pad.alpha_composite(im, (int(round(R - ax)), int(round(R - ay))))
        im = pad.rotate(-math.degrees(angle), resample=Image.BICUBIC, center=(R, R)); ax = ay = R
    x, y = int(round(pos[0] - ax)), int(round(pos[1] - ay))
    if x > W or y > H or x + im.width < 0 or y + im.height < 0: return
    canvas.alpha_composite(im, (x, y)) if x >= 0 and y >= 0 else _paste_clip(canvas, im, x, y)

def _paste_clip(canvas, im, x, y):
    cx0, cy0 = max(0, -x), max(0, -y)
    im = im.crop((cx0, cy0, im.width, im.height)); canvas.alpha_composite(im, (x + cx0, y + cy0))

# ---------- world motion (same timeline as v1 / the game)
def alt(t):
    if t < T_LIFT: return 0.0
    if t < T_SSEP: return 0.5 * A1 * (t - T_LIFT) ** 2
    t8 = T_SSEP - T_LIFT; a8 = 0.5 * A1 * t8 ** 2; v8 = A1 * t8; dt = t - T_SSEP
    return a8 + v8 * dt + 0.5 * A2 * max(0, dt - 0.6) ** 2

def vel(t, h=1e-3): return (alt(t + h) - alt(t - h)) / (2 * h)

def cam(a):
    D = GROUND_Y - TARGET_Y
    return a - D * (1 - math.exp(-a / D)) if a > 0 else 0.0

def detached(t, t0, vx, vy, spin):
    """Separated piece: inherits stack velocity, eases into its push (no velocity jump), gravity, spin."""
    dt = max(0.0, t - t0); a0 = alt(t0); v0 = vel(t0)
    ease = dt - 0.25 * (1 - math.exp(-dt / 0.25))            # integral of (1-exp(-t/0.25))
    pa = a0 + v0 * dt - 0.5 * G * dt * dt - vy * ease
    return pa, vx * ease, spin * (dt - 0.35 * (1 - math.exp(-dt / 0.35)))

# ---------- background (chalky: painted gradient + grain), precomputed
def make_bg():
    rng = np.random.RandomState(3)
    h = 3600
    y = np.arange(h)[:, None].astype(np.float32)
    k = np.clip((y - (h - 900)) / 900, 0, 1) ** 1.6       # haze near the ground (bottom of this tall strip)
    base = np.zeros((h, W, 3), np.float32)
    for c, (a, b) in enumerate(((11, 26), (16, 40), (24, 58))): base[..., c] = a + (b - a) * k
    blot = rng.rand(h // 24, W // 24).astype(np.float32)
    blot = np.asarray(Image.fromarray((blot * 255).astype(np.uint8)).resize((W, h), Image.BICUBIC)).astype(np.float32) / 255 - 0.5
    base += blot[..., None] * 6
    base += rng.randint(-5, 6, (h, W))[..., None]
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    for _ in range(300):
        x, yy, r, b = rng.uniform(0, W), rng.uniform(0, h - 500), rng.uniform(0.8, 2.3), rng.uniform(0.25, 0.75)
        v = int(255 * b); d.ellipse([x - r, yy - r, x + r, yy + r], fill=(v, min(255, v + 10), min(255, v + 30), 255))
    return img, h

def pad_layer(xs):
    """Launch pads: chunky slate shapes, thick ink outlines, soft shading + grain (drawn once)."""
    L = Image.new('RGBA', (W, 520), (0, 0, 0, 0)); d = ImageDraw.Draw(L); gy = 120
    ink = (8, 12, 18, 255)
    d.rounded_rectangle([-20, gy + 6, W + 20, 540], 10, fill=(22, 30, 42, 255), outline=ink, width=5)
    d.rectangle([0, gy + 12, W, gy + 20], fill=(44, 56, 72, 255))
    for x in xs:
        d.rounded_rectangle([x - 120, gy - 10, x + 120, gy + 10], 6, fill=(56, 68, 84, 255), outline=ink, width=5)
        d.rectangle([x - 112, gy - 4, x + 112, gy + 0], fill=(80, 94, 112, 255))
        d.rounded_rectangle([x + 126, gy - 340, x + 152, gy - 8], 5, fill=(42, 52, 66, 255), outline=ink, width=5)
        d.rectangle([x + 130, gy - 334, x + 136, gy - 12], fill=(64, 76, 92, 255))
        for yy in range(gy - 326, gy - 20, 42):
            d.line([(x + 130, yy), (x + 148, yy + 38)], fill=ink, width=4)
    a = np.array(L).astype(np.int16)
    n = np.random.RandomState(7).randint(-9, 10, a.shape[:2])
    for c in range(3): a[..., c] = np.clip(a[..., c] + n, 0, 255)
    return Image.fromarray(a.astype(np.uint8)), gy

def arm(t, x, gy, img):
    d = ImageDraw.Draw(img); u = smooth((t - 2.0) / 0.6); ink = (8, 12, 18, 255)
    d.rounded_rectangle([x + 54 + 48 * u, gy - 262, x + 130, gy - 246], 4, fill=(48, 60, 76, 255), outline=ink, width=4)

# ---------- fx instances (fx-sheet, world space)
def spawn_fx(xs):
    r = np.random.RandomState(11); out = []
    for x0 in xs:
        for i in range(16):                                 # pad smoke billow: back + front layers
            tb = T_IGN + 0.05 + i * 0.13 + r.uniform(0, 0.08)
            side = [-1, 1][i % 2]
            out.append(dict(kind='pad', x=x0 + side * r.uniform(10, 60), vx=side * r.uniform(45, 110), born=tb,
                            rate=r.uniform(0.55, 0.75), scale=r.uniform(0.75, 1.25), front=(i % 3 == 0), mirror=side < 0))
    return out

def render(t, S, FX, xs, bg, bgh, padL, padgy, hud=True):
    a = alt(t); c = cam(a * U)
    off = int(bgh - H - c * 0.3)
    img = bg.crop((0, max(0, off), W, max(0, off) + H)).copy()
    gy = GROUND_Y + c
    if gy - padgy < H: _paste_clip(img, padL, 0, int(round(gy - padgy)))
    back, front = [], []
    for p in FX:
        age = t - p['born']
        if age < 0: continue
        fr = FX_SHEET.anims['fx/pad-smoke']; i = int(age * FPS * p['rate'])
        if i >= len(fr): continue
        cell = FX_SHEET.cells[fr[i]]
        if p['mirror']:
            im, ax, ay = cell; cell = (im.transpose(Image.FLIP_LEFT_RIGHT), im.width - ax, ay)
        x = p['x'] + p['vx'] * age * (1 - 0.18 * age)
        (front if p['front'] else back).append((cell, (x, gy + 6), p['scale']))
    for cell, pos, s in back: place(img, cell, pos, 0, s)
    for v, x0 in zip(('explorer', 'prospector'), xs):
        sh = S[v]; L = sh.m['landnam']; wide = L['authorWide']
        shake = math.sin(t * 83 + x0) * 1.4 * smooth((t - T_IGN) / 0.3) * (1 - smooth((t - 4.0) / 1.2)) if t > T_IGN else 0
        rx = x0 + shake; ry = gy - 6 - a * U
        # upper stage (behind)
        up_att = L['rows']['upper-stage']['attachAuthor']['y']
        if t < T_SSEP: cell, _ = sh.frame('upper-stage/idle', 0)
        else:
            age = t - T_SSEP; n1 = len(sh.anims['upper-stage/separate']) / FPS; n2 = len(sh.anims['upper-stage/relight']) / FPS
            if age < n1: cell, _ = sh.frame('upper-stage/separate', age)
            elif age < n1 + n2: cell, _ = sh.frame('upper-stage/relight', age - n1)
            else: cell, _ = sh.frame('upper-stage/burn', age - n1 - n2, loop=True)
        place(img, cell, (rx, ry + up_att * U))
        # lower stage
        if t < T_SSEP:
            if t < T_IGN: cell, _ = sh.frame('lower-stage/idle', 0)
            elif t < T_IGN + 8 / FPS: cell, _ = sh.frame('lower-stage/ignition', t - T_IGN)
            else: cell, _ = sh.frame('lower-stage/burn', t - T_IGN - 8 / FPS, loop=True)
            place(img, cell, (rx, ry))
        else:
            pa, dx, rot = detached(t, T_SSEP, 5 if v == 'explorer' else -5, 90, 0.10 if v == 'explorer' else -0.10)
            age = t - T_SSEP
            cell, _ = sh.frame('lower-stage/separate', age) if age < 12 / FPS else sh.frame('lower-stage/coast', 0)
            place(img, cell, (rx + dx * U, gy - 6 - pa * U), rot)
        # boosters (front), rotate about the nozzle = frame anchor
        for side, row in ((-1, 'booster-l'), (1, 'booster-r')):
            bx = L['rows'][row]['attachAuthor']['x']
            if t < T_BSEP:
                if t < T_IGN: cell, _ = sh.frame(f'{row}/idle', 0)
                elif t < T_IGN + 8 / FPS: cell, _ = sh.frame(f'{row}/ignition', t - T_IGN)
                else: cell, _ = sh.frame(f'{row}/burn', t - T_IGN - 8 / FPS, loop=True)
                place(img, cell, (rx + bx * U, ry))
            else:
                pa, dx, rot = detached(t, T_BSEP, side * 70, 55, side * 0.9)
                age = t - T_BSEP
                cell, _ = sh.frame(f'{row}/separate', age) if age < 12 / FPS else sh.frame(f'{row}/idle', 0)
                wob = 0.035 * math.sin(age * 9) * math.exp(-age * 1.5)       # slight wobble as it drifts
                place(img, cell, (rx + (bx + dx) * U, gy - 6 - pa * U), rot + side * wob)
        # stand-alone fx from the fx sheet: sep puffs left behind in world space
        if t >= T_BSEP:
            age = t - T_BSEP
            for side in (-1, 1):
                fr = FX_SHEET.anims['fx/sep-puff']; i = int(age * FPS * 0.8)
                if i < len(fr):
                    ya = alt(T_BSEP) + vel(T_BSEP) * age * 0.55 + 70
                    place(img, FX_SHEET.cells[fr[i]], (rx + side * (wide + 30 + 50 * age) * U, gy - 6 - ya * U), 0, 0.8)
        if t >= T_SSEP:
            age = t - T_SSEP
            fr = FX_SHEET.anims['fx/debris']; i = int(age * FPS)
            ya = alt(T_SSEP) + vel(T_SSEP) * age * 0.85 - up_att
            if i < len(fr): place(img, FX_SHEET.cells[fr[i]], (rx, gy - 6 - ya * U), 0, 0.75)
    for cell, pos, s in front: place(img, cell, pos, 0, s)
    # HUD
    d = ImageDraw.Draw(img)
    if hud:
        d.text((40, 36), f'T+{max(0.0, t - T_LIFT):04.1f}s', fill=(112, 217, 234, 255), font=font(34))
        d.text((40, 80), 'EXPLORER', fill=(232, 232, 237, 200), font=font(22)); d.text((W - 220, 80), 'PROSPECTOR', fill=(232, 232, 237, 200), font=font(22))
        marks = [(T_IGN, 'IGNITION', 'launch:ignition'), (T_LIFT, 'LIFTOFF', 'launch:liftoff'),
                 (T_BSEP, 'BOOSTER SEPARATION', 'launch:booster-separation'), (T_SSEP, 'STAGE SEPARATION', 'launch:stage-separation')]
        cap = None
        for m in marks:
            if t >= m[0]: cap = m
        if cap:
            age = t - cap[0]; al = smooth(age / 0.25) * (1 - smooth((age - 1.6) / 0.4))
            if al > 0.01:
                f = font(46); tw = d.textlength(cap[1], font=f)
                d.text(((W - tw) / 2, 30), cap[1], fill=(int(11 + 152 * al), int(16 + 220 * al), int(24 + 221 * al), 255), font=f)
                f2 = font(20, b'Medium'); tw2 = d.textlength(cap[2], font=f2)
                d.text(((W - tw2) / 2, 86), cap[2], fill=(int(11 + 112 * al), int(16 + 160 * al), int(24 + 170 * al), 255), font=f2)
    return neutralize(img).convert('RGB')

S = {v: Sheet(f'{v}-launch-sheet') for v in ('explorer', 'prospector')}
FX_SHEET = Sheet('fx-sheet')
XS = (340, 940)
FXI = spawn_fx(XS)
BG, BGH = make_bg()
PADL, PADGY = pad_layer(XS)

def frame_at(t, hud=True): return render(t, S, FXI, XS, BG, BGH, PADL, PADGY, hud)

if __name__ == '__main__':
    shutil.rmtree(FR, ignore_errors=True); os.makedirs(FR)
    n = int(round((T1 - T0) * FPS))
    for i in range(n):
        frame_at(T0 + i / FPS).save(f'{FR}/f{i:04d}.png')
    print('frames', n)
    mp4 = f'{V2}/separation-preview.mp4'; gif = f'{V2}/separation-preview.gif'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{FR}/f%04d.png', '-c:v', 'libx264',
                    '-pix_fmt', 'yuv444p', '-crf', '16', '-preset', 'slow', '-tune', 'animation', '-movflags', '+faststart', mp4.replace('.mp4', '_444.mp4')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{FR}/f%04d.png', '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-tune', 'animation', '-movflags', '+faststart', mp4], check=True)
    os.remove(mp4.replace('.mp4', '_444.mp4'))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{FR}/f%04d.png', '-vf',
                    'scale=480:-1:flags=lanczos,hqdn3d=3:3:0:0,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle', '-r', str(FPS), gif], check=True)
    print('done')

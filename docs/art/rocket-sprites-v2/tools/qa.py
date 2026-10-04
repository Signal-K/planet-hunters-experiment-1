"""v2 QA: hue + green halo on every output, stack seam alignment, animation continuity."""
import os, sys, glob, json, subprocess
import numpy as np
from PIL import Image, ImageSequence, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools'))
from lib import hue_counts, font
from key import halo_count
V2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(f'{V2}/qa', exist_ok=True)

def halo(im):
    a = np.asarray(im.convert('RGBA')).astype(np.int16)
    return int(((a[..., 1] > a[..., 0] + 40) & (a[..., 1] > a[..., 2] + 40) & (a[..., 3] > 0)).sum())

rows = []
files = sorted(glob.glob(f'{V2}/*.png') + glob.glob(f'{V2}/parts/*.png'))
tot = dict(o=0, p=0, h=0)
for f in files:
    im = Image.open(f); o, p, g, n = hue_counts(im); h = halo(im)
    rows.append((os.path.relpath(f, V2), f'{im.width}x{im.height}', o, p, h, n)); tot['o'] += o; tot['p'] += p; tot['h'] += h
gif = Image.open(f'{V2}/separation-preview.gif'); to = tp = th = tn = 0; k = 0
for fr in ImageSequence.Iterator(gif):
    fr = fr.convert('RGBA'); o, p, g, n = hue_counts(fr); to += o; tp += p; th += halo(fr); tn += n; k += 1
rows.append((f'separation-preview.gif ({k} frames, summed)', f'{gif.width}x{gif.height}', to, tp, th, tn))
os.makedirs('/tmp/mp4qa2', exist_ok=True)
for f in glob.glob('/tmp/mp4qa2/*.png'): os.remove(f)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{V2}/separation-preview.mp4', '-vf', 'fps=4', '/tmp/mp4qa2/m%03d.png'], check=True)
to = tp = th = tn = 0; k = 0
for f in sorted(glob.glob('/tmp/mp4qa2/m*.png')):
    im = Image.open(f); o, p, g, n = hue_counts(im); to += o; tp += p; th += halo(im); tn += n; k += 1
rows.append((f'separation-preview.mp4 ({k} sampled frames, summed)', '1280x1080', to, tp, th, tn))
hdr = '| file | size | orange px (15-45°, s>0.35) | purple px (260-320°, s>0.35) | green halo px (g>r+40, g>b+40, a>0) | visible px |'
lines = [hdr, '|' + '---|' * 6] + ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
open(f'{V2}/qa/hue-check.md', 'w').write('\n'.join(lines) + '\n')
print(f'{len(rows)} rows; still-image totals', tot, '| gif/mp4:', rows[-2][2:5], rows[-1][2:5])

# ---------- frames helper
def loader(name):
    d = json.load(open(f'{V2}/{name}.json')); sh = Image.open(f'{V2}/{d["meta"]["image"]}')
    def frame(nm):
        f = d['frames'][nm]; r = f['frame']; ss = f['spriteSourceSize']; so = f['sourceSize']
        C = Image.new('RGBA', (so['w'], so['h'])); C.alpha_composite(sh.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])), (ss['x'], ss['y']))
        return C, (f['anchorPx']['x'], f['anchorPx']['y'])
    return d, frame

# ---------- stack alignment
res = {}; panels = []
for v in ('explorer', 'prospector'):
    d, frame = loader(f'{v}-launch-sheet'); L = d['landnam']
    W, H = 420, 800; X0, Y0 = 210, 640
    layers = {}
    for row in ['upper-stage', 'lower-stage', 'booster-l', 'booster-r']:
        im, (ax, ay) = frame(f'{row}/idle/00'); att = L['rows'][row]['attachAuthor']
        C = Image.new('RGBA', (W, H)); C.alpha_composite(im, (int(X0 + att['x'] * 2 - ax), int(Y0 + att['y'] * 2 - ay))); layers[row] = C
    A = {k: np.asarray(v_)[..., 3].astype(np.int32) for k, v_ in layers.items()}
    up, lo, bl, br = A['upper-stage'], A['lower-stage'], A['booster-l'], A['booster-r']
    union = np.maximum.reduce([up, lo, bl, br])
    seam = Y0 - 148 * 2
    # columns where the upper stage is solid just above the seam, rows seam-40 .. seam+40
    cols = np.where(up[seam - 12] > 250)[0]
    gap = int((union[seam - 30:seam + 40, cols.min() + 3:cols.max() - 2] < 250).sum())   # inner span (outline AA columns excluded)
    gap_full = int((union[seam - 40:seam + 40, cols.min():cols.max() + 1] < 250).sum())
    # booster <-> core junction: rows 40%..80% of booster height, columns between booster and core centre
    wide = L['authorWide']; bh = (L['authorBoosterH']) * 2
    jgap = 0
    for s, b in ((-1, bl), (1, br)):
        bx = X0 + s * (wide + 12) * 2
        xa, xb = sorted((bx, X0)); r0, r1 = Y0 - int(bh * 0.8), Y0 - int(bh * 0.4)
        jgap += int((union[r0:r1, xa:xb] < 250).sum())
    res[v] = dict(upper_solid_cols=[int(cols.min() - X0), int(cols.max() - X0)], seam_gap_px=gap, seam_gap_px_incl_edge_aa=gap_full, booster_core_gap_px=jgap,
                  upper_core_overlap_px=int(((up > 0) & (lo > 0)).sum()), booster_attach_x_author=[-(wide + 12), wide + 12])
    bg = Image.new('RGBA', (W, H), (79, 155, 218, 255))
    for row in ['upper-stage', 'lower-stage', 'booster-l', 'booster-r']: bg.alpha_composite(layers[row])
    dd = ImageDraw.Draw(bg); dd.line([(0, seam), (40, seam)], fill='white', width=1); dd.text((4, seam - 18), 'y=-148', fill='white', font=font(14))
    zoom = bg.crop((X0 - 70, seam - 40, X0 + 70, seam + 40)).resize((420, 240), Image.NEAREST)
    panels.append((v, bg, zoom))

# ---------- animation continuity (mean abs RGBA diff, 0-255)
def mad(a, b):
    A = np.asarray(a).astype(np.float32); B = np.asarray(b).astype(np.float32)
    return float(np.abs(A - B).mean())
cont = {}
for name in ('explorer-launch-sheet', 'prospector-launch-sheet', 'fx-sheet'):
    d, frame = loader(name); an = d['animations']; out = {}
    for k, fr in an.items():
        ims = [frame(n)[0] for n in fr]
        steps = [mad(ims[i], ims[i + 1]) for i in range(len(ims) - 1)] or [0]
        e = dict(frames=len(fr), max_step=round(max(steps), 2), median_step=round(float(np.median(steps)), 2))
        if d['landnam']['animations'][k]['loop']: e['loop_wrap_step'] = round(mad(ims[-1], ims[0]), 2)
        out[k] = e
    # handoffs between consecutive anims
    if name != 'fx-sheet':
        hand = {}
        for row in ('booster-l', 'booster-r', 'lower-stage', 'upper-stage'):
            seqs = {'booster-l': ['idle', 'ignition', 'burn', 'separate', 'idle'], 'booster-r': ['idle', 'ignition', 'burn', 'separate', 'idle'],
                    'lower-stage': ['idle', 'ignition', 'burn', 'separate', 'coast'], 'upper-stage': ['idle', 'separate', 'relight', 'burn']}[row]
            for a, b in zip(seqs, seqs[1:]):
                hand[f'{row}: {a} -> {b}'] = round(mad(frame(an[f'{row}/{a}'][-1])[0], frame(an[f'{row}/{b}'][0])[0]), 2)
        out['_handoffs'] = hand
    cont[name] = out
json.dump(dict(alignment=res, continuity=cont), open(f'{V2}/qa/qa.json', 'w'), indent=1)
P = Image.new('RGBA', (2 * 420 + 2 * 440 + 40, 840), (26, 26, 29, 255)); dd = ImageDraw.Draw(P); x = 10
for v, bg, z in panels:
    P.alpha_composite(bg, (x, 34)); dd.text((x, 6), f'{v} idle stack (from sheet, attachAuthor)', fill='white', font=font(18))
    P.alpha_composite(z, (x + 430, 300)); dd.text((x + 430, 270), 'seam zoom 3x', fill='white', font=font(16)); x += 860
P.convert('RGB').save(f'{V2}/qa/stack-alignment.png')
print(json.dumps(res, indent=1))
for n, o in cont.items():
    print(n)
    for k, e in o.items(): print('  ', k, e)

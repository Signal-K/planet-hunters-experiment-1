import os, sys
import numpy as np
from PIL import Image
V2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FX = None
ROCKETS = [(150, 120, 230, 312), (330, 95, 412, 322), (525, 70, 620, 332), (735, 50, 860, 352), (910, 10, 1180, 362)]
SMOKE = [(140, 440, 238, 528), (290, 425, 446, 530), (478, 400, 672, 532), (690, 372, 902, 532), (915, 362, 1175, 534)]
OTHER = dict(flash=(140, 580, 252, 676), debris=(372, 570, 512, 676), puff=(620, 550, 838, 680), clamp=(944, 556, 1090, 680))

def fx():
    global FX
    if FX is None:
        FX = Image.open(os.path.join(V2, 'cut', 'launch-fx_keyed.png'))
    return FX

def trim(im, thr=6):
    a = np.asarray(im)[..., 3]; ys, xs = np.where(a > thr)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def plume(i):
    """White-cyan flame only (rocket discarded). Returns (rgba, exit_width_px)."""
    c = fx().crop(ROCKETS[i]); a = np.array(c).astype(np.int32)
    lum = a[..., :3].mean(-1); op = a[..., 3] > 200
    dark_rows = np.where(((lum < 85) & op).sum(1) >= 3)[0]
    # nozzle bottom = last dark row that sits above the first bright plume run
    bright = ((lum > 200) & op).sum(1)
    noz = dark_rows.max()
    y0 = max(0, noz - 2)
    a[:y0, :, 3] = 0
    kill = (lum < 95) & (a[..., 2] < 170)
    a[kill, 3] = 0
    im = trim(Image.fromarray(a.astype(np.uint8)))
    al = np.asarray(im)[..., 3]
    top = np.where(al[2] > 60)[0]
    return im, (top.max() - top.min() + 1)

def smoke(i):
    c = fx().crop(SMOKE[i]); return trim(c)

def other(name):
    return trim(fx().crop(OTHER[name]))

if __name__ == '__main__':
    os.makedirs(os.path.join(V2, 'cut', 'fx'), exist_ok=True)
    for i in range(5):
        p, w = plume(i); p.save(os.path.join(V2, 'cut', 'fx', f'plume{i+1}.png')); print('plume', i + 1, p.size, 'exit w', w)
        s = smoke(i); s.save(os.path.join(V2, 'cut', 'fx', f'smoke{i+1}.png')); print('smoke', i + 1, s.size)
    for k in OTHER:
        o = other(k); o.save(os.path.join(V2, 'cut', 'fx', f'{k}.png')); print(k, o.size)

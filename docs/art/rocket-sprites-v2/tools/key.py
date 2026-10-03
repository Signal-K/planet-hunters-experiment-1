"""Chroma-key the generated JPGs (green screen) into clean RGBA."""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

def bg_color(a):
    h, w = a.shape[:2]
    s = np.concatenate([a[:24, :24].reshape(-1, 3), a[:24, -24:].reshape(-1, 3), a[-24:, :24].reshape(-1, 3), a[-24:, -24:].reshape(-1, 3)])
    return np.median(s, 0)

def key(rgb, sf=-12.0, lo=0.07, hi=0.93):
    a = np.asarray(rgb.convert('RGB')).astype(np.float32)
    bg = bg_color(a)
    S = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
    Sb = bg[1] - max(bg[0], bg[2])
    al = np.clip((Sb - S) / (Sb - sf), 0, 1)
    # JPEG noise: light median on alpha, then hard-ish ends
    alI = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
    al = np.asarray(alI).astype(np.float32) / 255
    al = np.clip((al - lo) / (hi - lo), 0, 1) ** 1.3
    safe = np.maximum(al, 0.05)[..., None]
    F = (a - (1 - al)[..., None] * bg[None, None, :]) / safe
    F = np.clip(F, 0, 255)
    # where alpha is low the unmix is noisy: blend toward the despilled observed colour
    obs = a.copy()
    w = np.clip(al * 2.2, 0, 1)[..., None]
    F = F * w + obs * (1 - w)
    mrb = np.maximum(F[..., 0], F[..., 2])
    F[..., 1] = np.minimum(F[..., 1], mrb + 3)          # despill (art has no greens)
    out = np.dstack([F, al * 255]).astype(np.uint8)
    out[al <= 0] = 0
    return Image.fromarray(out, 'RGBA')

def halo_count(im):
    a = np.asarray(im.convert('RGBA')).astype(int)
    m = (a[..., 3] > 0) & (a[..., 1] > a[..., 0] + 40) & (a[..., 1] > a[..., 2] + 40)
    return int(m.sum())

if __name__ == '__main__':
    gen = sys.argv[1]; out = sys.argv[2]
    for f in sorted(os.listdir(gen)):
        if f.endswith('.jpg'):
            k = key(Image.open(os.path.join(gen, f)))
            k.save(os.path.join(out, f.replace('.jpg', '_keyed.png')))
            print(f, 'halo', halo_count(k))


def neutralize(im, smax=0.30):
    """Pull off-palette fringe colours (purple 255-325 deg, orange 12-48 deg) to sat<=smax, keeping hue + value.
    These come from despilling dark JPEG edge pixels (G pushed below R) and are not part of the painted palette."""
    a = np.array(im.convert('RGBA')).astype(np.float32)
    rgb = a[..., :3] / 255.0
    mx = rgb.max(-1); mn = rgb.min(-1); c = mx - mn
    s = np.where(mx > 0, c / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx); nz = c > 1e-6
    rm = nz & (mx == r); gm = nz & (mx == g) & ~rm; bm = nz & ~rm & ~gm
    h[rm] = ((g - b)[rm] / c[rm]) % 6; h[gm] = (b - r)[gm] / c[gm] + 2; h[bm] = (r - g)[bm] / c[bm] + 4
    h *= 60
    m = (s > smax) & (((h >= 255) & (h <= 325)) | ((h >= 12) & (h <= 48)))
    if m.any():
        # scale chroma around the max channel: new = mx - (mx - ch) * smax / s
        k = np.where(m, smax / np.maximum(s, 1e-6), 1.0)[..., None]
        out = mx[..., None] - (mx[..., None] - rgb) * k
        a[..., :3] = np.clip(out * 255, 0, 255)
    return Image.fromarray(a.round().astype(np.uint8), 'RGBA')

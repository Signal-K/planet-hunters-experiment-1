"""Cut + fit the generated stage pieces to the v1 author geometry (2 sheet px per author unit)."""
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
V2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 2

# per model: source boxes (in the keyed 1280x720 piece sheet) and fit params
CFG = {
    'explorer': dict(wide=16, H=152,
        booster=dict(box=(169, 118, 308, 573), cx=59.5, sx=0.50),
        core=dict(box=(663, 111, 855, 582), cx=95.75, seam=17, front=26, sx=0.55),
        upper=dict(box=(963, 180, 1087, 573), cx=62.0, base=298, sx=0.55)),
    'prospector': dict(wide=20, H=168,
        booster=dict(box=(172, 92, 326, 603), cx=65.0, sx=0.50),
        core=dict(box=(664, 95, 872, 609), cx=103.5, seam=18, front=28, sx=0.60),
        upper=dict(box=(975, 167, 1106, 602), cx=65.5, base=330, sx=0.60)),
}

def resize(im, sx, sy):
    w = max(1, int(round(im.width * sx))); h = max(1, int(round(im.height * sy)))
    return im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')

def load(model):
    return Image.open(os.path.join(V2, 'cut', f'{model}-pieces_keyed.png'))

class Piece:
    """An RGBA image plus its anchor (px inside the image) in sheet pixels."""
    def __init__(self, im, ax, ay):
        self.im, self.ax, self.ay = im, ax, ay

def booster(model):
    c = CFG[model]; b = c['booster']; src = load(model).crop(b['box'])
    hb = src.height; sy = 2 * (c['H'] + 22) / hb
    im = resize(src, b['sx'], sy)
    return Piece(im, b['cx'] * b['sx'], im.height)          # anchor = nozzle exit centre (bottom)

def core(model, cut_ring=True):
    c = CFG[model]; k = c['core']; src = load(model).crop(k['box'])
    a = np.array(src)
    seam = k['seam']
    if cut_ring:
        lum = a[..., :3].mean(-1)
        a[:seam, :, 3] = 0
        # punch the ring's open top (dark inner wall) so the upper stage shows through it
        mid = int(k['cx'])
        for y in range(seam, k['front']):
            if lum[y, mid] >= 110: continue
            l = mid; r = mid
            while l > 0 and lum[y, l - 1] < 110: l -= 1
            while r < a.shape[1] - 1 and lum[y, r + 1] < 110: r += 1
            a[y, l + 2:r - 1, 3] = 0
    src = Image.fromarray(a)
    sy = 296 / (src.height - seam)
    im = resize(src, k['sx'], sy)
    return Piece(im, k['cx'] * k['sx'], im.height), sy

def upper(model, nozzle=False):
    c = CFG[model]; u = c['upper']; ck = c['core']
    src = load(model).crop(u['box'])
    _, csy = core(model)
    base_y = -296 + (ck['front'] - ck['seam']) * csy        # where the cylinder bottom sits (sheet px, stack space)
    sy = (496 + base_y) / u['base']
    if not nozzle:
        a = np.array(src); a[u['base'] + 2:, :, 3] = 0; src = Image.fromarray(a)
        src = src.crop((0, 0, src.width, u['base'] + 2))
    im = resize(src, u['sx'], sy)
    # anchor = base of the upper cylinder at author y=-148: position of the seam line inside this image
    ay = u['base'] * sy - (base_y + 296)
    return Piece(im, u['cx'] * u['sx'], ay)

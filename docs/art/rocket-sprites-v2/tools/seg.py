import numpy as np
from collections import deque
from PIL import Image

def dil(m, n):
    for _ in range(n):
        p = np.pad(m, 1); m = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return m

def components(rgba, ds=4, grow=2, min_area=30):
    a = np.asarray(rgba)[..., 3]
    h, w = a.shape
    sm = np.asarray(Image.fromarray(a).resize((w // ds, h // ds), Image.BOX)) > 40
    sm = dil(sm, grow)
    lab = np.zeros(sm.shape, int); n = 0; boxes = []
    for y0 in range(sm.shape[0]):
        for x0 in range(sm.shape[1]):
            if sm[y0, x0] and not lab[y0, x0]:
                n += 1; q = deque([(y0, x0)]); lab[y0, x0] = n; ys = []; xs = []
                while q:
                    y, x = q.popleft(); ys.append(y); xs.append(x)
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < sm.shape[0] and 0 <= xx < sm.shape[1] and sm[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n; q.append((yy, xx))
                if len(ys) >= min_area:
                    boxes.append(((min(xs) - grow) * ds, (min(ys) - grow) * ds, (max(xs) + 1 + grow) * ds, (max(ys) + 1 + grow) * ds, len(ys)))
    return boxes

def tight(rgba, box, thr=8):
    c = rgba.crop(box[:4]); a = np.asarray(c)[..., 3]
    ys, xs = np.where(a > thr)
    return (box[0] + xs.min(), box[1] + ys.min(), box[0] + xs.max() + 1, box[1] + ys.max() + 1)

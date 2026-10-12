"""Base sky: smooth vertical gradient quantised to a small palette with 4x4 Bayer dithering (no hard bands, no orange)."""
from PIL import Image
import sys

W, H = 240, 180
STOPS = [(0.0, (0x1E, 0x1B, 0x4B)), (0.55, (0x5A, 0x42, 0x8C)), (1.0, (0xC8, 0x9B, 0xC4))]
PALETTE = [(0x1E, 0x1B, 0x4B), (0x2C, 0x25, 0x62), (0x3F, 0x31, 0x78), (0x5A, 0x42, 0x8C),
           (0x76, 0x57, 0x9C), (0x93, 0x70, 0xAE), (0xAE, 0x86, 0xB8), (0xC8, 0x9B, 0xC4)]
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

def pos(t):
    """Gradient position along the palette (0..len-1) for t in 0..1, following the stops."""
    for (a, _), (b, _) in zip(STOPS, STOPS[1:]):
        if t <= b:
            u = (t - a) / (b - a)
            seg = [s[0] for s in STOPS].index(a)
            return (seg * 3 + u * 3) * (len(PALETTE) - 1) / 6
    return len(PALETTE) - 1

img = Image.new("RGB", (W, H))
for y in range(H):
    p = pos(y / (H - 1))
    lo = int(p); frac = p - lo
    for x in range(W):
        thr = (BAYER[y % 4][x % 4] + 0.5) / 16
        idx = min(lo + (1 if frac > thr else 0), len(PALETTE) - 1)
        img.putpixel((x, y), PALETTE[idx])
for out in sys.argv[1:]:
    img.save(out)

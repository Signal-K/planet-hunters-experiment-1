"""SSL-489: crop v5 art-pack sheets into game asset paths (web + native twins)."""
import sys
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
V5 = ROOT / "art-pack" / "v5"
OUTS = [ROOT / "web/public/game/assets", ROOT / "native/App/Resources/Art"]


def save(img, rel):
    for o in OUTS:
        p = o / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        img.save(p, optimize=True)


def is_sky(px):
    r, g, b = px[:3]
    lum = (r + g + b) / 3
    return lum > 175 or (b >= r + 8 and lum > 120 and g > 110)  # light or blue sky


def cutout(img, box, ground_y=None, enclosed=False):
    """Crop box, flood sky from the top edge to transparent, trim to content."""
    c = img.crop(box).convert("RGBA")
    if ground_y is not None:
        c = c.crop((0, 0, c.width, ground_y - box[1]))
    w, h = c.size
    px = c.load()
    seen = [[False] * h for _ in range(w)]
    q = deque((x, 0) for x in range(w))
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or seen[x][y]:
            continue
        seen[x][y] = True
        if not is_sky(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    if enclosed:  # sky pockets between structural members (blue only, keeps white hulls)
        for y in range(h):
            for x in range(w):
                r, g, b = px[x, y][:3]
                if px[x, y][3] and b >= r + 25 and g > 110 and (r + g + b) / 3 > 140:
                    px[x, y] = (0, 0, 0, 0)
    return c.crop(c.getbbox())


def main():
    hub = Image.open(V5 / "buildings/modular-hub.jpg").convert("RGB")
    # inner card windows (inside the frame), above the concrete slab
    cards = {
        "base/launchpad_flat.png": (34, 150, 226, 470),
        "base/surface_silo_flat.png": (290, 150, 482, 470),
        "base/hangar_flat.png": (812, 150, 994, 470),
    }
    for rel, box in cards.items():
        save(cutout(hub, box, enclosed=True), rel)

    bd = Image.open(V5 / "backdrops/space-backdrops.jpg").convert("RGB")
    quads = {
        "backgrounds/starmap.png": ((10, 10, 632, 350), (1024, 512)),
        "backgrounds/mining_asteroid_close.png": ((648, 10, 1272, 350), (600, 300)),
        "backgrounds/mining_asteroid_far.png": ((10, 366, 632, 708), (600, 300)),
        "backgrounds/mining_planet_exo.png": ((648, 366, 1272, 708), (600, 300)),
    }
    for rel, (box, size) in quads.items():
        save(bd.crop(box).resize(size, Image.LANCZOS), rel)


main()

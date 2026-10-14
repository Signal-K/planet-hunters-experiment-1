"""Base world: derive the web biome assets and the shared layout spec.

Inputs   docs/design/biomes/<biome>/*.png   (the delivered 2x layer art + manifest.json)
Outputs  web/public/game/assets/base-world/biomes/<biome>/*.webp
         web/public/game/assets/base-world/sky/clouds.webp
         shared/layout/base-world.json      (read by web/lib/base-world.ts and native BaseWorld.swift)

Everything the scene needs is expressed in "world units" (wu): the 1280x720 frame of the approved design
(docs/design/base-layout-tsp-v4.png). One wu is one design pixel; the renderers multiply by a viewport scale.

The ground art differs per biome (road 232-416 art px kerb to kerb), so each biome gets its own wu-per-pixel
factor that makes its road exactly ROAD wu tall. Run: python3 scripts/base_world_assets.py
"""
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/design/biomes"
OUT_WEB = ROOT / "web/public/game/assets/base-world"
OUT_SPEC = ROOT / "shared/layout/base-world.json"

# --- frame (design pixels) -------------------------------------------------------------------
REF_W, REF_H = 1280, 720
GROUND = 480          # y of the line structures stand on
APRON = 30            # paved apron between a structure's base and the road kerb
ROAD = 60             # kerb to kerb
KERB_TOP = GROUND + APRON
KERB_BOTTOM = KERB_TOP + ROAD

# --- world -----------------------------------------------------------------------------------
SLOT_COUNT = 10
PITCH = 320
MARGIN = 60
# Two of the ten slots are standing buildings (the Exchange and the Hangar); the other eight are build plots.
SLOTS = [
    {"slot": 0, "plot": 0}, {"slot": 1, "plot": 1},
    {"slot": 2, "fixed": "market"}, {"slot": 3, "fixed": "hangar"},
    {"slot": 4, "plot": 2}, {"slot": 5, "plot": 3}, {"slot": 6, "plot": 4},
    {"slot": 7, "plot": 5}, {"slot": 8, "plot": 6}, {"slot": 9, "plot": 7},
]

# art px per biome: kerb-to-kerb rows of the 2x ground layer, measured on the delivered files
# (kerb top edge, kerb bottom edge, first opaque row of the verge).
GROUND_ROWS = {
    "mountains": {"kerbTop": 141, "kerbBottom": 422, "firstOpaque": 40},
    "desert": {"kerbTop": 285, "kerbBottom": 568, "firstOpaque": 5},
    "tundra": {"kerbTop": 160, "kerbBottom": 576, "firstOpaque": 19},
    "coast": {"kerbTop": 217, "kerbBottom": 449, "firstOpaque": 31},
}
LABELS = {"mountains": "Mountains", "desert": "Desert", "tundra": "Tundra", "coast": "Coast"}
# wu per art px for the bands behind the ground (far, hills, treeline)
BAND_UNIT = 0.28
BAND_DEPTH = {"far": 0.1, "hills": 0.25, "treeline": 0.4}
BAND_STYLE = {
    ("coast", "far"): {"saturation": 0.78, "fadeTop": True},
}
DEFAULT_SATURATION = 0.92
PX_PER_WU = 3.0       # shipped web resolution
WEBP_QUALITY = 82

PROP_UNIT = 0.069     # wu per art px for rocks and shrubs
PROP_IDS = ["rock-1", "rock-2", "rock-3", "rock-4", "rock-5", "shrub-1", "shrub-2"]


def webp(img: Image.Image, path: Path, quality: int = WEBP_QUALITY, lossless: bool = False):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6, lossless=lossless)
    return path.stat().st_size


def resized(img: Image.Image, width_wu: float, height_wu: float) -> Image.Image:
    w, h = max(1, round(width_wu * PX_PER_WU)), max(1, round(height_wu * PX_PER_WU))
    return img.resize((w, h), Image.LANCZOS)


def round2(v: float) -> float:
    return round(v, 2)


def build_biome(name: str, manifest: dict) -> dict:
    rows = GROUND_ROWS[name]
    road_px = rows["kerbBottom"] - rows["kerbTop"]
    unit_g = ROAD / road_px
    entry = {"label": LABELS[name]}

    g_img = Image.open(SRC / name / "layer-ground.png").convert("RGBA")
    gw, gh = g_img.size
    ground = {
        "tileWidth": round2(gw * unit_g),
        "height": round2(gh * unit_g),
        # offsets from the top of the ground band, in wu
        "kerbTop": round2(rows["kerbTop"] * unit_g),
        "firstOpaque": round2(rows["firstOpaque"] * unit_g),
        "saturation": DEFAULT_SATURATION,
    }
    size = webp(resized(g_img, ground["tileWidth"], ground["height"]), OUT_WEB / "biomes" / name / "ground.webp")
    print(f"  {name}/ground {gw}x{gh} -> {round(ground['tileWidth'] * PX_PER_WU)}px  {size // 1024} KB  unit={unit_g:.4f}")
    entry["ground"] = ground

    bands = []
    for band_id in ("far", "hills", "treeline"):
        f = SRC / name / f"layer-{band_id}.png"
        if not f.exists():
            continue
        img = Image.open(f).convert("RGBA")
        bw, bh = img.size
        style = BAND_STYLE.get((name, band_id), {})
        band = {
            "id": band_id,
            "tileWidth": round2(bw * BAND_UNIT),
            "height": round2(bh * BAND_UNIT),
            "depth": BAND_DEPTH[band_id],
            "saturation": style.get("saturation", DEFAULT_SATURATION),
        }
        if style.get("fadeTop"):
            band["fadeTop"] = True
        size = webp(resized(img, band["tileWidth"], band["height"]), OUT_WEB / "biomes" / name / f"{band_id}.webp")
        print(f"  {name}/{band_id} {bw}x{bh} -> {round(band['tileWidth'] * PX_PER_WU)}px  {size // 1024} KB")
        bands.append(band)
    entry["bands"] = bands

    props = []
    for pid in PROP_IDS:
        f = SRC / name / f"{pid}.png"
        if not f.exists():
            continue
        m = next(x for x in manifest["files"] if x["file"] == f"{name}/{pid}.png")
        img = Image.open(f).convert("RGBA")
        w_wu, h_wu = img.width * PROP_UNIT, img.height * PROP_UNIT
        # props are small: ship them at 4 px per wu
        small = img.resize((max(1, round(w_wu * 4)), max(1, round(h_wu * 4))), Image.LANCZOS)
        webp(small, OUT_WEB / "biomes" / name / f"{pid}.webp", quality=88)
        props.append({
            "id": pid,
            "width": round2(w_wu),
            "height": round2(h_wu),
            "anchorX": round2(m["anchor"][0] * PROP_UNIT),
            "anchorY": round2(m["anchor"][1] * PROP_UNIT),
            "footprint": round2(m["footprint_width"] * PROP_UNIT),
        })
    if props:
        entry["props"] = props
        entry["propPlacements"] = place_props(name, props)

    entry["preview"] = make_preview(name, entry)
    return entry


def place_props(name: str, props: list) -> list:
    """A fixed scatter of rocks and shrubs across the whole world. The renderers drop any that would touch a
    standing building, so the list is data, not a random draw at runtime (web and native read the same one)."""
    rng = random.Random(f"landnam-base-{name}")
    world_w = MARGIN * 2 + PITCH * SLOT_COUNT
    placements, last_end = [], 0.0
    x = 20.0
    while x < world_w - 20:
        p = rng.choice(props)
        scale = round(rng.uniform(0.8, 1.35), 2)
        half = p["footprint"] * scale / 2
        cx = x + half
        if cx + half > world_w - 10:
            break
        placements.append({"id": p["id"], "x": round2(cx), "scale": scale, "flip": rng.random() < 0.5})
        x = cx + half + rng.uniform(46, 150)
    return placements


def make_preview(name: str, entry: dict) -> dict:
    """A small skyline thumbnail for the biome picker: sky, the back bands, the verge and the road, no structures."""
    W, H = 640, 300
    wu_to_px = W / 560.0
    sky = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(sky)
    top, mid, hor = (137, 173, 207), (171, 195, 219), (198, 215, 231)
    for y in range(H):
        t = y / (H - 1)
        c = tuple(round(top[i] + (mid[i] - top[i]) * min(1, t * 2)) if t < 0.5 else round(mid[i] + (hor[i] - mid[i]) * (t - 0.5) * 2) for i in range(3))
        d.line([(0, y), (W, y)], fill=c + (255,))
    g = entry["ground"]
    unit_top = H - 118  # where the ground band top sits in the thumbnail
    # bands back to front, bottoms stacked the way the scene stacks them
    band_by_id = {b["id"]: b for b in entry["bands"]}
    bottoms, bottom = {}, unit_top / wu_to_px + 0.02 * g["height"]
    for bid in ("treeline", "hills", "far"):
        if bid not in band_by_id:
            continue
        b = band_by_id[bid]
        bottoms[bid] = bottom
        bottom = bottom - (0.14 if bid == "treeline" else 0.62) * b["height"]
    for bid in ("far", "hills", "treeline"):
        if bid not in band_by_id:
            continue
        b = band_by_id[bid]
        im = Image.open(OUT_WEB / "biomes" / name / f"{bid}.webp").convert("RGBA")
        iw, ih = round(b["tileWidth"] * wu_to_px), round(b["height"] * wu_to_px)
        im = im.resize((iw, ih), Image.LANCZOS)
        y = round(bottoms[bid] * wu_to_px - ih)
        for x0 in range(-iw, W, iw):
            sky.alpha_composite(im, (x0, y)) if y >= 0 else sky.alpha_composite(im.crop((0, -y, iw, ih)), (x0, 0))
    gi = Image.open(OUT_WEB / "biomes" / name / "ground.webp").convert("RGBA")
    gw, gh = round(g["tileWidth"] * wu_to_px), round(g["height"] * wu_to_px)
    gi = gi.resize((gw, gh), Image.LANCZOS)
    for x0 in range(0, W, gw):
        sky.alpha_composite(gi, (x0, unit_top))
    out = OUT_WEB / "biomes" / name / "preview.webp"
    size = webp(sky.convert("RGB"), out, quality=80)
    print(f"  {name}/preview {W}x{H} {size // 1024} KB")
    return {"width": W, "height": H}


def make_clouds():
    """Tileable cloud strip: soft white banks on transparency, drawn with wrap-around so the ends meet."""
    W, H = 2048, 360
    rng = random.Random("landnam-base-clouds")
    layer = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    banks = 9
    for i in range(banks):
        cx = (i + rng.uniform(0.15, 0.85)) * W / banks
        cy = rng.uniform(70, H - 110)
        bank_w = rng.uniform(220, 420)
        puffs = rng.randint(6, 10)
        for _ in range(puffs):
            px = cx + rng.uniform(-bank_w / 2, bank_w / 2)
            r = rng.uniform(34, 70)
            py = cy + rng.uniform(-14, 14) - (1 - abs(px - cx) / (bank_w / 2)) * 22
            for wrap in (-W, 0, W):
                puff = Image.new("RGBA", (W, H), (255, 255, 255, 0))
                ImageDraw.Draw(puff).ellipse([px + wrap - r, py - r * 0.62, px + wrap + r, py + r * 0.62], fill=(255, 255, 255, 215))
                layer.alpha_composite(puff)
    # flat shaded underside and a little blur so edges stay soft
    shade = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    layer = Image.alpha_composite(layer, shade).filter(ImageFilter.GaussianBlur(7))
    px = layer.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (255 - min(24, y // 16), 255 - min(20, y // 18), 255 - min(8, y // 40), round(a * 0.92))
    size = webp(layer, OUT_WEB / "sky" / "clouds.webp", quality=84)
    print(f"  sky/clouds {W}x{H} {size // 1024} KB")
    return {"tileWidth": 1024, "height": 180}


def main():
    manifest = json.load(open(SRC / "manifest.json"))
    print("biomes")
    biomes = {name: build_biome(name, manifest) for name in GROUND_ROWS}
    print("sky")
    clouds = make_clouds()
    clouds.update({"depth": 0.05, "driftSeconds": 240})
    spec = {
        "version": 1,
        "unit": "wu",
        "note": "Generated by scripts/base_world_assets.py. Edit the script, not this file. Read by web/lib/base-world.ts and native/App/BaseWorld.swift; both must agree (see the layout fixtures).",
        "reference": {"width": REF_W, "height": REF_H},
        "ground": {"line": GROUND, "apron": APRON, "road": ROAD, "kerbTop": KERB_TOP, "kerbBottom": KERB_BOTTOM},
        "view": {
            "minVisibleWu": 480,
            "groundFraction": round(GROUND / REF_H, 4),
            "roadClearance": 8,
            "focusFraction": 0.38,
            "wheelLane": 46,
        },
        "world": {"slotCount": SLOT_COUNT, "pitch": PITCH, "margin": MARGIN},
        "slots": SLOTS,
        "sky": {"top": "#89ADCF", "mid": "#ABC3DB", "horizon": "#C6D7E7"},
        "clouds": clouds,
        "bandStack": {"treelineBottom": 0.02, "hillsOverTreeline": 0.14, "farOverHills": 0.62},
        "biomes": biomes,
    }
    OUT_SPEC.parent.mkdir(parents=True, exist_ok=True)
    OUT_SPEC.write_text(json.dumps(spec, indent=2) + "\n")
    print("wrote", OUT_SPEC.relative_to(ROOT))


if __name__ == "__main__":
    sys.exit(main())

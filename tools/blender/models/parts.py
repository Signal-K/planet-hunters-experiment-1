"""Rocket-hangar shop icons — the part cards in RocketPurchaseScreen/AssemblyScreen.

`basic_hull_t1.png` and `starter_rocket_t1.png` are, byte for byte, the same
file: an AI-generated concept-art sheet (grey/red palette, gradient shading,
four unrelated sub-panel compositions baked into one image) standing in for a
single shop icon. At 1024x1024/552 KB each they were also ~100x the size and
resolution of every sibling icon in this set. Re-rendered here in the same
"cartridge module" language the hand-made icons already use — beveled block
body, dark end caps, one accent stripe, drop shadow — so the two purchasable
hull tiers actually look like they belong to the same game as
`basic_thruster_t1`/`reinforced_hull_t2`.

The rest of the shop icon set (basic_nav_t1, cargo_bay_t1, comms_relay_t1,
fusion_drive_t2, ...) is hand-made art that is already within the size budget
and on-style. Leaving those as-is is a scope decision, not an oversight — see
the Blender-pipeline decision doc's note on extending into `web/parts/`.
"""

import landnam_kit as kit

T = kit.TOKENS


def solid(*args, **kwargs):
    """kit.solid with grain on by default — see kit's emission_material
    docstring and ships.py's identical wrapper for why."""
    kwargs.setdefault("grain", True)
    return kit.solid(*args, **kwargs)


def _module_icon(accent_hex, band_hex, lens_hex, banded, ribs):
    """Shared cartridge-module body every shop icon in this file uses, varied
    only by accent colour and how "reinforced" it should read.

    First pass left this almost monochrome (hull + hull_dark + one stripe) —
    every non-amber token now earns its own visual job: the reinforcement
    bands and a status lens are separate hues from the stripe rather than
    reusing hull_dark for everything that isn't the accent."""
    body = kit.box("body", (1.6, 0.9, 0.62), bevel=0.08)
    solid("body", body, T["hull"], "hull")

    for sx in (-0.78, 0.78):
        cap = kit.box("cap", (0.18, 0.98, 0.7), location=(sx, 0, 0), bevel=0.03)
        solid("cap", cap, T["hull_dark"], "hulldark")

    stripe = kit.box("stripe", (0.9, 0.05, 0.08), location=(0, -0.44, 0.1))
    solid("stripe", stripe, accent_hex, "accent", outline=0.006)

    if banded:
        # Extra rim bands read as reinforced plating — the silhouette cue
        # that separates the locked-tier teaser from the starter hull below.
        # Rust rather than hull_dark: plating that's taken a beating, not
        # just another structural panel.
        for dx in (-0.42, 0.42):
            band = kit.box("band", (0.06, 0.94, 0.66), location=(dx, 0, 0))
            solid("band", band, band_hex, "band", outline=0)

    for i in range(ribs):
        t = i / max(ribs - 1, 1)
        rx = -0.55 + t * 1.1
        rib = kit.box("rib", (0.04, 0.02, 0.46), location=(rx, 0.44, 0.06))
        solid("rib", rib, T["steel"], "steel", outline=0)

    # Status lens — a small inset light, the "this module is powered" cue the
    # sibling hand-made icons (basic_thruster_t1's orange dot) already use.
    lens_rim = kit.cylinder("lens_rim", 0.12, 0.05, location=(0.6, -0.44, 0.32),
                            rotation=(1.5708, 0, 0), verts=10)
    solid("lens_rim", lens_rim, T["hull_dark"], "hulldark", outline=0.006)
    lens = kit.cylinder("lens", 0.08, 0.03, location=(0.6, -0.47, 0.32),
                        rotation=(1.5708, 0, 0), verts=10)
    solid("lens", lens, lens_hex, "lens", outline=0)

    return dict(layout=(160, 160), ortho=1.7, mode="flat", target=(0, 0, 0.12))


def basic_hull_t1():
    """Locked-tier teaser (sr3/sr4/sr5 in rockets.ts) — steel accent, rust
    reinforcement banding, dark unlit lens (it's locked, not powered up —
    steel read too close to the starter hull's cyan_bright lens at icon
    scale, so this needs to be dark rather than just a dimmer bright)."""
    return _module_icon(T["steel"], T["rust"], T["hull_dark"], banded=True, ribs=5)


def starter_rocket_t1():
    """Hull MK1 — the actual purchasable starting chassis (parts.ts
    `hull-mk1`). Cyan accent, no reinforcement banding, bright cyan lens —
    this one's live."""
    return _module_icon(T["cyan"], T["hull_dark"], T["cyan_bright"], banded=False, ribs=3)


BUILDS = {
    "../../parts/basic_hull_t1": basic_hull_t1,
    "../../parts/starter_rocket_t1": starter_rocket_t1,
}

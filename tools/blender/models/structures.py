"""Earth Base structures — every building, one art language.

Liam, 2026-08-26 (KES-260): *"Completely remove all structure assets... Then,
create the structures in blender. Use a consistent style all the time."*

This replaces `hub_structures.py` and `launchpad.py`, which between them had
accumulated four generations of launch pad (`pad_complex`, `_v2`, `_v3`, `_v4`),
four hangars, two "modular_v2" rewrites, and a set of one-off props each
authored at its own camera mode, its own ortho scale and its own outline weight.
That inconsistency is most of why the base read as "sprites pasted on top of a
background image": nothing shared a horizon, a ground plane, or a size.

Three rules hold the style together, and none of them are negotiable per-model:

**1. One scale.** `_spec()` derives every sprite's layout size from its size in
Blender units via `PX_PER_UNIT`, so a 4-unit-wide refinery is exactly twice the
pixels of a 2-unit-wide scanner. Previously each model picked its own `layout`
and `ortho` by eye, so relative building sizes were arbitrary — a scan dish came
out nearly as large as a launch complex.

**2. One camera.** `mode="side"` throughout, so every structure shares the same
shallow oblique and sits on the same implied ground plane as the terrain kit.

**3. One ground.** Every structure stands on a `_raft` — a visible concrete
apron that reaches past its footprint. A building whose walls stop dead at the
sprite's bottom edge always reads as a cut-out; an apron gives it a footing that
the scene's ground line can meet.

No `grain=True` anywhere. The terrain kit is ungrained, and grain on one half of
a composition is precisely the "different styles between the buildings in the
background and in the foreground" the rebuild exists to fix.
"""

import math

import landnam_kit as kit

T = kit.TOKENS

# --- Shared scale ------------------------------------------------------------
# CSS pixels per Blender unit, at the Hub's establishing-shot zoom. One constant
# is what makes the buildings agree with each other and with the terrain kit.
PX_PER_UNIT = 26.0


def _spec(w_units, h_units, target_z=None):
    """Layout + ortho for a structure of a given size in world units.

    `ortho_scale` maps to the *larger* render dimension under Blender's AUTO
    sensor fit, so it has to be max(w, h) or tall sprites silently render at a
    different zoom from wide ones — which is exactly how the old per-model
    eyeballed values drifted apart.
    """
    return dict(
        layout=(round(w_units * PX_PER_UNIT), round(h_units * PX_PER_UNIT)),
        ortho=max(w_units, h_units),
        mode="side",
        target=(0, 0, target_z if target_z is not None else h_units * 0.42),
    )


# --- Shared material vocabulary ----------------------------------------------
SHELL = kit.tint(T["steel"], 1.06)
SHELL_DARK = kit.tint(T["steel"], 0.72)
INK = T["hull_dark"]
RUST = T["rust"]
WARM = kit.tint(T["amber"], 0.88)
CONCRETE = kit.tint(T["steel"], 0.86)
GLASS = T["cyan"]
GLASS_LIT = T["cyan_bright"]

OUTLINE = 0.011      # one weight for every structure, always
OUTLINE_FINE = 0.006  # detail parts only, where the main weight would blob


def _raft(w, d=1.15, h=0.22, x=0.0):
    """The concrete apron every structure stands on.

    This is the single most load-bearing piece of the rebuild. Without it a
    building's wall meets the sprite's bottom edge as a hard horizontal cut, and
    no amount of shadow underneath will stop it reading as a sticker. With it,
    the structure has a footing that visibly spreads onto the ground.
    """
    slab = kit.box("raft", (w, d, h), location=(x, 0, 0), bevel=0.05)
    kit.solid("raft", slab, CONCRETE, "concrete", outline=OUTLINE)
    lip = kit.box("raft_lip", (w * 0.94, d * 0.78, 0.07), location=(x, -0.12, h), bevel=0.03)
    kit.solid("raft_lip", lip, SHELL_DARK, "shelldark", outline=OUTLINE_FINE)
    return slab


def _wall(name, w, d, h, x=0.0, y=0.0, z=0.0, color=None, key="shell", lean=0.0):
    b = kit.box(name, (w, d, h), location=(x, y, z), rotation=(0, lean, 0), bevel=0.06)
    return kit.solid(name, b, color or SHELL, key, outline=OUTLINE)


def _roof(name, w, d, x, y, z, tilt, color=None, key="ink"):
    b = kit.box(name, (w, d, 0.16), location=(x, y, z), rotation=(0, tilt, 0), bevel=0.04)
    return kit.solid(name, b, color or INK, key, outline=OUTLINE)


def _windows(name, count, x0, z, step, y=-0.5, w=0.3, h=0.26, lit=False):
    """A run of lit window panes. Small, flat, hard-edged — the cue that a shape
    is an occupied building rather than a crate."""
    for i in range(count):
        p = kit.box(name, (w, 0.08, h), location=(x0 + i * step, y, z), bevel=0.02)
        kit.solid(name, p, GLASS_LIT if lit else GLASS, "glasslit" if lit else "glass",
                  outline=OUTLINE_FINE)


def _tank(name, x, r, h, y=0.0, z=0.0, color=None):
    body = kit.cylinder(name, r, h, location=(x, y, z), verts=9)
    kit.solid(name, body, color or SHELL, "shell", outline=OUTLINE)
    dome = kit.cone(f"{name}_dome", r, r * 0.55, location=(x, y, z + h), verts=9, radius2=r * 0.4)
    kit.solid(f"{name}_dome", dome, SHELL_DARK, "shelldark", outline=OUTLINE)
    band = kit.cylinder(f"{name}_band", r * 1.04, 0.1, location=(x, y, z + h * 0.55), verts=9)
    kit.solid(f"{name}_band", band, RUST, "rust", outline=0)
    return body


def _lattice(name, x, h, w=0.62, bays=5, y=0.0, lean=0.0):
    """Open cross-braced tower. Modelled, not faked — the silhouette is the
    whole point of a gantry; a solid box at this size reads as a chimney."""
    for sx in (-w / 2, w / 2):
        leg = kit.box(f"{name}_leg", (0.09, 0.16, h), location=(x + sx, y, 0),
                      rotation=(0, lean if sx > 0 else -lean, 0))
        kit.solid(f"{name}_leg", leg, INK, "ink", outline=OUTLINE_FINE)
    bay = h / bays
    for b in range(bays):
        z = b * bay
        ring = kit.box(f"{name}_ring", (w, 0.11, 0.08), location=(x, y - 0.03, z + bay))
        kit.solid(f"{name}_ring", ring, INK, "ink", outline=OUTLINE_FINE)
        for sign in (1, -1):
            d = kit.box(f"{name}_x", (0.06, 0.06, bay * 1.22),
                        location=(x, y - 0.06, z + bay * 0.5), rotation=(0, sign * 0.6, 0))
            kit.solid(f"{name}_x", d, SHELL_DARK, "shelldark", outline=0)


def _beam(name, x, y, z, length, angle, thick, depth, color, key):
    b = kit.box(name, (length, depth, thick), location=(x, y, z), rotation=(0, angle, 0),
                bevel=thick * 0.14)
    return kit.solid(name, b, color, key, outline=OUTLINE_FINE)


# --- Launch complex ----------------------------------------------------------

def launchpad():
    """The launch complex: service tower, strongback, flame deck, prop farm.

    Carried over in spirit from `pad_complex_v4`, re-cut to the shared scale and
    stripped of grain. The pad is authored **empty** — the vehicle is real game
    state the scene overlays only when a launch is pending, which is also why
    the umbilical arms sit stowed-open rather than clasped around nothing.
    """
    W, H = 9.4, 6.6
    _raft(W, d=1.2, h=0.24)

    # Flame deck and trench, slightly off-centre so the complex is not
    # symmetrical about its own middle.
    deck = kit.box("pad_deck", (7.4, 0.9, 0.3), location=(-0.45, -0.16, 0.24), bevel=0.06)
    kit.solid("pad_deck", deck, SHELL_DARK, "shelldark", outline=OUTLINE)
    ring = kit.cylinder("flame_ring", 0.8, 0.22, location=(0.25, -0.3, 0.54), verts=10)
    kit.solid("flame_ring", ring, RUST, "rust", outline=OUTLINE)
    throat = kit.cylinder("flame_throat", 0.46, 0.26, location=(0.25, -0.31, 0.64), verts=10)
    kit.solid("flame_throat", throat, T["void"], "void", outline=OUTLINE)
    for i in range(5):
        chev = kit.box("deck_chevron", (0.34, 0.1, 0.04), location=(-3.2 + i * 0.55, -0.58, 0.55))
        kit.solid("deck_chevron", chev, WARM, "warm", outline=0)

    # Service tower — tapered lattice with platforms at uneven heights.
    tx = -2.4
    _lattice("tower", tx, 5.5, w=1.35, bays=6, y=0.05, lean=0.035)
    spine = kit.box("tower_spine", (0.5, 0.6, 4.9), location=(tx, 0.2, 0.4), bevel=0.07)
    kit.solid("tower_spine", spine, RUST, "rust", outline=OUTLINE)
    for i, (z, w) in enumerate(((1.25, 1.75), (2.2, 2.3), (3.2, 1.85), (4.15, 2.4))):
        pf = kit.box("platform", (w, 0.7, 0.16), location=(tx + (0.1 if i % 2 else -0.1), -0.18, z), bevel=0.04)
        kit.solid("platform", pf, SHELL if i % 2 == 0 else SHELL_DARK, "shell" if i % 2 == 0 else "shelldark", outline=OUTLINE)
        _beam("platform_rail", tx, -0.56, z + 0.26, w * 0.85, 0, 0.08, 0.07, WARM, "warm")
    cap = kit.box("tower_cap", (1.8, 0.8, 0.3), location=(tx - 0.06, 0.04, 5.5), rotation=(0, -0.05, 0), bevel=0.07)
    kit.solid("tower_cap", cap, WARM, "warm", outline=OUTLINE)
    _windows("tower_win", 3, tx - 0.55, 4.55, 0.5, y=-0.5, lit=True)

    # Strongback and two unequal umbilical arms enclosing the (empty) slot.
    sx = 1.0
    low = kit.box("strongback", (0.52, 0.6, 2.2), location=(sx, 0.06, 0.54), rotation=(0, -0.07, 0), bevel=0.07)
    kit.solid("strongback", low, INK, "ink", outline=OUTLINE)
    up = kit.box("strongback_up", (0.42, 0.55, 2.0), location=(sx - 0.2, 0.07, 2.6), rotation=(0, -0.15, 0), bevel=0.06)
    kit.solid("strongback_up", up, RUST, "rust", outline=OUTLINE)
    for z, ln, ang in ((2.25, 2.3, -0.04), (3.95, 2.6, 0.08)):
        _beam("umbilical", -0.35, -0.44, z, ln, ang, 0.24, 0.32, RUST, "rust")
        head = kit.box("umbilical_head", (0.4, 0.4, 0.48),
                       location=(-1.5 if z < 3 else -1.66, -0.45, z - 0.1),
                       rotation=(0, ang, 0), bevel=0.07)
        kit.solid("umbilical_head", head, WARM, "warm", outline=OUTLINE)
    for x, z, ln, ang in ((0.2, 1.95, 0.72, -0.2), (-0.4, 1.78, 0.58, 0.06)):
        _beam("hose", x, -0.66, z, ln, ang, 0.07, 0.07, GLASS, "glass")

    # Hold-downs and a service cart keep the pad reading as operational.
    for hx, lean in ((-0.25, -0.22), (0.7, 0.22)):
        c = kit.box("hold_down", (0.32, 0.4, 0.66), location=(hx, -0.4, 0.66), rotation=(0, lean, 0), bevel=0.05)
        kit.solid("hold_down", c, RUST, "rust", outline=OUTLINE)
    cart = kit.box("service_cart", (0.6, 0.55, 0.36), location=(-1.05, -0.42, 0.52), bevel=0.07)
    kit.solid("service_cart", cart, WARM, "warm", outline=OUTLINE)
    for wx in (-0.18, 0.18):
        wh = kit.cylinder("cart_wheel", 0.11, 0.1, location=(-1.05 + wx, -0.66, 0.44), rotation=(1.5708, 0, 0), verts=8)
        kit.solid("cart_wheel", wh, T["void"], "void", outline=OUTLINE_FINE)

    # Propellant farm — a family of different vessels, piped back to the deck.
    _tank("prop_a", 2.55, 0.48, 1.45, y=0.1, z=0.5)
    _tank("prop_b", 3.5, 0.62, 2.0, y=0.1, z=0.5)
    for x, z, ln, ang in ((2.95, 0.92, 1.8, 0), (2.1, 0.92, 0.75, 0), (1.5, 0.82, 0.66, -0.22)):
        _beam("feed_pipe", x, -0.46, z, ln, ang, 0.11, 0.12, WARM, "warm")

    # A single leaning lightning mast finishes the silhouette.
    mast = kit.box("mast", (0.14, 0.17, 4.4), location=(4.4, 0.1, 0.48), rotation=(0, -0.05, 0), bevel=0.02)
    kit.solid("mast", mast, INK, "ink", outline=OUTLINE_FINE)
    tip = kit.cone("mast_tip", 0.16, 0.5, location=(4.18, 0.1, 4.85), verts=6, radius2=0.02)
    kit.solid("mast_tip", tip, WARM, "warm", outline=OUTLINE_FINE)
    return _spec(W, H, target_z=2.7)


def hangar():
    """Vehicle assembly hangar with an open bay and a readable cutaway."""
    W, H = 8.0, 5.4
    _raft(W, d=1.15, h=0.24)

    opening = kit.box("bay_void", (5.8, 0.4, 3.4), location=(-0.6, 0.1, 0.4), bevel=0.09)
    kit.solid("bay_void", opening, T["void"], "void", outline=OUTLINE)

    _wall("spine", 0.8, 0.9, 4.2, x=-3.65, y=0.05, z=0.24, color=RUST, key="rust")
    _wall("jamb", 0.48, 0.8, 3.7, x=2.5, y=0.06, z=0.24)
    _roof("roof_l", 3.8, 0.95, -2.2, 0.08, 4.3, -0.22)
    _roof("roof_r", 3.1, 0.95, 0.95, 0.08, 4.26, 0.18)
    ridge = kit.box("ridge", (0.55, 1.0, 0.55), location=(-0.62, 0.08, 4.62), rotation=(0, -0.05, 0), bevel=0.07)
    kit.solid("ridge", ridge, RUST, "rust", outline=OUTLINE)

    # Raised segmented blast door.
    for i, (z, w) in enumerate(((3.2, 5.7), (3.48, 5.4), (3.76, 5.05))):
        leaf = kit.box("door_leaf", (w, 0.18, 0.22), location=(-0.62 + i * 0.06, -0.44, z), bevel=0.04)
        kit.solid("door_leaf", leaf, SHELL_DARK if i != 1 else SHELL, "shelldark" if i != 1 else "shell", outline=OUTLINE_FINE)

    # Interior: catwalk, travelling crane, benches — the storytelling that makes
    # the bay a workshop rather than a black rectangle.
    cat = kit.box("catwalk", (4.9, 0.3, 0.15), location=(-0.7, -0.48, 2.2), bevel=0.03)
    kit.solid("catwalk", cat, RUST, "rust", outline=OUTLINE_FINE)
    _beam("catwalk_rail", -0.7, -0.6, 2.48, 4.8, 0, 0.09, 0.07, WARM, "warm")
    crane = kit.box("crane", (5.2, 0.32, 0.28), location=(-0.5, -0.62, 2.85), bevel=0.05)
    kit.solid("crane", crane, WARM, "warm", outline=OUTLINE_FINE)
    trolley = kit.box("trolley", (0.68, 0.42, 0.44), location=(0.35, -0.68, 2.5), bevel=0.07)
    kit.solid("trolley", trolley, RUST, "rust", outline=OUTLINE_FINE)
    for bx, bw in ((-2.0, 1.05), (-0.35, 1.3), (1.0, 0.85)):
        bench = kit.box("bench", (bw, 0.32, 0.2), location=(bx, -0.6, 0.62), bevel=0.04)
        kit.solid("bench", bench, RUST, "rust", outline=OUTLINE_FINE)
    for lx in (-2.8, -1.4, 0.15, 1.6):
        lamp = kit.box("work_light", (0.42, 0.12, 0.14), location=(lx, -0.72, 2.62), bevel=0.03)
        kit.solid("work_light", lamp, GLASS_LIT, "glasslit", outline=0)

    # Low workshop wing breaks the big-barn silhouette.
    _wall("wing", 1.9, 0.95, 2.3, x=3.25, y=0.04, z=0.24, color=SHELL_DARK, key="shelldark")
    _roof("wing_roof", 2.15, 1.05, 3.2, 0.03, 2.6, 0.1)
    _windows("wing_win", 3, 2.75, 1.35, 0.55, y=-0.52, lit=True)
    vent = kit.cylinder("vent", 0.24, 0.5, location=(2.5, 0.04, 2.86), verts=6)
    kit.solid("vent", vent, WARM, "warm", outline=OUTLINE_FINE)
    return _spec(W, H, target_z=2.3)


# --- Support structures ------------------------------------------------------

def refinery():
    """Ore processing: vessels, a stack, a conveyor feeding in from the left."""
    W, H = 5.2, 4.0
    _raft(W, d=1.05, h=0.2)
    _tank("ref_a", -1.15, 0.62, 1.85, y=0.05, z=0.2)
    _tank("ref_b", 0.15, 0.44, 1.3, y=0.1, z=0.2)
    _wall("ref_block", 1.5, 0.9, 1.5, x=1.55, y=0.05, z=0.2, color=SHELL_DARK, key="shelldark")
    _roof("ref_roof", 1.7, 1.0, 1.5, 0.04, 1.7, 0.08)
    _windows("ref_win", 3, 1.05, 0.9, 0.46, y=-0.5, lit=True)

    # Stack — the one tall element, so the silhouette is not a row of equals.
    stack = kit.cylinder("stack", 0.26, 3.1, location=(2.3, 0.1, 0.2), verts=8)
    kit.solid("stack", stack, SHELL, "shell", outline=OUTLINE)
    for z in (1.5, 2.4):
        band = kit.cylinder("stack_band", 0.29, 0.14, location=(2.3, 0.1, z), verts=8)
        kit.solid("stack_band", band, RUST, "rust", outline=0)

    # Conveyor running in from off-sprite: says "ore arrives here".
    _beam("conveyor", -2.15, -0.4, 1.15, 2.0, 0.34, 0.16, 0.4, INK, "ink")
    for i in range(3):
        leg = kit.box("conv_leg", (0.08, 0.1, 0.75 + i * 0.22), location=(-2.75 + i * 0.6, -0.4, 0.2))
        kit.solid("conv_leg", leg, INK, "ink", outline=OUTLINE_FINE)
    for x, z, ln in ((-0.4, 1.3, 0.7), (-0.85, 1.55, 0.6)):
        _beam("ref_pipe", x, -0.5, z, ln, 0.0, 0.09, 0.09, WARM, "warm")
    return _spec(W, H, target_z=1.55)


def scan_station():
    """Ground survey station: a tracking dish on a braced mount plus a cabin."""
    W, H = 3.8, 4.2
    _raft(W, d=1.0, h=0.2)
    _wall("scan_cabin", 1.3, 0.85, 1.15, x=-1.0, y=0.05, z=0.2, color=SHELL, key="shell")
    _roof("scan_roof", 1.5, 0.95, -1.0, 0.04, 1.35, -0.09)
    _windows("scan_win", 2, -1.25, 0.75, 0.48, y=-0.48, lit=True)

    # Mount: three splayed legs, not two — a two-legged tripod reads as a
    # sawhorse and was the old sprite's clearest flaw.
    for ang, lean in ((-0.34, -0.3), (0.0, 0.0), (0.34, 0.3)):
        leg = kit.box("dish_leg", (0.1, 0.12, 1.5), location=(0.85 + ang, 0.05 + ang * 0.3, 0.2),
                      rotation=(0, lean, 0))
        kit.solid("dish_leg", leg, INK, "ink", outline=OUTLINE_FINE)
    hub = kit.cylinder("dish_hub", 0.22, 0.3, location=(0.85, 0.05, 1.68), verts=8)
    kit.solid("dish_hub", hub, RUST, "rust", outline=OUTLINE)
    dish = kit.cone("dish", 1.0, 0.52, location=(0.9, 0.05, 1.95), rotation=(0, -0.55, 0), verts=11, radius2=0.14)
    kit.solid("dish", dish, SHELL, "shell", outline=OUTLINE)
    feed = kit.box("dish_feed", (0.07, 0.07, 0.62), location=(0.5, 0.02, 2.25), rotation=(0, -0.55, 0))
    kit.solid("dish_feed", feed, INK, "ink", outline=OUTLINE_FINE)
    return _spec(W, H, target_z=1.7)


def command():
    """Mission control: a low bunker block with a glazed upper floor and mast."""
    W, H = 4.6, 4.4
    _raft(W, d=1.05, h=0.2)
    _wall("cmd_base", 3.1, 0.95, 1.25, x=-0.15, y=0.05, z=0.2, color=CONCRETE, key="concrete")
    _wall("cmd_upper", 2.45, 0.85, 0.95, x=-0.25, y=0.0, z=1.45, color=SHELL, key="shell")
    _roof("cmd_roof", 2.75, 0.98, -0.25, 0.02, 2.4, 0.0)
    # Continuous glazing band — the "control room" cue.
    _windows("cmd_glass", 5, -1.25, 1.9, 0.5, y=-0.46, lit=True)
    _windows("cmd_low", 4, -1.35, 0.72, 0.55, y=-0.5, lit=False)

    dome = kit.cone("cmd_dome", 0.62, 0.55, location=(0.75, 0.05, 2.4), verts=9, radius2=0.16)
    kit.solid("cmd_dome", dome, SHELL_DARK, "shelldark", outline=OUTLINE)
    _lattice("cmd_mast", 1.75, 3.4, w=0.4, bays=5, y=0.1)
    beacon = kit.cone("cmd_beacon", 0.13, 0.36, location=(1.75, 0.1, 3.4), verts=6, radius2=0.03)
    kit.solid("cmd_beacon", beacon, T["crimson"], "crimson", outline=OUTLINE_FINE)
    ant = kit.cone("cmd_ant", 0.42, 0.24, location=(-1.7, 0.05, 2.45), rotation=(0, -0.6, 0), verts=8, radius2=0.08)
    kit.solid("cmd_ant", ant, SHELL, "shell", outline=OUTLINE_FINE)
    return _spec(W, H, target_z=1.75)


def deep_space_telescope():
    """Observatory: a slotted rotating dome on a drum, with a service annex."""
    W, H = 4.4, 4.0
    _raft(W, d=1.05, h=0.2)
    drum = kit.cylinder("obs_drum", 1.25, 1.5, location=(-0.35, 0.05, 0.2), verts=12)
    kit.solid("obs_drum", drum, CONCRETE, "concrete", outline=OUTLINE)
    dome = kit.cone("obs_dome", 1.3, 1.15, location=(-0.35, 0.05, 1.7), verts=12, radius2=0.42)
    kit.solid("obs_dome", dome, SHELL, "shell", outline=OUTLINE)
    # The slot — an observatory without an open shutter is a silo.
    slot = kit.box("obs_slot", (0.42, 0.5, 1.35), location=(-0.5, -0.85, 1.75), rotation=(0, 0.12, 0), bevel=0.03)
    kit.solid("obs_slot", slot, T["void"], "void", outline=OUTLINE)
    tube = kit.cylinder("obs_tube", 0.2, 1.1, location=(-0.5, -0.7, 2.0), rotation=(0.9, 0, 0.1), verts=8)
    kit.solid("obs_tube", tube, INK, "ink", outline=OUTLINE_FINE)
    for i in range(9):
        a = i * (math.tau / 9)
        rib = kit.box("obs_rib", (0.07, 0.07, 0.16), location=(-0.35 + math.cos(a) * 1.26, 0.05 + math.sin(a) * 0.7, 1.62))
        kit.solid("obs_rib", rib, SHELL_DARK, "shelldark", outline=0)
    _wall("obs_annex", 1.35, 0.85, 1.0, x=1.55, y=0.05, z=0.2, color=SHELL_DARK, key="shelldark")
    _roof("obs_annex_roof", 1.55, 0.95, 1.55, 0.04, 1.2, 0.07)
    _windows("obs_win", 3, 1.1, 0.72, 0.44, y=-0.48, lit=True)
    return _spec(W, H, target_z=1.75)


def astronaut_academy():
    """Crew training: a habitat block, a centrifuge arm, and a mock capsule."""
    W, H = 5.0, 3.6
    _raft(W, d=1.05, h=0.2)
    _wall("aca_block", 2.4, 0.95, 1.55, x=-1.05, y=0.05, z=0.2)
    _roof("aca_roof", 2.65, 1.05, -1.05, 0.04, 1.75, -0.06)
    _windows("aca_win", 4, -1.9, 1.15, 0.52, y=-0.5, lit=True)
    _windows("aca_win2", 4, -1.9, 0.66, 0.52, y=-0.5, lit=False)
    entry = kit.box("aca_entry", (0.5, 0.3, 0.75), location=(0.0, -0.55, 0.2), bevel=0.04)
    kit.solid("aca_entry", entry, WARM, "warm", outline=OUTLINE)

    # Centrifuge — the one piece that says "training", not "office".
    post = kit.cylinder("cent_post", 0.22, 1.5, location=(1.5, 0.05, 0.2), verts=8)
    kit.solid("cent_post", post, INK, "ink", outline=OUTLINE)
    _beam("cent_arm", 1.5, -0.3, 1.75, 2.1, 0.11, 0.14, 0.24, RUST, "rust")
    pod = kit.box("cent_pod", (0.55, 0.42, 0.42), location=(2.45, -0.3, 1.88), rotation=(0, 0.11, 0), bevel=0.09)
    kit.solid("cent_pod", pod, SHELL, "shell", outline=OUTLINE)
    counter = kit.box("cent_counter", (0.3, 0.3, 0.3), location=(0.62, -0.3, 1.62), bevel=0.06)
    kit.solid("cent_counter", counter, SHELL_DARK, "shelldark", outline=OUTLINE_FINE)

    capsule = kit.cylinder("mock_capsule", 0.38, 0.85, location=(-2.4, -0.42, 0.2), rotation=(0, 1.5708, 0), verts=9)
    kit.solid("mock_capsule", capsule, SHELL_DARK, "shelldark", outline=OUTLINE)
    return _spec(W, H, target_z=1.5)


BUILDS = {
    "hub/launchpad": launchpad,
    "hub/hangar": hangar,
    "hub/refinery": refinery,
    "hub/scan_station": scan_station,
    "hub/command": command,
    "hub/deep_space_telescope": deep_space_telescope,
    "hub/astronaut_academy": astronaut_academy,
}

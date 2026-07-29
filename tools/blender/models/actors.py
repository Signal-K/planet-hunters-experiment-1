"""Crew actors — drone and rover.

Neither exists as art anywhere in the project. `ACTOR_ARCHETYPES` declares all
three classes (astronaut, rover, drone) and the roster will need to show them,
but there is no `AssetManager` entry for either machine.

Rendered **isometric**, not flat elevation: both are things that sit on ground —
a target surface for the rover, a base pad for the drone — so they have to agree
with takeon's terrain angle. `kit.ISO_PITCH` is derived from takeon's 32x16 tile
metrics rather than assumed to be true isometric; see landnam_kit.

Astronauts get no sprite. Q31 of the academy question set: "Let's keep it simple
for now, just names." Typographic identity only — do not add one speculatively.
"""

import landnam_kit as kit

T = kit.TOKENS


def rover():
    """Six-wheeled surface rover. Reads at 64x48 in the roster and on a site."""
    chassis = kit.box("chassis", (1.6, 1.0, 0.42), location=(0, 0, 0.34), bevel=0.05)
    kit.solid("chassis", chassis, T["hull"], "hull")

    deck = kit.box("deck", (1.0, 0.8, 0.3), location=(-0.15, 0, 0.76), bevel=0.04)
    kit.solid("deck", deck, T["surface_3"], "surface3")

    # Solar panel — the silhouette cue that reads "rover" at sprite size.
    panel = kit.box("panel", (1.25, 0.95, 0.07), location=(-0.15, 0, 1.08))
    kit.solid("panel", panel, T["cyan"], "cyan", outline=0.008)

    mast = kit.box("mast", (0.1, 0.1, 0.5), location=(0.5, 0, 0.76))
    kit.solid("mast", mast, T["steel"], "steel", outline=0.008)
    head = kit.box("head", (0.26, 0.22, 0.2), location=(0.5, 0, 1.26))
    kit.solid("head", head, T["hull_dark"], "hulldark")
    lens = kit.box("lens", (0.08, 0.06, 0.08), location=(0.62, 0, 1.34))
    kit.solid("lens", lens, T["cyan_bright"], "cyanbright", outline=0)

    for sx in (-0.55, 0.0, 0.55):
        for sy in (-0.58, 0.58):
            wheel = kit.cylinder("wheel", 0.3, 0.18, location=(sx, sy, 0.3),
                                 rotation=(1.5708, 0, 0), verts=8)
            kit.solid("wheel", wheel, T["hull_dark"], "hulldark", outline=0.01)

    return dict(layout=(64, 48), ortho=3.0, mode="iso", target=(0, 0, 0.5))


def drone():
    """Quadrotor building drone. Reads at 48x48."""
    body = kit.box("body", (0.62, 0.62, 0.34), location=(0, 0, 0.5), bevel=0.06)
    kit.solid("body", body, T["surface_3"], "surface3")

    eye = kit.box("eye", (0.2, 0.06, 0.14), location=(0, -0.33, 0.62))
    kit.solid("eye", eye, T["amber"], "amber", outline=0)

    for sx in (-1, 1):
        for sy in (-1, 1):
            ax, ay = sx * 0.52, sy * 0.52
            arm = kit.box("arm", (0.62, 0.12, 0.08), location=(ax * 0.5, ay * 0.5, 0.62),
                          rotation=(0, 0, 0.7854 * (1 if sx * sy > 0 else -1)))
            kit.solid("arm", arm, T["hull_dark"], "hulldark", outline=0.008)
            # Rotor discs are flat and semi-transparent — a spinning blade
            # rendered solid reads as a plate.
            rotor = kit.cylinder("rotor", 0.3, 0.03, location=(ax, ay, 0.72), verts=10)
            rotor.name = "rotor"
            kit.apply_facets(rotor, T["cyan_bright"], "cyanbright")
            hub = kit.cylinder("rhub", 0.07, 0.1, location=(ax, ay, 0.7), verts=6)
            kit.solid("rhub", hub, T["steel"], "steel", outline=0)

    for sx in (-0.3, 0.3):
        leg = kit.box("leg", (0.07, 0.07, 0.34), location=(sx, 0, 0.16))
        kit.solid("leg", leg, T["hull_dark"], "hulldark", outline=0.008)

    return dict(layout=(48, 48), ortho=2.1, mode="iso", target=(0, 0, 0.5))


BUILDS = {
    "actors/rover": rover,
    "actors/drone": drone,
}

"""Blender-authored rocket family sprites.

Explorer and Prospector intentionally share one body language: the same nose,
pressure hull, service band, wing root and engine silhouette are re-used in
operational and blueprint renders. Only trim colour and Prospector's sensor
pod vary. This keeps the vehicle recognisable in every game surface.
"""

import landnam_kit as kit

T = kit.TOKENS


def solid(*args, **kwargs):
    """Keep ship surfaces crisp; faceting does the visual work at sprite size."""
    kwargs.setdefault("grain", False)
    return kit.solid(*args, **kwargs)


# Sized from the smallest production use: the launchpad renders this at about
# 80x30 CSS px. Every silhouette feature below survives that downscale.
NOSE_TIP = -4.0
NOSE_BASE = -3.18
SERVICE_START = 1.75
TAIL_END = 3.12
NOZZLE_END = 4.0
R = 0.82
LAYOUT = (160, 60)
BLUEPRINT_LAYOUT = (400, 200)
ORTHO = 8.0


def _panel(name, x, z, width, height, colour, key):
    """A camera-facing hull panel, sized to remain legible when downscaled."""
    panel = kit.box(name, (width, 0.045, height), location=(x, -R * 0.94, z - height / 2), bevel=0.02)
    solid(name, panel, colour, key, outline=0.006)


def _shared_body(trim_hex, *, dorsal=False, blueprint=False):
    """Build the shared external silhouette and its readable systems."""
    body_hex = T["surface_2"] if blueprint else T["hull"]
    dark_hex = T["surface"] if blueprint else T["hull_dark"]
    line_hex = T["cyan"] if blueprint else trim_hex
    detail_hex = T["cyan_bright"] if blueprint else T["steel"]

    nose = kit.cone("nose", radius=R, depth=NOSE_BASE - NOSE_TIP,
                    location=(NOSE_TIP, 0, 0), rotation=(0, 1.5708, 0), radius2=0.0)
    solid("nose", nose, dark_hex, "rocket_nose", outline=0.016)

    tube = kit.cylinder("pressure_hull", R, SERVICE_START - NOSE_BASE,
                        location=(NOSE_BASE, 0, 0), rotation=(0, 1.5708, 0), verts=10)
    solid("pressure_hull", tube, body_hex, "rocket_hull", outline=0.018)

    # Broad blocky cockpit canopy: a persistent identity cue in every view.
    canopy_base = kit.box("canopy_mount", (1.05, 0.58, R * 0.38),
                          location=(-2.48, 0, R - 0.04), bevel=0.05)
    solid("canopy_mount", canopy_base, dark_hex, "rocket_canopy_mount", outline=0.01)
    canopy = kit.box("canopy", (0.78, 0.42, R * 0.30),
                     location=(-2.48, 0, R + R * 0.30), bevel=0.07)
    solid("canopy", canopy, line_hex, "rocket_canopy", outline=0.012)

    # Cargo and reactor/service panels give the tube a designed purpose without
    # adding details that disappear at launchpad scale.
    _panel("cargo_panel", -1.18, 0.34, 1.32, 0.48, detail_hex, "rocket_cargo_panel")
    _panel("reactor_panel", 0.35, 0.34, 0.72, 0.48, dark_hex, "rocket_reactor_panel")
    for x in (-0.52, 0.02, 0.56):
        _panel("hull_seam", x, -0.10, 0.035, 0.62, line_hex, "rocket_hull_seam")

    service = kit.cone("service_section", radius=R, depth=TAIL_END - SERVICE_START,
                       location=(SERVICE_START, 0, 0), rotation=(0, 1.5708, 0), radius2=R * 0.52)
    solid("service_section", service, dark_hex, "rocket_service", outline=0.016)

    # External launch hardware is deliberately part of the primary silhouette,
    # not a cinematic-only prop. The same paired booster set and stage collar
    # therefore appear in the hangar, blueprint, launchpad, mining, and menus.
    stage_collar = kit.cylinder("stage_collar", R * 1.05, 0.16,
                                location=(1.12, 0, 0), rotation=(0, 1.5708, 0), verts=10)
    solid("stage_collar", stage_collar, line_hex, "rocket_stage_collar", outline=0.012)
    for sign in (-1, 1):
        booster = kit.cylinder("side_booster", R * 0.31, 2.15,
                               location=(0.58, 0, sign * (R * 1.20)), rotation=(0, 1.5708, 0), verts=8)
        solid("side_booster", booster, body_hex, "rocket_side_booster", outline=0.014)
        booster_nose = kit.cone("side_booster_nose", R * 0.31, 0.48,
                                location=(-0.74, 0, sign * (R * 1.20)), rotation=(0, 1.5708, 0), radius2=0.0, verts=8)
        solid("side_booster_nose", booster_nose, dark_hex, "rocket_side_booster_nose", outline=0.012)
        booster_nozzle = kit.cone("side_booster_nozzle", R * 0.22, 0.40,
                                  location=(1.84, 0, sign * (R * 1.20)), rotation=(0, 1.5708, 0), radius2=R * 0.34, verts=8)
        solid("side_booster_nozzle", booster_nozzle, T["cyan_bright"], "rocket_side_booster_nozzle", outline=0.01)

    # Large, low fins are a persistent silhouette cue in every view.
    for sign in (-1, 1):
        fin = kit.box("tail_fin", (0.96, 0.11, R * 1.18),
                      location=(1.98, 0, sign * (R - 0.05)),
                      rotation=(0 if sign > 0 else 3.14159, 0, 0), bevel=0.045)
        solid("tail_fin", fin, detail_hex, "rocket_tail_fin", outline=0.014)
        edge = kit.box("tail_fin_edge", (0.94, 0.05, 0.08),
                       location=(1.98, 0, sign * (R * 2.15)))
        solid("tail_fin_edge", edge, line_hex, "rocket_tail_edge", outline=0)

    nozzle = kit.cone("engine_nozzle", radius=R * 0.46, depth=NOZZLE_END - TAIL_END,
                      location=(TAIL_END, 0, 0), rotation=(0, 1.5708, 0),
                      radius2=R * 0.70)
    solid("engine_nozzle", nozzle, T["cyan_bright"], "rocket_nozzle", outline=0.014)
    scorch = kit.cylinder("engine_ring", R * 0.73, 0.10,
                          location=(NOZZLE_END - 0.04, 0, 0),
                          rotation=(0, 1.5708, 0), verts=10)
    solid("engine_ring", scorch, T["rust"], "rocket_engine_ring", outline=0)

    # This band is the identity cue that remains visible in menu thumbnails.
    band = kit.cylinder("service_band", R * 1.04, 0.34,
                        location=(-0.72 if blueprint else -1.02, 0, 0),
                        rotation=(0, 1.5708, 0), verts=10)
    solid("service_band", band, line_hex, "rocket_service_band", outline=0.014)

    if dorsal:
        pod_base = kit.box("sensor_mount", (0.86, 0.58, R * 0.38),
                           location=(0.30, 0, R - 0.04), bevel=0.05)
        solid("sensor_mount", pod_base, dark_hex, "rocket_sensor_mount", outline=0.01)
        pod = kit.cylinder("sensor_pod", R * 0.40, 0.72,
                           location=(0.72, 0, R + R * 0.30),
                           rotation=(0, 1.5708, 0), verts=8)
        solid("sensor_pod", pod, detail_hex, "rocket_sensor_pod", outline=0.01)
        lens = kit.cone("sensor_lens", R * 0.40, 0.18,
                        location=(1.16, 0, R + R * 0.30),
                        rotation=(0, 1.5708, 0), verts=8)
        solid("sensor_lens", lens, T["amber"], "rocket_sensor_lens", outline=0.01)


def _blueprint_overlay(trim_hex):
    """Add a readable inspection cutaway over the shared body silhouette.

    This is still a 2D technical view, but it must communicate a built vehicle
    at menu size. A black empty rectangle with a few divider lines makes the
    rocket read as a SaaS diagram instead of a staged machine, so each bay gets
    a substantial backplate and one unmistakable system silhouette.
    """
    inset = kit.box("blueprint_bay", (4.75, 0.055, 1.20),
                    location=(-0.48, -R * 0.99, -0.60), bevel=0.025)
    solid("blueprint_bay", inset, T["surface"], "blueprint_bay", outline=0.012)

    # Three filled technical compartments: cockpit, mineral/storage + payload,
    # and engine. Their mass and contrast remain legible at a 160px menu render
    # while their shared axes retain the blueprint read.
    bays = (
        ("cockpit_bay", -2.18, 1.12, T["hull_dark"]),
        ("storage_bay", -0.55, 1.72, T["surface_2"]),
        ("engine_bay", 1.22, 1.06, T["hull_dark"]),
    )
    for name, x, width, colour in bays:
        bay = kit.box(name, (width, 0.035, 0.82),
                      location=(x, -R * 1.045, -0.61), bevel=0.02)
        solid(name, bay, colour, name, outline=0.008)

    cockpit_console = kit.box("blueprint_cockpit_console", (0.62, 0.035, 0.22),
                              location=(-2.20, -R * 1.07, -0.36), bevel=0.025)
    solid("blueprint_cockpit_console", cockpit_console, T["cyan_bright"], "blueprint_cockpit_console", outline=0.006)
    cockpit_glass = kit.box("blueprint_cockpit_glass", (0.42, 0.035, 0.22),
                            location=(-2.34, -R * 1.075, -0.78), bevel=0.025)
    solid("blueprint_cockpit_glass", cockpit_glass, trim_hex, "blueprint_cockpit_glass", outline=0.005)

    # Mineral canisters make storage visually distinct from an empty box; the
    # amber payload block is the same semantic accent used in the exterior pod.
    for x in (-0.96, -0.56, -0.16):
        canister = kit.box("blueprint_mineral_canister", (0.24, 0.035, 0.42),
                           location=(x, -R * 1.07, -0.60), bevel=0.025)
        solid("blueprint_mineral_canister", canister, T["steel"], "blueprint_mineral_canister", outline=0.005)
    payload = kit.box("blueprint_payload", (0.42, 0.035, 0.56),
                      location=(0.45, -R * 1.07, -0.58), bevel=0.035)
    solid("blueprint_payload", payload, T["amber"], "blueprint_payload", outline=0.007)

    reactor = kit.cylinder("blueprint_reactor", R * 0.28, 0.34,
                           location=(1.10, -R * 1.075, -0.60), rotation=(1.5708, 0, 0), verts=8)
    solid("blueprint_reactor", reactor, T["cyan"], "blueprint_reactor", outline=0.008)
    nozzle_block = kit.box("blueprint_engine_block", (0.30, 0.035, 0.58),
                           location=(1.55, -R * 1.07, -0.60), bevel=0.02)
    solid("blueprint_engine_block", nozzle_block, T["rust"], "blueprint_engine_block", outline=0.006)

    # 3x1 starter layout: cockpit / storage + mining payload / engine.
    for x in (-1.70, -0.05, 1.18):
        wall = kit.box("blueprint_wall", (0.035, 0.035, 1.05),
                       location=(x, -R * 1.03, -0.50))
        solid("blueprint_wall", wall, trim_hex, "blueprint_wall", outline=0)
    for x in (-2.58, -0.80, 0.70, 1.62):
        seam = kit.box("blueprint_measure", (0.025, 0.025, 0.72),
                       location=(x, -R * 1.035, -0.34))
        solid("blueprint_measure", seam, T["cyan_bright"], "blueprint_measure", outline=0)

    centerline = kit.box("blueprint_centerline", (6.40, 0.025, 0.025),
                         location=(-0.78, -R * 1.04, -0.02))
    solid("blueprint_centerline", centerline, T["cyan"], "blueprint_centerline", outline=0)

    for x, width, colour in ((-2.62, 0.38, T["cyan"]), (-0.98, 0.72, trim_hex), (0.98, 0.44, T["rust"])):
        block = kit.box("blueprint_system", (width, 0.035, 0.28),
                        location=(x, -R * 1.055, -0.88))
        solid("blueprint_system", block, colour, "blueprint_system", outline=0)


def _rocket(trim_hex, *, dorsal=False, blueprint=False):
    _shared_body(trim_hex, dorsal=dorsal, blueprint=blueprint)
    if blueprint:
        _blueprint_overlay(trim_hex)
    return dict(
        layout=BLUEPRINT_LAYOUT if blueprint else LAYOUT,
        ortho=ORTHO,
        mode="flat",
        target=(0, 0, 0),
    )


def ship_sr1():
    return _rocket(T["cyan"])


def ship_sr2():
    return _rocket(T["amber"], dorsal=True)


def sr1_cutaway():
    return _rocket(T["cyan"], blueprint=True)


def sr2_cutaway():
    return _rocket(T["amber"], dorsal=True, blueprint=True)


BUILDS = {
    "ships/ship_sr1": ship_sr1,
    "ships/ship_sr2": ship_sr2,
    "ships/containers/sr1_cutaway": sr1_cutaway,
    "ships/containers/sr2_cutaway": sr2_cutaway,
}

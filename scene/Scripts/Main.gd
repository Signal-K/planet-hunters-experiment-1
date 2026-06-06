extends Control

const UNLOCK_POPUP_SCENE := preload("res://Scenes/UI/UnlockPopup.tscn")
const CLASSIFY_SCREEN_SCENE := preload("res://Scenes/UI/ClassifyLightcurveScreen.tscn")

const BG := Color("#0a121d")
const VOID := Color("#03060c")
const SURFACE := Color("#122236")
const SURFACE_2 := Color("#18304b")
const CYAN := Color("#3fa9ff")
const CYAN_SOFT := Color(0.247, 0.663, 1.0, 0.18)
const AMBER := Color("#f5a623")
const OK := Color("#39d36a")
const WARN := Color("#ffb347")
const CRIT := Color("#ff5a6a")
const TEXT := Color("#e6efff")
const DIM := Color("#a9b8ce")
const MUTED := Color("#5d7390")
const PAPER := Color("#efe7d3")

const HUB_CHROME_SCENE := preload("res://Scenes/UI/HubChrome.tscn")
const HUB_SCREEN_SCENE := preload("res://Scenes/UI/HubScreen.tscn")
const RADIAL_MENU_SCENE := preload("res://Scenes/UI/RadialMenu.tscn")
const TUTORIAL_COACH_SCENE := preload("res://Scenes/UI/TutorialCoach.tscn")
const BUILD_GATE_SCENE := preload("res://Scenes/UI/BuildGatePrompt.tscn")
const STRUCTURE_TILE_SCENE := preload("res://Scenes/UI/StructureTile.tscn")
const MISSION_CARD_SCENE := preload("res://Scenes/UI/MissionCard.tscn")

var tutorial: TutorialController

var screen := "hub"
var built := true
var menu_open := false
var radial_open := false
var coach_on := true
var popup := ""
var build_gate := false
var pending_structure := ""
var selected_mission := ""
var selected_target := ""
var selected_star := "SOL"
var placed_structures := {"launchpad": "center"}
var rocket := {"chassis": "hull-mk1", "propulsion": "ion-a1", "drill": "hand-drill"}
var cargo := {"iron": 0, "silicon": 0, "gold": 0, "ice": 0}
var mining_total := 0
var player := {"francs": 1240, "level": 4, "xp": 2140, "missions_done": 0, "control_built": false}

var oxanium_regular: Font
var oxanium_bold: Font
var turret_regular: Font
var earth_texture: Texture2D
var part_textures := {}
var rng := RandomNumberGenerator.new()
var stars := []

var missions := [
	{
		"id": "m-iron-foundry",
		"title": "Iron for Foundry-3",
		"contractor": "Helios Mining Co.",
		"brief": "Raw iron for the orbital foundry. Inner-system run.",
		"tag": "STARTER",
		"mineral": "iron",
		"amount": 20,
		"payout": 480,
		"xp": 120,
		"max_orbit": 5
	},
	{
		"id": "m-silicon-mass",
		"title": "Silicon Mass Order",
		"contractor": "Helios Mining Co.",
		"brief": "Large volume silicon order from any compatible body.",
		"tag": "BULK",
		"mineral": "silicon",
		"amount": 40,
		"payout": 720,
		"xp": 180,
		"max_orbit": 5
	},
	{
		"id": "m-belt-gold",
		"title": "Belt Prospect - Gold",
		"contractor": "Foundry Guild",
		"brief": "Bring back belt-grade gold and a small iron surplus.",
		"tag": "PROSPECT",
		"mineral": "gold",
		"amount": 3,
		"payout": 2200,
		"xp": 480,
		"max_orbit": 5
	}
]

var targets := [
	{"id": "mercury", "name": "Mercury", "orbit": 1, "color": Color("#a89788"), "minerals": ["silicon", "iron"], "brief": "Hot cratered crust. Silicon-rich."},
	{"id": "mars", "name": "Mars", "orbit": 4, "color": Color("#d97150"), "minerals": ["iron", "silicon"], "brief": "Iron regolith and gentle gravity."},
	{"id": "belt", "name": "Asteroid Belt", "orbit": 5, "color": Color("#c9c1a8"), "minerals": ["iron", "gold"], "brief": "Loose rubble, gold pockets, rare traces."},
	{"id": "jupiter", "name": "Jupiter", "orbit": 6, "color": Color("#d4a06a"), "minerals": ["ice"], "brief": "Upper-band ice skim. Requires later drive."}
]

var parts := {
	"chassis": [
		{"id": "hull-mk1", "name": "HULL-MK1", "stat": "CARGO 60 U", "img": "basic_hull_t1.png"},
		{"id": "hull-mk2", "name": "HULL-MK2", "stat": "CARGO 120 U", "img": "reinforced_hull_t2.png"},
		{"id": "frame-x12", "name": "FRAME-X12", "stat": "CARGO 180 U", "img": "cargo_bay_t1.png"}
	],
	"propulsion": [
		{"id": "ion-a1", "name": "ION-A1", "stat": "RANGE ORBIT 3", "img": "basic_thruster_t1.png"},
		{"id": "hydra-v", "name": "HYDRA-V", "stat": "RANGE ORBIT 5", "img": "fusion_drive_t2.png"},
		{"id": "vulcan-ix", "name": "VULCAN-IX", "stat": "RANGE ORBIT 8", "img": "ion_drive_t3.png"}
	],
	"drill": [
		{"id": "hand-drill", "name": "HAND-DRILL", "stat": "RATE T1", "img": "mining_drill_t1.png"},
		{"id": "pulse-drill", "name": "PULSE-DRILL", "stat": "RATE T2", "img": "mining_drill_t1.png"},
		{"id": "cryo-cutter", "name": "CRYO-CUTTER", "stat": "RATE T2", "img": "mining_drill_t1.png"}
	]
}

var m1_steps := {
	"hub": ["Open a Mission", "Open the radial menu, then choose MISSIONS.", "1/7"],
	"missions": ["Lock a Contract", "Pick a mining company and confirm the delivery order.", "2/7"],
	"targets": ["Choose a Destination", "Tap a highlighted body on the map.", "3/7"],
	"fab": ["Assemble the Rocket", "Starter parts are loaded. Confirm launch when checks pass.", "4/7"],
	"transit": ["Transit", "Vessel is outbound. Hold telemetry until arrival.", "5/7"],
	"mining": ["Mine the Asteroid", "Tap ore deposits to fill the order, then return.", "6/7"],
	"debrief": ["Debrief", "Sell cargo and collect the contractor bonus.", "7/7"]
}

func _ready() -> void:
	custom_minimum_size = Vector2(402, 874)
	rng.seed = 240604
	tutorial = TutorialController.new()
	coach_on = tutorial.tutorial_active
	_load_assets()
	_make_stars()
	_rebuild()

func _load_assets() -> void:
	oxanium_regular = load("res://design_system_source/fonts/Oxanium-Regular.ttf")
	oxanium_bold = load("res://design_system_source/fonts/Oxanium-Bold.ttf")
	turret_regular = load("res://design_system_source/fonts/TurretRoad-Regular.ttf")
	earth_texture = load("res://design_system_source/assets/scenes/earth-day-sm.png")
	for slot in parts.keys():
		for part in parts[slot]:
			part_textures[part.img] = load("res://design_system_source/assets/parts/%s" % part.img)

func _make_stars() -> void:
	for i in 60:
		stars.append(Vector2(rng.randf_range(12.0, 390.0), rng.randf_range(18.0, 360.0)))

func _draw() -> void:
	var size := get_rect().size
	draw_rect(Rect2(Vector2.ZERO, size), BG)
	if screen in ["targets", "galaxy", "transit", "classify"]:
		_draw_atlas_background(size)
	elif screen == "hub":
		_draw_hub_background(size)
	elif screen == "mining":
		_draw_mining_background(size)
	else:
		_draw_blueprint(size)

func _draw_blueprint(size: Vector2) -> void:
	draw_rect(Rect2(Vector2.ZERO, size), VOID)
	for x in range(0, int(size.x), 24):
		draw_line(Vector2(x, 0), Vector2(x, size.y), Color(0.247, 0.663, 1.0, 0.055), 1)
	for y in range(0, int(size.y), 24):
		draw_line(Vector2(0, y), Vector2(size.x, y), Color(0.247, 0.663, 1.0, 0.055), 1)

func _draw_atlas_background(size: Vector2) -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color("#05070b"))
	for p in stars:
		draw_circle(p, 1.0, Color(0.94, 0.90, 0.80, 0.55))
	for x in range(0, int(size.x), 40):
		draw_line(Vector2(x, 0), Vector2(x, size.y), Color(0.94, 0.90, 0.80, 0.045), 1)
	for y in range(0, int(size.y), 40):
		draw_line(Vector2(0, y), Vector2(size.x, y), Color(0.94, 0.90, 0.80, 0.045), 1)

func _draw_hub_background(size: Vector2) -> void:
	if earth_texture:
		draw_texture_rect(earth_texture, Rect2(Vector2.ZERO, size), false)
	draw_rect(Rect2(0, 0, size.x, 150), Color(0.02, 0.035, 0.07, 0.62))
	for p in stars.slice(0, 24):
		draw_circle(p, 0.9, Color(1, 1, 1, 0.45))
	draw_rect(Rect2(0, size.y - 258, size.x, 162), Color("#241b13") * Color(1, 1, 1, 0.82))
	for y in range(int(size.y - 238), int(size.y - 112), 22):
		draw_line(Vector2(0, y), Vector2(size.x, y), Color(0.9, 0.55, 0.25, 0.08), 1)

func _draw_mining_background(size: Vector2) -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color("#120f14"))
	for y in range(100, int(size.y), 34):
		draw_line(Vector2(0, y), Vector2(size.x, y + sin(float(y)) * 10.0), Color(0.9, 0.55, 0.25, 0.10), 2)
	for p in [Vector2(72, 240), Vector2(300, 280), Vector2(166, 430), Vector2(330, 548), Vector2(96, 620)]:
		draw_circle(p, 38, Color(0.247, 0.663, 1.0, 0.06))
		draw_circle(p, 7, CYAN)

func _rebuild() -> void:
	for child in get_children():
		child.queue_free()
	queue_redraw()
	match screen:
		"build": _screen_build()
		"place": _screen_place()
		"hub": _screen_hub()
		"missions": _screen_missions()
		"targets": _screen_targets()
		"fab": _screen_fab()
		"transit": _screen_transit()
		"mining": _screen_mining()
		"debrief": _screen_debrief()
		"galaxy": _screen_galaxy()
		"classify": _screen_classify()
	if coach_on and tutorial != null and tutorial.tutorial_active:
		var step := tutorial.current_step(screen)
		if not step.is_empty():
			_add_coach()
	if menu_open:
		_add_game_menu()
	if popup != "":
		_add_unlock_popup()
	if build_gate:
		_add_build_gate()

func _screen_build() -> void:
	_header("EARTH BASE - SETUP", "Build")
	_label("AVAILABLE STRUCTURES", Vector2(14, 128), 10, MUTED, true)
	var y := 150
	_structure_card("Launchpad", "Assemble rockets and launch mining missions.", "FREE - STARTER", y, not placed_structures.has("launchpad"), Callable(self, "_choose_structure").bind("launchpad"))
	_structure_card("Control Station", "Unlocks the contractor job board.", "M1 - 500 F", y + 96, player.missions_done >= 1 and placed_structures.has("launchpad") and not placed_structures.has("control"), Callable(self, "_choose_structure").bind("control"))
	_structure_card("Satellite Station", "Scan TESS data, classify planet candidates.", "L5 - SCIENCE", y + 192, placed_structures.has("control") and not placed_structures.has("satellite"), Callable(self, "_choose_structure").bind("satellite"))
	_structure_card("Marketplace", "Sell cargo at fluctuating live prices.", "LOCKED - L5", y + 288, false, Callable())
	_button("BACK TO BASE", Rect2(14, 708, 162, 50), Callable(self, "_go_screen").bind("hub"), Color("#081120"), CYAN, 13)
	_button("PLACE CONTROL", Rect2(194, 708, 194, 50), Callable(self, "_choose_structure").bind("control"), AMBER if player.missions_done >= 1 and not placed_structures.has("control") else Color("#31445c"), Color("#081120"), 13)

func _choose_structure(kind: String) -> void:
	if kind == "launchpad" and placed_structures.has("launchpad"):
		return
	if kind == "control" and (player.missions_done < 1 or not placed_structures.has("launchpad") or placed_structures.has("control")):
		return
	if kind == "satellite" and (not placed_structures.has("control") or placed_structures.has("satellite")):
		return
	pending_structure = kind
	screen = "place"
	_rebuild()

func _screen_place() -> void:
	_header("EARTH BASE - PLACEMENT", "Place %s" % _structure_title(pending_structure))
	_label("AVAILABLE PLOTS", Vector2(14, 104), 10, CYAN, true)
	_label("Select any open surface plot. Structures stay where the operator places them.", Vector2(14, 126), 13, DIM)
	_panel(Rect2(18, 190, 366, 510), Color(0.02, 0.04, 0.07, 0.42), CYAN_SOFT)
	var plots := [
		{"id": "left", "rect": Rect2(34, 472, 100, 108), "label": "PLOT A"},
		{"id": "center", "rect": Rect2(151, 444, 100, 128), "label": "PLOT B"},
		{"id": "right", "rect": Rect2(268, 472, 100, 108), "label": "PLOT C"}
	]
	for plot in plots:
		var occupied := _plot_occupied(plot.id)
		var fill := Color(0.03, 0.07, 0.12, 0.82) if not occupied else Color(0.08, 0.09, 0.10, 0.72)
		var border := AMBER if not occupied else MUTED
		_button("%s\n%s" % [plot.label, "OPEN" if not occupied else "OCCUPIED"], plot.rect, Callable(self, "_place_structure").bind(plot.id) if not occupied else Callable(), fill, border, 11)
		draw_plot_marker(plot.rect, not occupied)
	_button("BACK", Rect2(24, 724, 110, 42), Callable(self, "_go_screen").bind("build"), Color("#081120"), CYAN, 11)
	_button("AUTO PLACE", Rect2(158, 724, 220, 42), Callable(self, "_place_first_open"), AMBER, Color("#081120"), 13)

func draw_plot_marker(rect: Rect2, available: bool) -> void:
	var marker := PlotMarker.new()
	marker.position = rect.position
	marker.size = rect.size
	marker.available = available
	add_child(marker)

func _plot_occupied(plot_id: String) -> bool:
	for value in placed_structures.values():
		if str(value) == plot_id:
			return true
	return false

func _place_first_open() -> void:
	for plot_id in ["center", "left", "right"]:
		if not _plot_occupied(plot_id):
			_place_structure(plot_id)
			return

func _place_structure(plot_id: String) -> void:
	if pending_structure == "":
		pending_structure = "launchpad"
	if _plot_occupied(plot_id):
		return
	if pending_structure == "control" and not placed_structures.has("control"):
		player.francs = max(0, int(player.francs) - 500)
		player.control_built = true
	placed_structures[pending_structure] = plot_id
	built = placed_structures.has("launchpad")
	if pending_structure == "launchpad":
		tutorial.mark_complete(0)  # "Build a Launchpad" step
	pending_structure = ""
	screen = "hub"
	_rebuild()

func _go_hub() -> void:
	built = true
	if not placed_structures.has("launchpad"):
		placed_structures["launchpad"] = "center"
	screen = "hub"
	_rebuild()

func _screen_hub() -> void:
	var hub := HUB_SCREEN_SCENE.instantiate()
	add_child(hub)
	hub.set_state({
		"chrome": {
			"visible": true,
			"show_progress": false,
			"eyebrow": "EARTH BASE - LV %d" % player.level,
			"title": "Earth Base",
			"francs": player.francs,
			"jobs": player.missions_done,
			"show_jobs": false,
			"objective": "OBJECTIVE",
			"step_title": m1_steps.get("hub", ["Open a Mission", "Open the radial menu, then choose MISSIONS.", "1/7"])[0],
			"step_body": m1_steps.get("hub", ["Open a Mission", "Open the radial menu, then choose MISSIONS.", "1/7"])[1],
			"step_count": m1_steps.get("hub", ["Open a Mission", "Open the radial menu, then choose MISSIONS.", "1/7"])[2],
			"action_text": "BUILD CONTROL" if player.missions_done == 1 and not player.control_built else "OPEN MISSIONS",
			"action_enabled": true,
			"hint": ""
		},
		"radial_open": radial_open,
		"allow_build": player.missions_done >= 1 and placed_structures.has("launchpad"),
		"placed_structures": placed_structures,
		"show_hint": true
	})
	hub.action_requested.connect(_handle_hub_action)
	hub.menu_requested.connect(_open_menu)
	hub.progress_requested.connect(_progress_action)

func _progress_card() -> void:
	var title := "Next Mission Available"
	var body := "Starter contract is ready for launchpad assignment."
	var cta := "OPEN LAUNCHPAD"
	if player.missions_done == 1 and not player.control_built:
		title = "Build Control Station"
		body = "M2 contractor access requires the Control Station."
		cta = "BUILD CONTROL"
	_panel(Rect2(14, 104, 374, 86), SURFACE, CYAN_SOFT)
	_label("OBJECTIVE", Vector2(30, 120), 9, CYAN, true)
	_label(title, Vector2(30, 138), 18, TEXT, false, oxanium_bold)
	_label(body, Vector2(30, 162), 11, DIM)
	_button(cta, Rect2(250, 136, 118, 30), Callable(self, "_progress_action"), AMBER, Color("#081120"), 10)

func _progress_action() -> void:
	if player.missions_done == 1 and not player.control_built:
		build_gate = true
	else:
		screen = "missions"
	_rebuild()

func _go_missions() -> void:
	screen = "missions"
	_rebuild()

func _go_classify() -> void:
	screen = "classify"
	_rebuild()

func _screen_missions() -> void:
	_top_back("MISSION BOARD", "Contractors", Callable(self, "_go_screen").bind("hub"))
	var y := 128
	for mission in missions:
		_add_mission_card(mission, y)
		y += 134
	_bottom_nav()

func _add_mission_card(mission: Dictionary, y: int) -> void:
	var card := MISSION_CARD_SCENE.instantiate()
	card.position = Vector2(14, y)
	card.size = Vector2(374, 118)
	add_child(card)
	card.set_state({
		"id": mission.id,
		"title": mission.title,
		"company": mission.contractor,
		"brief": mission.brief,
		"tag": mission.tag,
		"payout": mission.payout,
		"xp": mission.xp,
		"targets": 3 if mission.id == "m-iron-foundry" or mission.id == "m-silicon-mass" else 1 if mission.id == "m-belt-gold" else 2,
		"icon": load("res://design_system_source/assets/icons/nav_mission.svg"),
		"accent": AMBER if mission.tag in ["STARTER", "PROSPECT"] else CYAN,
		"active": true
	})
	card.mission_selected.connect(_pick_mission)

func _pick_mission(id: String) -> void:
	selected_mission = id
	tutorial.mark_complete(2)  # "Lock a Contract" step
	screen = "targets"
	_rebuild()

func _screen_targets() -> void:
	_top_back("SOLAR SYSTEM STRATEGIC ATLAS", "Target", Callable(self, "_go_screen").bind("missions"), true)
	var center := Vector2(201, 380)
	var solar := SolarMapLayer.new()
	solar.position = Vector2(0, 118)
	solar.size = Vector2(402, 540)
	solar.center = center - solar.position
	add_child(solar)
	_button("SOL", Rect2(center.x - 24, center.y - 24, 48, 48), Callable(), AMBER, Color("#081120"), 11)
	var positions := {"mercury": Vector2(240, 334), "mars": Vector2(108, 414), "belt": Vector2(302, 500), "jupiter": Vector2(72, 250)}
	for t in targets:
		var pos: Vector2 = positions[t.id]
		var can_pick := _mission_allows(t)
		_button(t.name.to_upper(), Rect2(pos.x - 42, pos.y - 18, 84, 36), Callable(self, "_pick_target").bind(t.id) if can_pick else Callable(), t.color if can_pick else Color(0.18, 0.20, 0.24), Color("#06121f"), 9)
	_telemetry("CURRENT CONTRACT", _mission().title, "COMPATIBLE TARGETS", "3 DETECTED")
	_bottom_nav()

func _mission_allows(t: Dictionary) -> bool:
	var m := _mission()
	return t.orbit <= int(m.max_orbit) and t.minerals.has(m.mineral)

func _pick_target(id: String) -> void:
	selected_target = id
	tutorial.mark_complete(3)  # "Choose a Destination" step
	if selected_target == "belt":
		rocket.propulsion = "hydra-v"
	screen = "fab"
	_rebuild()

func _screen_fab() -> void:
	_top_back("ROCKET FABRICATION", "Launchpad", Callable(self, "_go_screen").bind("targets"))
	var slots := [["chassis", "CHASSIS", 118], ["propulsion", "PROPULSION", 302], ["drill", "MINING DRILL", 486]]
	for slot in slots:
		_slot_panel(slot[0], slot[1], slot[2])
	_label("LOCATION SET ----- MISSION SET ----- ASSEMBLY COMPLETE", Vector2(20, 692), 10, OK, true)
	_label("VESSEL-X12 (HEAVY) - COMPLETE", Vector2(20, 720), 17, TEXT, false, oxanium_bold)
	_label("TOTAL MASS 140 T          POWER DRAW 12 MW", Vector2(20, 746), 11, DIM, true, turret_regular)
	_button("CONFIRM LAUNCH", Rect2(14, 790, 374, 54), Callable(self, "_launch"), AMBER, Color("#081120"), 17)
	_bottom_nav()

func _slot_panel(slot: String, title: String, y: int) -> void:
	_panel(Rect2(14, y, 374, 162), SURFACE, CYAN_SOFT)
	_label(title, Vector2(30, y + 14), 10, CYAN, true)
	var x := 28
	for part in parts[slot]:
		var selected: bool = str(rocket[slot]) == str(part["id"])
		var border: Color = AMBER if selected else CYAN_SOFT
		_panel(Rect2(x, y + 42, 108, 98), SURFACE_2 if selected else Color("#0d1a2b"), border)
		if part_textures.has(part["img"]):
			_texture(part_textures[part["img"]], Rect2(x + 34, y + 48, 40, 40))
		_label(part["name"], Vector2(x + 8, y + 92), 9, AMBER if selected else TEXT, true)
		_label(part["stat"], Vector2(x + 8, y + 112), 8, DIM, true, turret_regular)
		_invisible_button(Rect2(x, y + 42, 108, 98), Callable(self, "_select_part").bind(slot, part["id"]))
		x += 118

func _select_part(slot: String, id: String) -> void:
	rocket[slot] = id
	_rebuild()

func _launch() -> void:
	tutorial.mark_complete(5)  # "Launch" step (step 4 info card dismissed via manual_next)
	screen = "transit"
	_rebuild()

func _screen_transit() -> void:
	_top_back("TRANSIT TELEMETRY", "Outbound", Callable(self, "_go_screen").bind("hub"), true)
	_label("VESSEL-X12", Vector2(118, 250), 32, PAPER, true, oxanium_bold)
	_label("EARTH ORBIT -> %s" % _target().name.to_upper(), Vector2(82, 294), 13, DIM, true, turret_regular)
	_panel(Rect2(42, 356, 318, 130), Color(0.03, 0.05, 0.08, 0.90), Color(0.94, 0.90, 0.80, 0.24))
	_label("BURN STATUS", Vector2(66, 382), 10, PAPER, true, turret_regular)
	_label("Trajectory locked. Mining window available.", Vector2(66, 412), 15, TEXT)
	_button("ARRIVE AT TARGET", Rect2(54, 520, 294, 50), Callable(self, "_arrive"), AMBER, Color("#081120"), 15)

func _arrive() -> void:
	cargo = {"iron": 0, "silicon": 0, "gold": 0, "ice": 0}
	mining_total = 0
	screen = "mining"
	_rebuild()

func _screen_mining() -> void:
	_top_back("MINING HUD", _target().name, Callable(self, "_go_screen").bind("hub"))
	_panel(Rect2(14, 102, 374, 86), Color(0.05, 0.08, 0.11, 0.92), CYAN_SOFT)
	_label("CONTRACT ORDER", Vector2(30, 122), 10, CYAN, true)
	_label("%s  %d / %d U" % [_mission().mineral.to_upper(), cargo[_mission().mineral], _mission().amount], Vector2(30, 146), 20, TEXT, true, oxanium_bold)
	var deposits := [
		["IRON +8", "iron", Rect2(42, 236, 92, 58), Color("#d97150")],
		["SILICON +8", "silicon", Rect2(248, 280, 108, 58), Color("#b9d8ff")],
		["GOLD +1", "gold", Rect2(132, 428, 90, 58), Color("#ffd166")],
		["ICE +8", "ice", Rect2(250, 550, 88, 58), Color("#9becff")]
	]
	for d in deposits:
		_button(d[0], d[2], Callable(self, "_mine").bind(d[1]), d[3], Color("#081120"), 10)
	_button("RETURN HOME", Rect2(14, 790, 374, 54), Callable(self, "_return_home"), AMBER if mining_total > 0 else Color("#31445c"), Color("#081120"), 16)

func _mine(kind: String) -> void:
	var amount := 1 if kind == "gold" else 8
	cargo[kind] += amount
	mining_total += amount
	_rebuild()

func _return_home() -> void:
	tutorial.mark_complete(6)  # "Mine the Asteroid" step
	screen = "debrief"
	_rebuild()

func _screen_debrief() -> void:
	_top_back("MISSION DEBRIEF", "Return", Callable(self, "_go_screen").bind("hub"))
	var sale := int(cargo.iron) * 12 + int(cargo.silicon) * 8 + int(cargo.gold) * 90 + int(cargo.ice) * 14
	var total := sale + int(_mission().payout)
	_label("CARGO SOLD", Vector2(90, 180), 12, CYAN, true)
	_label("%d F" % total, Vector2(82, 214), 54, AMBER, true, oxanium_bold)
	_panel(Rect2(30, 328, 342, 220), SURFACE, CYAN_SOFT)
	_label("CONTRACT", Vector2(52, 352), 10, MUTED, true)
	_label(_mission().title, Vector2(52, 376), 20, TEXT, false, oxanium_bold)
	_label("CARGO VALUE  %d F" % sale, Vector2(52, 420), 13, DIM, true, turret_regular)
	_label("BONUS        %d F" % int(_mission().payout), Vector2(52, 448), 13, DIM, true, turret_regular)
	_label("XP           +%d" % int(_mission().xp), Vector2(52, 476), 13, DIM, true, turret_regular)
	_button("COLLECT", Rect2(14, 790, 374, 54), Callable(self, "_collect").bind(total), AMBER, Color("#081120"), 17)

func _collect(total: int) -> void:
	player.francs += total
	player.xp += int(_mission().xp)
	player.missions_done += 1
	tutorial.mark_complete(9)  # "Debrief" step
	if player.missions_done == 1:
		popup = "sr2"
		build_gate = false
	# Check free-ops unlock (after all 4 authored missions)
	if player.missions_done >= 4 and not tutorial.free_ops_unlocked:
		tutorial.free_ops_unlocked = true
		popup = "freeops"
	selected_mission = ""
	selected_target = ""
	screen = "hub"
	_rebuild()

func _screen_galaxy() -> void:
	_top_back("STELLAR_OS", "Galaxy", Callable(self, "_go_screen").bind("hub"), true)
	_label("SOLAR SYSTEM / GALAXY", Vector2(126, 94), 11, PAPER, true, turret_regular)
	var galaxy_layer := GalaxyMapLayer.new()
	galaxy_layer.position = Vector2(0, 120)
	galaxy_layer.size = Vector2(402, 560)
	add_child(galaxy_layer)
	var star_data := [
		["VEGA", "25.1 ly", Vector2(94, 190), CYAN],
		["PROCYON", "11.46 ly", Vector2(284, 228), PAPER],
		["SIRIUS", "8.60 ly", Vector2(322, 348), CYAN],
		["SOL", "0.00 ly", Vector2(201, 410), AMBER],
		["ALPHA CENTAURI", "4.37 ly", Vector2(120, 518), WARN],
		["BARNARD", "5.96 ly", Vector2(248, 592), CRIT],
		["WOLF 359", "7.86 ly", Vector2(318, 662), CRIT]
	]
	for s in star_data:
		_button(s[0], Rect2(s[2].x - 46, s[2].y - 18, 92, 36), Callable(self, "_pick_star").bind(s[0]), s[3], Color("#05070b"), 8)
	_telemetry("SYSTEM TELEMETRY", selected_star, "DIST", "0.00 LY")
	_bottom_nav()

func _pick_star(name: String) -> void:
	selected_star = name
	_rebuild()

func _screen_classify() -> void:
	var cls := CLASSIFY_SCREEN_SCENE.instantiate()
	add_child(cls)
	cls.back_requested.connect(func(): _go_screen("hub"))
	cls.classification_submitted.connect(func(_result: String): _classification_done())

func _classification_done() -> void:
	popup = "science"
	screen = "hub"
	_rebuild()

func _add_coach() -> void:
	var step := tutorial.current_step(screen)
	if step.is_empty():
		return
	var coach := TUTORIAL_COACH_SCENE.instantiate()
	add_child(coach)
	var step_idx := tutorial.step_index_of(int(step.id))
	coach.set_step(step, step_idx, tutorial.total_steps(), tutorial.M1_STEPS)
	coach.skip_requested.connect(_skip_coach)
	coach.manual_next_requested.connect(func():
		tutorial.mark_complete(int(step.id))
		_rebuild()
	)

func _skip_coach() -> void:
	tutorial.skip_all()
	coach_on = false
	_rebuild()

func _add_game_menu() -> void:
	_panel(Rect2(0, 0, 402, 874), Color(0.01, 0.015, 0.03, 0.74), Color(0, 0, 0, 0))
	_panel(Rect2(18, 120, 366, 540), SURFACE, CYAN)
	_label("PLANET HUNTERS", Vector2(42, 150), 11, CYAN, true)
	_label("Base of Operations", Vector2(42, 174), 25, TEXT, false, oxanium_bold)
	_label("STATS", Vector2(42, 238), 10, MUTED, true)
	_label("FRANCS  %d" % int(player.francs), Vector2(42, 266), 15, AMBER, true, turret_regular)
	_label("MISSIONS COMPLETE  %d" % int(player.missions_done), Vector2(42, 296), 15, DIM, true, turret_regular)
	_label("CARGO", Vector2(42, 352), 10, MUTED, true)
	_label("IRON %d   SILICON %d   GOLD %d   ICE %d" % [cargo.iron, cargo.silicon, cargo.gold, cargo.ice], Vector2(42, 380), 13, DIM, true, turret_regular)
	_button("CLOSE", Rect2(248, 584, 112, 42), Callable(self, "_close_menu"), CYAN, Color("#06121f"), 12)

func _close_menu() -> void:
	menu_open = false
	_rebuild()

func _add_unlock_popup() -> void:
	var up := UNLOCK_POPUP_SCENE.instantiate()
	add_child(up)
	up.setup(popup)
	up.closed.connect(_close_popup)

func _close_popup() -> void:
	if popup == "sr2":
		build_gate = true
	elif popup == "freeops":
		tutorial.skip_all()  # coaching ends after free-ops unlock
		coach_on = false
	popup = ""
	_rebuild()

func _add_build_gate() -> void:
	var gate := BUILD_GATE_SCENE.instantiate()
	add_child(gate)
	gate.set_state({
		"visible": true,
		"francs": int(player.francs)
	})
	gate.build_requested.connect(_build_control)
	gate.close_requested.connect(_close_build_gate)

func _build_control() -> void:
	build_gate = false
	_choose_structure("control")

func _close_build_gate() -> void:
	build_gate = false
	_rebuild()

func _default_plot_rect(plot_id: String) -> Rect2:
	match plot_id:
		"left":
			return Rect2(40, 540, 104, 92)
		"right":
			return Rect2(258, 540, 104, 92)
		_:
			return Rect2(142, 510, 118, 92)

func _structure_title(kind: String) -> String:
	match kind:
		"control":
			return "Control Station"
		"satellite":
			return "Satellite Station"
		"market":
			return "Marketplace"
		_:
			return "Launchpad"

func _bottom_nav() -> void:
	var nav := RADIAL_MENU_SCENE.instantiate()
	add_child(nav)
	nav.set_state(radial_open, player.missions_done >= 1 and placed_structures.has("launchpad"))
	nav.action_requested.connect(_handle_radial_action)

func _handle_radial_action(action: String) -> void:
	match action:
		"toggle":
			radial_open = not radial_open
			if radial_open:
				tutorial.mark_complete(1)  # "Open a Mission" step (player opened the menu)
		"base", "missions", "atlas", "build":
			radial_open = false
			match action:
				"base":
					_go_screen("hub")
				"missions":
					_go_screen("missions")
				"atlas":
					_go_screen("galaxy")
				"build":
					_go_screen("build")
		_:
			pass
	_rebuild()

func _handle_hub_action(action: String) -> void:
	match action:
		"missions":
			_go_missions()
		"classify":
			_go_classify()
		"market":
			pass
		"toggle":
			radial_open = not radial_open
			_rebuild()
		_:
			_handle_radial_action(action)

func _open_menu() -> void:
	menu_open = true
	_rebuild()

func _go_screen(id: String) -> void:
	if id == "fab" and (selected_mission == "" or selected_target == ""):
		id = "missions"
	screen = id
	radial_open = false
	_rebuild()

func _top_back(eyebrow: String, title: String, cb: Callable, atlas := false) -> void:
	_label(eyebrow, Vector2(54, 28), 9, PAPER if atlas else CYAN, true, turret_regular if atlas else oxanium_bold)
	_label(title, Vector2(54, 48), 24, PAPER if atlas else TEXT, false, oxanium_bold)
	_button("<", Rect2(14, 24, 32, 32), cb, Color("#081120"), CYAN, 16)

func _header(eyebrow: String, title: String) -> void:
	_label(eyebrow, Vector2(14, 24), 9, MUTED, true)
	_label(title, Vector2(14, 44), 25, TEXT, false, oxanium_bold)

func _structure_card(title: String, body: String, chip_text: String, y: int, active: bool, cb: Callable) -> void:
	_panel(Rect2(14, y, 374, 80), SURFACE if active else Color("#0b1524"), AMBER if active else CYAN_SOFT)
	_label(title, Vector2(92, y + 15), 16, AMBER if active else MUTED, false, oxanium_bold)
	_label(body, Vector2(92, y + 38), 11, DIM if active else MUTED)
	_chip(chip_text, Vector2(92, y + 57), OK if active else MUTED)
	_texture(part_textures.get("basic_thruster_t1.png"), Rect2(32, y + 20, 38, 38))
	if active:
		_label("OK", Vector2(354, y + 30), 14, AMBER, true, oxanium_bold)
	if cb.is_valid():
		_invisible_button(Rect2(14, y, 374, 80), cb)

func _add_structure_tile(title: String, sub: String, rect: Rect2, active: bool, accent: Color, texture: Texture2D, cb: Callable) -> void:
	var tile := STRUCTURE_TILE_SCENE.instantiate()
	tile.position = rect.position
	tile.size = rect.size
	add_child(tile)
	tile.set_state({
		"title": title,
		"subtitle": sub,
		"status": "READY" if active else "LOCKED",
		"texture": texture,
		"accent": accent,
		"active": active,
		"size": rect.size
	})
	if active and cb.is_valid():
		tile.pressed.connect(cb)

func _telemetry(a: String, b: String, c: String, d: String) -> void:
	_panel(Rect2(14, 698, 374, 80), Color(0.03, 0.04, 0.06, 0.92), Color(0.94, 0.90, 0.80, 0.20))
	_label(a, Vector2(30, 716), 9, PAPER, true, turret_regular)
	_label(b, Vector2(30, 740), 15, PAPER, true, turret_regular)
	_label(c, Vector2(220, 716), 9, MUTED, true, turret_regular)
	_label(d, Vector2(220, 740), 15, PAPER, true, turret_regular)

func _mission() -> Dictionary:
	for m in missions:
		if m.id == selected_mission:
			return m
	return missions[0]

func _target() -> Dictionary:
	for t in targets:
		if t.id == selected_target:
			return t
	return targets[1]

func _label(text: String, pos: Vector2, size: int, color: Color, caps := false, font: Font = null) -> Label:
	var label := Label.new()
	label.position = pos
	label.size = Vector2(340, 48)
	label.text = text.to_upper() if caps else text
	label.add_theme_font_override("font", font if font else oxanium_regular)
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(label)
	return label

func _chip(text: String, pos: Vector2, color: Color) -> void:
	_button(text, Rect2(pos.x, pos.y, 76 + text.length() * 3, 24), Callable(), Color(0.03, 0.07, 0.12, 0.82), color, 9)

func _panel(rect: Rect2, fill: Color, border: Color) -> Panel:
	var panel := Panel.new()
	panel.position = rect.position
	panel.size = rect.size
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(8)
	style.anti_aliasing = true
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_size = 10
	style.shadow_offset = Vector2(0, 3)
	panel.add_theme_stylebox_override("panel", style)
	add_child(panel)
	return panel

func _button(text: String, rect: Rect2, cb: Callable, fill: Color, fg: Color, font_size := 12) -> Button:
	var button := Button.new()
	button.position = rect.position
	button.size = rect.size
	button.text = text
	button.focus_mode = Control.FOCUS_ALL
	button.add_theme_font_override("font", oxanium_bold)
	button.add_theme_font_size_override("font_size", font_size)
	button.add_theme_color_override("font_color", fg)
	button.add_theme_color_override("font_hover_color", TEXT)
	button.add_theme_color_override("font_pressed_color", Color("#06121f"))
	var normal := StyleBoxFlat.new()
	normal.bg_color = fill
	normal.border_color = fg if fill.a > 0.01 else Color(0, 0, 0, 0)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(8)
	normal.anti_aliasing = true
	normal.content_margin_left = 8
	normal.content_margin_right = 8
	normal.content_margin_top = 6
	normal.content_margin_bottom = 6
	normal.shadow_color = Color(0, 0, 0, 0.22)
	normal.shadow_size = 6
	normal.shadow_offset = Vector2(0, 2)
	var hover := normal.duplicate()
	hover.bg_color = fill.lightened(0.08)
	var pressed := normal.duplicate()
	pressed.bg_color = fill.darkened(0.10)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", normal)
	if cb.is_valid():
		button.pressed.connect(cb)
	else:
		button.disabled = true
	add_child(button)
	return button

func _invisible_button(rect: Rect2, cb: Callable) -> void:
	var button := Button.new()
	button.position = rect.position
	button.size = rect.size
	button.flat = true
	button.modulate.a = 0.0
	if cb.is_valid():
		button.pressed.connect(cb)
	add_child(button)

func _texture(texture: Texture2D, rect: Rect2) -> void:
	if texture == null:
		return
	var sprite := Sprite2D.new()
	sprite.texture = texture
	sprite.position = rect.position + rect.size * 0.5
	var tex_size := texture.get_size()
	if tex_size.x > 0.0 and tex_size.y > 0.0:
		var scale_factor: float = min(rect.size.x / tex_size.x, rect.size.y / tex_size.y)
		sprite.scale = Vector2.ONE * scale_factor
	add_child(sprite)

class GraphControl:
	extends Control
	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), Color("#05070b"))
		for x in range(0, int(size.x), 32):
			draw_line(Vector2(x, 0), Vector2(x, size.y), Color(0.247, 0.663, 1.0, 0.11), 1)
		for y in range(0, int(size.y), 28):
			draw_line(Vector2(0, y), Vector2(size.x, y), Color(0.247, 0.663, 1.0, 0.11), 1)
		var pts := PackedVector2Array()
		for i in range(0, 70):
			var x := float(i) / 69.0 * size.x
			var dip := -34.0 if i > 34 and i < 42 else 0.0
			var y := size.y * 0.45 + sin(float(i) * 0.35) * 8.0 - dip
			pts.append(Vector2(x, y))
		draw_polyline(pts, Color("#3fa9ff"), 2.0)
		draw_circle(Vector2(size.x * 0.56, size.y * 0.25), 5, Color("#f5a623"))

class SolarMapLayer:
	extends Control
	var center := Vector2(201, 262)

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		for r in [48, 86, 124, 162, 202]:
			draw_arc(center, float(r), 0.0, TAU, 128, Color(0.94, 0.90, 0.80, 0.18), 1.25)
		for spoke in 8:
			var angle := float(spoke) / 8.0 * TAU
			draw_line(center, center + Vector2(cos(angle), sin(angle)) * 216.0, Color(0.94, 0.90, 0.80, 0.05), 1.0)
		draw_circle(center, 22.0, Color(0.96, 0.65, 0.14, 0.18))
		draw_circle(center, 6.0, Color("#f5a623"))

class GalaxyMapLayer:
	extends Control

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var points: Array[Vector2] = [
			Vector2(94, 70),
			Vector2(284, 108),
			Vector2(322, 228),
			Vector2(201, 290),
			Vector2(120, 398),
			Vector2(248, 472),
			Vector2(318, 542)
		]
		for link: Array in [[0, 1], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6]]:
			draw_line(points[link[0]], points[link[1]], Color(0.94, 0.90, 0.80, 0.20), 1.25)
		for p: Vector2 in points:
			draw_circle(p, 18.0, Color(0.247, 0.663, 1.0, 0.08))
			draw_circle(p, 2.5, Color("#efe7d3"))
		var sol: Vector2 = points[3]
		draw_rect(Rect2(sol - Vector2(22, 22), Vector2(44, 44)), Color("#f5a623"), false, 1.5)

class PlotMarker:
	extends Control
	var available := true

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var accent := Color("#f5a623") if available else Color("#5d7390")
		var cx := size.x * 0.5
		var y := size.y - 18.0
		draw_circle(Vector2(cx, y), size.x * 0.28, Color(accent.r, accent.g, accent.b, 0.12))
		draw_arc(Vector2(cx, y), size.x * 0.34, PI, TAU, 48, Color(accent.r, accent.g, accent.b, 0.55), 1.5)
		draw_line(Vector2(18, y), Vector2(size.x - 18, y), Color(accent.r, accent.g, accent.b, 0.55), 1.5)

class CoachAvatar:
	extends Control

	func _draw() -> void:
		draw_circle(size * 0.5, 21.0, Color(0.247, 0.663, 1.0, 0.18))
		draw_circle(size * 0.5, 19.0, Color("#0d1c30"))
		draw_arc(size * 0.5, 18.0, PI * 0.14, PI * 0.86, 36, Color("#3fa9ff"), 2.0)
		draw_rect(Rect2(12, 18, 20, 12), Color("#d9e8f7"), true)
		draw_rect(Rect2(15, 21, 14, 6), Color("#122236"), true)
		draw_line(Vector2(22, 30), Vector2(22, 37), Color("#f5a623"), 2.0)
		draw_circle(Vector2(22, 38), 3.0, Color("#f5a623"))

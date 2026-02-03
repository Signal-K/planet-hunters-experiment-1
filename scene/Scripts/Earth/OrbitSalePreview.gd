extends Node2D

const ORBIT_SCENE_BACK := "res://Scenes/Earth/mission_debrief.tscn"
const MINERAL_BASE_PRICES := {
	"Iron": 12,
	"Nickel": 24,
	"Cobalt": 36,
	"Platinum": 120,
	"Silicates": 8
}

const CONTRACTORS := [
	{
		"id": "orbital_union",
		"name": "Orbital Union",
		"min_level": 1,
		"bonus": {"Iron": 1.05, "Silicates": 1.1}
	},
	{
		"id": "cobalt_forge",
		"name": "Cobalt Forge",
		"min_level": 2,
		"bonus": {"Cobalt": 1.3, "Nickel": 1.1}
	},
	{
		"id": "platinum_line",
		"name": "Platinum Line",
		"min_level": 3,
		"bonus": {"Platinum": 1.6}
	},
	{
		"id": "atlas_supply",
		"name": "Atlas Supply",
		"min_level": 4,
		"bonus": {"Iron": 1.15, "Silicates": 1.2, "Nickel": 1.1}
	}
]

const SCRAP_REFUND_PCT := 0.20
const SALVAGE_REFUND_PCT := 0.10
const XP_AWARD_MISSION := 4

@onready var title_label: Label = $UI/Root/Panel/VBox/Title
@onready var subtitle_label: Label = $UI/Root/Panel/VBox/Subtitle
@onready var contractors_box: VBoxContainer = $UI/Root/Panel/VBox/Contractors
@onready var sell_button: Button = $UI/Root/Panel/VBox/Actions/SellButton
@onready var salvage_button: Button = $UI/Root/Panel/VBox/Actions/SalvageButton
@onready var scrap_button: Button = $UI/Root/Panel/VBox/Actions/ScrapButton
@onready var archive_button: Button = $UI/Root/Panel/VBox/Actions/ArchiveButton
@onready var back_button: Button = $UI/Root/Panel/VBox/Footer/BackButton
@onready var status_label: Label = $UI/Root/Panel/VBox/Footer/Status

var _selected_contractor := -1
var _orbit_entry := {}
var _cargo := {}

func _ready() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_title(title_label)
	panel_style.apply_body(subtitle_label)
	panel_style.apply_body(status_label)
	panel_style.apply_button(sell_button, true)
	panel_style.apply_button(salvage_button, false)
	panel_style.apply_button(scrap_button, false)
	panel_style.apply_button(archive_button, false)
	panel_style.apply_button(back_button, false)

	_load_orbit_entry()
	_build_contractors()
	_update_subtitle()

	sell_button.pressed.connect(_sell_minerals)
	salvage_button.pressed.connect(func(): _salvage_ship(SALVAGE_REFUND_PCT))
	scrap_button.pressed.connect(func(): _salvage_ship(SCRAP_REFUND_PCT))
	archive_button.pressed.connect(_archive_ship)
	back_button.pressed.connect(_back_to_missions)

func _load_orbit_entry() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var orbiting = rm.get_orbiting_rockets()
	if orbiting.is_empty():
		_orbit_entry = {}
		return
	_orbit_entry = orbiting[0]
	var target_id = str(_orbit_entry.get("target_id", ""))
	var inv = preload("res://Scripts/Utils/MiningInventory.gd")
	if inv and target_id != "":
		var state = inv.load_state()
		var entry = state.get("targets", {}).get(target_id, {})
		_cargo = entry.get("collected", {})

func _build_contractors() -> void:
	for c in contractors_box.get_children():
		c.queue_free()
	var app = _get_app_controller()
	var level = 1
	if app:
		level = int(app.get_experience_level())
	for idx in range(CONTRACTORS.size()):
		var c = CONTRACTORS[idx]
		var row = HBoxContainer.new()
		row.custom_minimum_size = Vector2(0, 44)
		var label = Label.new()
		label.text = "%s (Lvl %s)" % [c["name"], str(c["min_level"])]
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)
		var btn = Button.new()
		btn.text = "Select"
		btn.disabled = level < int(c["min_level"])
		btn.pressed.connect(func(): _select_contractor(idx))
		row.add_child(btn)
		contractors_box.add_child(row)

func _select_contractor(idx: int) -> void:
	_selected_contractor = idx
	status_label.text = "Selected contractor: %s" % CONTRACTORS[idx]["name"]

func _update_subtitle() -> void:
	var rocket_id = str(_orbit_entry.get("rocket_id", ""))
	var label = str(_orbit_entry.get("label", ""))
	if label == "":
		label = "Unknown Target"
	subtitle_label.text = "Rocket %s in Earth orbit (return from %s)" % [rocket_id, label]

func _sell_minerals() -> void:
	if _selected_contractor < 0:
		status_label.text = "Select a contractor to proceed."
		return
	if _cargo.is_empty():
		status_label.text = "No cargo available."
		return
	var contractor = CONTRACTORS[_selected_contractor]
	var payout := 0
	for key in _cargo.keys():
		var amount = int(_cargo.get(key, 0))
		var base = int(MINERAL_BASE_PRICES.get(key, 5))
		var bonus = float(contractor["bonus"].get(key, 1.0))
		payout += int(round(amount * base * bonus))
	var app = _get_app_controller()
	if app:
		app.add_franc_balance(payout, "orbit_sale")
		app.add_experience(XP_AWARD_MISSION, "mission")
	_clear_cargo()
	status_label.text = "Sale complete. Credited %s F." % str(payout)

func _salvage_ship(refund_pct: float) -> void:
	var rocket_id = str(_orbit_entry.get("rocket_id", ""))
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_destroyed(rocket_id)
		rm.remove_orbiting_rocket(rocket_id)
	var refund = int(round(_rocket_cost(rocket_id) * refund_pct))
	var app = _get_app_controller()
	if app:
		app.add_franc_balance(refund, "salvage")
	var inv = preload("res://Scripts/Utils/EarthInventory.gd")
	if inv:
		inv.add_materials(_cargo)
	status_label.text = "Ship salvaged. Refund %s F." % str(refund)

func _archive_ship() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.remove_orbiting_rocket(str(_orbit_entry.get("rocket_id", "")))
	status_label.text = "Ship archived."

func _clear_cargo() -> void:
	var target_id = str(_orbit_entry.get("target_id", ""))
	if target_id == "":
		return
	var inv = preload("res://Scripts/Utils/MiningInventory.gd")
	if not inv:
		return
	var data = inv.load_state()
	var targets = data.get("targets", {})
	if targets.has(target_id):
		targets.erase(target_id)
		data["targets"] = targets
		inv.save_state(data)

func _rocket_cost(rocket_id: String) -> int:
	var rtype = rocket_id
	if rocket_id.find("-") != -1:
		rtype = rocket_id.split("-")[0]
	var costs = {
		"starterrocket1": 1000000000,
		"starterrocket2": 2000000000
	}
	return int(costs.get(rtype, 1000000000))

func _back_to_missions() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(ORBIT_SCENE_BACK)
	else:
		tree.change_scene_to_file(ORBIT_SCENE_BACK)

func _get_app_controller() -> Node:
	return get_node_or_null("/root/AppController")

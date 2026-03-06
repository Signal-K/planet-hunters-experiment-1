extends Node2D

const ORBIT_SCENE_BACK := "res://Scenes/Earth/mission_debrief.tscn"
const SCRAP_REFUND_PCT := 0.20
const SALVAGE_REFUND_PCT := 0.10
const XP_AWARD_MISSION := 4
const ORBIT_SALE_MULTIPLIER := 0.8
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const NavigationMixin = preload("res://Scripts/Utils/NavigationMixin.gd")
const LabelActionRowScene = preload("res://Scenes/UI/Templates/LabelActionRow.tscn")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")
const EarthInventory = preload("res://Scripts/Utils/EarthInventory.gd")

@onready var title_label: Label = $UI/Root/Panel/VBox/Title
@onready var subtitle_label: Label = $UI/Root/Panel/VBox/Subtitle
@onready var subcontractors_box: VBoxContainer = $UI/Root/Panel/VBox/Subcontractors
@onready var sell_button: Button = $UI/Root/Panel/VBox/Actions/SellButton
@onready var salvage_button: Button = $UI/Root/Panel/VBox/Actions/SalvageButton
@onready var scrap_button: Button = $UI/Root/Panel/VBox/Actions/ScrapButton
@onready var archive_button: Button = $UI/Root/Panel/VBox/Actions/ArchiveButton
@onready var back_button: Button = $UI/Root/Panel/VBox/Footer/BackButton
@onready var status_label: Label = $UI/Root/Panel/VBox/Footer/Status

var _selected_subcontractor := -1
var _orbit_entry := {}
var _cargo := {}
var _subcontractors := []

func _ready() -> void:
	var panel_style = PanelStyle
	panel_style.apply_title(title_label)
	panel_style.apply_body(subtitle_label)
	panel_style.apply_body(status_label)
	panel_style.apply_button(sell_button, true)
	panel_style.apply_button(salvage_button, false)
	panel_style.apply_button(scrap_button, false)
	panel_style.apply_button(archive_button, false)
	panel_style.apply_button(back_button, false)

	_load_orbit_entry()
	_build_subcontractors()
	_update_subtitle()

	sell_button.pressed.connect(_sell_minerals)
	salvage_button.pressed.connect(func(): _salvage_ship(SALVAGE_REFUND_PCT))
	scrap_button.pressed.connect(func(): _salvage_ship(SCRAP_REFUND_PCT))
	archive_button.pressed.connect(_archive_ship)
	back_button.pressed.connect(_back_to_missions)

func _load_orbit_entry() -> void:
	var rm = RocketsManager
	var orbiting = rm.get_orbiting_rockets()
	if orbiting.is_empty():
		_orbit_entry = {}
		return
	_orbit_entry = orbiting[0]
	var target_id = str(_orbit_entry.get("target_id", ""))
	var inv = MiningInventory
	if inv and target_id != "":
		var state = inv.load_state()
		var entry = state.get("targets", {}).get(target_id, {})
		_cargo = entry.get("collected", {})

func _build_subcontractors() -> void:
	for c in subcontractors_box.get_children():
		c.queue_free()
	var app = _get_app_controller()
	var level = 1
	if app:
		level = int(app.get_experience_level())
	var sm = SubcontractorManager
	_subcontractors = sm.get_available_for_level(level) if sm else []
	var panel_style = PanelStyle
	for idx in range(_subcontractors.size()):
		var c = _subcontractors[idx]
		var row: HBoxContainer = LabelActionRowScene.instantiate()
		row.custom_minimum_size = Vector2(0, 44)
		var label: Label = row.get_node("TextLabel")
		label.text = "%s (Lvl %s)" % [c.get("name", ""), str(c.get("min_level", 1))]
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		panel_style.apply_body(label)
		var btn: Button = row.get_node("ActionButton")
		btn.text = "Select"
		btn.disabled = level < int(c.get("min_level", 1))
		panel_style.apply_button(btn, false)
		btn.pressed.connect(func(): _select_subcontractor(idx))
		subcontractors_box.add_child(row)

func _select_subcontractor(idx: int) -> void:
	_selected_subcontractor = idx
	status_label.text = "Selected subcontractor: %s" % str(_subcontractors[idx].get("name", ""))

func _update_subtitle() -> void:
	var rocket_id = str(_orbit_entry.get("rocket_id", ""))
	var label = str(_orbit_entry.get("label", ""))
	if label == "":
		label = "Unknown Target"
	subtitle_label.text = "Rocket %s in Earth orbit (return from %s)" % [rocket_id, label]

func _sell_minerals() -> void:
	if _selected_subcontractor < 0:
		status_label.text = "Select a subcontractor to proceed."
		return
	if _cargo.is_empty():
		status_label.text = "No cargo available."
		return
	var subcontractor = _subcontractors[_selected_subcontractor]
	var pricing = MineralPricing
	var payout = pricing.total_value(_cargo, ORBIT_SALE_MULTIPLIER, subcontractor.get("bonus", {}))
	var app = _get_app_controller()
	if app:
		app.add_franc_balance(payout, "orbit_sale")
		app.add_experience(XP_AWARD_MISSION, "mission")
	var sm = SubcontractorManager
	if sm:
		sm.add_affinity(str(subcontractor.get("id", "")))
	_clear_cargo()
	status_label.text = "Sale complete. Credited %s F." % str(payout)

func _salvage_ship(refund_pct: float) -> void:
	var rocket_id = str(_orbit_entry.get("rocket_id", ""))
	var rm = RocketsManager
	if rm:
		rm.set_destroyed(rocket_id)
		rm.remove_orbiting_rocket(rocket_id)
	var refund = int(round(_rocket_cost(rocket_id) * refund_pct))
	var app = _get_app_controller()
	if app:
		app.add_franc_balance(refund, "salvage")
	var inv = EarthInventory
	if inv:
		inv.add_materials(_cargo)
	status_label.text = "Ship salvaged. Refund %s F." % str(refund)

func _archive_ship() -> void:
	var rm = RocketsManager
	if rm:
		rm.remove_orbiting_rocket(str(_orbit_entry.get("rocket_id", "")))
	status_label.text = "Ship archived."

func _clear_cargo() -> void:
	var target_id = str(_orbit_entry.get("target_id", ""))
	if target_id == "":
		return
	var inv = MiningInventory
	if not inv:
		return
	var data = inv.load_state()
	var targets = data.get("targets", {})
	if targets.has(target_id):
		targets.erase(target_id)
		data["targets"] = targets
		inv.save_state(data)

func _rocket_cost(rocket_id: String) -> int:
	return RocketSpecs.get_cost(rocket_id)

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
		NavigationMixin.go_to_scene(tree, ORBIT_SCENE_BACK)

func _get_app_controller() -> Node:
	return get_node_or_null("/root/AppController")

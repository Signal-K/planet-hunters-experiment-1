extends Node2D

const ORBIT_SCENE_BACK := "res://Scenes/Earth/mission_debrief.tscn"
const ORBIT_SALE_MULTIPLIER := 0.8
const AFFINITY_BONUS_PER_POINT := 0.005
const AFFINITY_BONUS_CAP := 0.25
const ORDER_BONUS_CAP := 0.15

const NavigationMixin = preload("res://Scripts/Utils/NavigationMixin.gd")
const LabelActionRowScene = preload("res://Scenes/UI/Templates/LabelActionRow.tscn")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const MiningInventory = preload("res://Scripts/Utils/MiningInventory.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")

@onready var title_label: Label = $UI/Root/Panel/VBox/Title
@onready var subtitle_label: Label = $UI/Root/Panel/VBox/Subtitle
@onready var subcontractors_box: VBoxContainer = $UI/Root/Panel/VBox/Subcontractors
@onready var sell_button: Button = $UI/Root/Panel/VBox/Actions/SellButton
@onready var salvage_button: Button = $UI/Root/Panel/VBox/Actions/SalvageButton
@onready var scrap_button: Button = $UI/Root/Panel/VBox/Actions/ScrapButton
@onready var archive_button: Button = $UI/Root/Panel/VBox/Actions/ArchiveButton
@onready var back_button: Button = $UI/Root/Panel/VBox/Footer/BackButton
@onready var status_label: Label = $UI/Root/Panel/VBox/Footer/Status

var _orbit_entry := {}
var _cargo := {}
var _subcontractors: Array = []
var _selected_subcontractor: int = -1
var _requested_minerals: Dictionary = {}

func _ready() -> void:
	_apply_style()
	_load_orbit_entry()
	_build_subcontractors()
	_update_header()
	sell_button.pressed.connect(_sell_minerals)
	salvage_button.pressed.connect(func(): _ship_action("salvage"))
	scrap_button.pressed.connect(func(): _ship_action("scrap"))
	archive_button.pressed.connect(func(): _ship_action("archive"))
	back_button.pressed.connect(_back_to_missions)

func _apply_style() -> void:
	PanelStyle.apply_title(title_label)
	PanelStyle.apply_body(subtitle_label)
	PanelStyle.apply_body(status_label)
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_button(sell_button, true)
	PanelStyle.apply_button(salvage_button, false)
	PanelStyle.apply_button(scrap_button, false)
	PanelStyle.apply_button(archive_button, false)
	PanelStyle.apply_button(back_button, false)

func _load_orbit_entry() -> void:
	var orbiting = RocketsManager.get_orbiting_rockets()
	if orbiting.is_empty():
		return
	_orbit_entry = orbiting[0]
	var target_id = str(_orbit_entry.get("target_id", ""))
	if target_id != "":
		var state = MiningInventory.load_state()
		var entry = state.get("targets", {}).get(target_id, {})
		var collected = entry.get("collected", {})
		if typeof(collected) == TYPE_DICTIONARY:
			_cargo = collected.duplicate(true)
	var offer = RocketsManager.get_trip_contract_offer()
	if typeof(offer) == TYPE_DICTIONARY:
		_requested_minerals = offer.get("requested_minerals", {}).duplicate(true)

func _build_subcontractors() -> void:
	for c in subcontractors_box.get_children():
		c.queue_free()
	_subcontractors = RocketsManager.get_trip_contractors()
	var selected = RocketsManager.get_trip_selected_contractor()
	var selected_id = str(selected.get("id", ""))
	for idx in range(_subcontractors.size()):
		var c: Dictionary = _subcontractors[idx]
		var row: HBoxContainer = LabelActionRowScene.instantiate()
		var label: Label = row.get_node("TextLabel")
		var btn: Button = row.get_node("ActionButton")
		var cid = str(c.get("id", ""))
		var effect = str(c.get("effect", ""))
		var affinity = SubcontractorManager.get_affinity(cid)
		label.text = "%s • %s • affinity %d" % [
			str(c.get("name", cid)),
			"payout bonus" if effect == "payout_bonus" else "build discount",
			affinity
		]
		PanelStyle.apply_body(label)
		btn.text = "Selected" if cid == selected_id else "Select"
		btn.disabled = cid == selected_id
		PanelStyle.apply_button(btn, false)
		btn.pressed.connect(func(): _select_subcontractor(idx))
		subcontractors_box.add_child(row)
		if cid == selected_id:
			_selected_subcontractor = idx
	if _selected_subcontractor == -1 and not _subcontractors.is_empty():
		_selected_subcontractor = 0

func _select_subcontractor(idx: int) -> void:
	if idx < 0 or idx >= _subcontractors.size():
		return
	var cid = str(_subcontractors[idx].get("id", ""))
	if RocketsManager.select_trip_contractor(cid):
		_selected_subcontractor = idx
		_build_subcontractors()
		_update_header()

func _update_header() -> void:
	var rocket_id = str(_orbit_entry.get("rocket_id", ""))
	var label = str(_orbit_entry.get("label", "Unknown Target"))
	subtitle_label.text = "Rocket %s • %s" % [rocket_id, label]
	var payout = _preview_payout()
	status_label.text = "Contract preview payout: %d F" % payout

func _preview_payout() -> int:
	if _selected_subcontractor < 0 or _selected_subcontractor >= _subcontractors.size():
		return 0
	var contractor = _subcontractors[_selected_subcontractor]
	var cid = str(contractor.get("id", ""))
	var base = MineralPricing.total_value(_cargo, ORBIT_SALE_MULTIPLIER, {})
	var with_contractor = RocketsManager.apply_trip_payout_terms(base, cid)
	var ratio = _order_ratio()
	var with_order = int(round(float(with_contractor) * (1.0 + ORDER_BONUS_CAP * ratio)))
	var affinity = SubcontractorManager.get_affinity(cid)
	var affinity_mult = 1.0 + min(float(affinity) * AFFINITY_BONUS_PER_POINT, AFFINITY_BONUS_CAP)
	return int(round(float(with_order) * affinity_mult))

func _order_ratio() -> float:
	if _requested_minerals.is_empty():
		return 1.0
	var req_total := 0
	var match_total := 0
	for k in _requested_minerals.keys():
		var req = max(int(_requested_minerals.get(k, 0)), 0)
		if req <= 0:
			continue
		req_total += req
		match_total += min(max(int(_cargo.get(str(k), 0)), 0), req)
	if req_total <= 0:
		return 1.0
	return clamp(float(match_total) / float(req_total), 0.0, 1.0)

func _sell_minerals() -> void:
	if _selected_subcontractor < 0 or _selected_subcontractor >= _subcontractors.size():
		status_label.text = "Select a contractor first."
		return
	if _cargo.is_empty():
		status_label.text = "No cargo available."
		return
	var contractor = _subcontractors[_selected_subcontractor]
	var cid = str(contractor.get("id", ""))
	var payout = _preview_payout()
	var app = AppControllerHelper.get_instance()
	if app:
		app.add_franc_balance(payout, "orbit_sale")
		app.add_experience(1, "mission_completion")
	SubcontractorManager.add_affinity(cid, 1)
	status_label.text = "Sold cargo with %s for %d F (order + affinity applied)." % [str(contractor.get("name", cid)), payout]

func _ship_action(mode: String) -> void:
	var rocket_id = str(_orbit_entry.get("rocket_id", ""))
	if rocket_id == "":
		return
	if mode == "scrap" or mode == "salvage":
		RocketsManager.set_destroyed(rocket_id, mode)
	else:
		RocketsManager.remove_orbiting_rocket(rocket_id)
	status_label.text = "Ship action applied: %s." % mode

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
